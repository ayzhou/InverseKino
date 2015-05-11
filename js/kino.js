var container, stats;
var camera, controls, scene, renderer;
var objects = [],
    plane;
var arms = [];
var angles = [];
var radiuses = [];
var cylinders = [];

var target;

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2(),
    offset = new THREE.Vector3(),
    INTERSECTED, SELECTED;

init();
animate();

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 20;

    controls = new THREE.TrackballControls(camera);
    controls.rotateSpeed = 0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

    scene = new THREE.Scene();

    scene.add(new THREE.AmbientLight(0x505050));

    var light = new THREE.SpotLight(0xffffff, 1.5);
    light.position.set(0, 500, 2000);
    light.castShadow = true;

    light.shadowCameraNear = 200;
    light.shadowCameraFar = camera.far;
    light.shadowCameraFov = 50;

    light.shadowBias = -0.00022;
    light.shadowDarkness = 0.5;

    light.shadowMapWidth = 2048;
    light.shadowMapHeight = 2048;

    scene.add(light);

    //add arms
    var joints = [];
    var material = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });
    var geometry = new THREE.Geometry();
    var pivot = new THREE.Vector3(0, 0, 0);
    var elbow = new THREE.Vector3(2, 3, 0);
    var elbow1 = new THREE.Vector3(5, 4, 0);
    var elbow2 = new THREE.Vector3(6, 7, 0);
    var hand = new THREE.Vector3(10, 8, 0);

    geometry.vertices.push(pivot);
    geometry.vertices.push(elbow);
    geometry.vertices.push(elbow1);
    geometry.vertices.push(elbow2);
    geometry.vertices.push(hand);
    var line = new THREE.Line(geometry, material);
    //console.log(line);

    arms.push(line);

    //calc angles

    for (var i = 0; i < arms.length; i++) {
      angles.push(initAngles(i));
    }

    //init radiuses
    for (var i = 0; i < arms.length; i++) {
        radiuses.push(calcRadiuses(i));
    }

    //render cylinders
    for (var i = 0; i < arms.length; i++) {
        var joints = arms[i].geometry.vertices;
        var jointC = [];
        for (var j = 1; j < joints.length; j++) {
            var cylinder = cylinderMesh(joints[j-1], joints[j], arms[i].material);
            jointC.push(cylinder);
            scene.add(cylinder);
        }
        cylinders.push(jointC);
    }



    //console.log(angles);

    //add sphere
    // var sphereParent = new THREE.Object3D();
    // var sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
    // var sphereMaterial = new THREE.MeshBasicMaterial({
    //     color: 0xffff00
    // });
    // var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // sphereParent.add(sphere);
    // sphereParent.position.set(hand.x, hand.y, hand.z);
    // scene.add(sphereParent);
    // objects.push(sphere);
    plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(2000, 2000, 8, 8),
    new THREE.MeshBasicMaterial({
        color: 0x000000,
        opacity: 0.25,
        transparent: true
    }));
    plane.visible = false;
    scene.add(plane);

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setClearColor(0xf0f0f0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.sortObjects = false;

    renderer.shadowMapEnabled = true;
    renderer.shadowMapType = THREE.PCFShadowMap;

    container.appendChild(renderer.domElement);

    var info = document.createElement('div');
    info.style.position = 'absolute';
    info.style.top = '10px';
    info.style.width = '100%';
    info.style.textAlign = 'center';
    info.innerHTML = '<b>Inverse Kinematics</b><br><em>Alan Zhou (ayzhou), Andrew Kim (ak11), Michael Li (ml13)</em>';
    container.appendChild(info);


    renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    //

    window.addEventListener('resize', onWindowResize, false);

}

function cylinderMesh(pointX, pointY, material) {
            var direction = new THREE.Vector3().subVectors(pointY, pointX);
            var orientation = new THREE.Matrix4();
            orientation.lookAt(pointX, pointY, new THREE.Object3D().up);
            orientation.multiply(new THREE.Matrix4().set(1, 0, 0, 0,
                0, 0, 1, 0,
                0, -1, 0, 0,
                0, 0, 0, 1));
            var edgeGeometry = new THREE.CylinderGeometry(.5, .5, direction.length(), 8, 1);
            var edge = new THREE.Mesh(edgeGeometry, material);
            edge.applyMatrix(orientation);
            // position based on midpoints - there may be a better solution than this
            edge.position.x = (pointY.x + pointX.x) / 2;
            edge.position.y = (pointY.y + pointX.y) / 2;
            edge.position.z = (pointY.z + pointX.z) / 2;
            return edge;
}

function updateArms() {
    for (var i = 0; i < arms.length; i++) {
        var vertices = arms[i].geometry.vertices;

        var jacobian = makeJacobian(vertices);
        //console.log(jacobian);
        var deltaAngles = updateAngles(jacobian, i);
        //console.log(deltaAngles);
        updateVertices(deltaAngles, i);
        arms[i].geometry.verticesNeedUpdate = true;

        for (var j = 0; j < cylinders[i].length; j++) {
            scene.remove(cylinders[i][j]);
        }

        var joints = arms[i].geometry.vertices;
        for (var j = 1; j < joints.length; j++) {
            var cylinder = cylinderMesh(joints[j-1], joints[j], arms[i].material);
            scene.add(cylinder);
            cylinders[i][j-1] = cylinder;
        }


    }
}

function initAngles(armNum) {
    var vertices = arms[armNum].geometry.vertices;
    var angles = [];

    var prevVector = new THREE.Vector3(1, 0, 0);
    for (var i = 1; i < vertices.length; i++) {
        var currentVector = vertices[i].clone().sub(vertices[i-1]).normalize();
        var angle = prevVector.angleTo(currentVector);
        angles.push(angle);
        prevVector = currentVector;
    }
    return angles;
}

function updateVertices(deltaAngles, armNum) {
    var thisAngles = angles[armNum];
    var thisVertices = arms[armNum].geometry.vertices;
    //console.log(deltaAngles);
    //console.log(thisAngles);

    for (var i = 0; i < thisAngles.length; i++) {
        thisAngles[i] += deltaAngles.e(i+1);
    }
    var base_vertex = thisVertices[0];
    var prev_vertex = new THREE.Vector3(1, 0, 0);
    var anglesum = 0;

    for (var i = 1; i < thisVertices.length; i++) {

        var theta = thisAngles[i-1];
        var rotationMatrix = new THREE.Matrix3();
        rotationMatrix.set(Math.cos(theta), -Math.sin(theta), 0,
                           Math.sin(theta), Math.cos(theta), 0,
                           0, 0, 1);
       //console.log(rotationMatrix);
        var scalar = radiuses[armNum][i-1];

        thisVertices[i] = prev_vertex.applyMatrix3(rotationMatrix).multiplyScalar(scalar).add(base_vertex);
        base_vertex = thisVertices[i];
        prev_vertex = thisVertices[i].clone().sub(thisVertices[i-1]).normalize();
    }

    angles[armNum] = thisAngles;
    arms[armNum].geometry.vertices = thisVertices;

}

function calcRadiuses(armNum) {
    var vertices = arms[armNum].geometry.vertices;
    var radius = []
    for (var i = 1; i < vertices.length; i++) {
        radius.push(vertices[i].distanceTo(vertices[i-1]));
    }
    return radius;
}

function updateAngles(matrix, armNum) {
  var joints = arms[armNum].geometry.vertices;

  var e = $V([target.x - joints[joints.length-1].x, target.y - joints[joints.length-1].y,
    target.z - joints[joints.length-1].z]);

  var inverse = calcPseudoInverse(matrix);
  return inverse.multiply(e);

}

function calcPseudoInverse(matrix) {
  //console.log(matrix);
    var transpose = matrix.dup().transpose();
    var jjt = transpose.dup().multiply(matrix);
    var dampingFactor = 10;
    var identityMatrix = Matrix.I(jjt.cols());
    var pseudoinverse = jjt.add(identityMatrix.multiply(dampingFactor
        *dampingFactor)).inverse().multiply(transpose);
    //var pseudoinverse = matrix.dup().transpose().multiply((matrix.dup().multiply(matrix.dup().transpose())).inverse());
    return pseudoinverse;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    //
    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObject(plane);
        
    target = intersects[0].point;
    updateArms()
    return;

}


function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    controls.update();
    renderer.render(scene, camera);
}

function makeJacobian(joints) {
    var jacobian;
    var endEffector = joints[joints.length - 1]; // end effector position

    for (var i = 0; i < joints.length - 1; i++) {
        var position = joints[i]; // joint position
        var axis = new THREE.Vector3(0,0,1); // axis of rotation (for us, directly out of screen)
        var q = endEffector.clone().sub(position); // vector from joint position to end effector
        
        var temp = axis.cross(q);
        var tempM = Matrix.create([[temp.x],[temp.y],[temp.z]]);

        if (jacobian == null) {
            jacobian = tempM;
        }
        else {
            jacobian = jacobian.augment(tempM);
        }
    }
    return jacobian;
}