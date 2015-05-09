var container, stats;
var camera, controls, scene, renderer;
var objects = [],
    plane;
var arms = [];

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2(),
    offset = new THREE.Vector3(),
    INTERSECTED, SELECTED;

init();
animate();
makeJacobian();

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 20;

    controls = new THREE.TrackballControls(camera);
    controls.rotateSpeed = 1.0;
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
    var material = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });
    var geometry = new THREE.Geometry();
    var hand = new THREE.Vector3(0, 10, 0);
    var elbow = new THREE.Vector3(10, 0, 0);
    var pivot = new THREE.Vector3(0, 0, 0);
    geometry.vertices.push(hand);
    geometry.vertices.push(elbow);
    geometry.vertices.push(pivot);
    var line = new THREE.Line(geometry, material);

    var sphereParent = new THREE.Object3D();
    var sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
    var sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00
    });
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereParent.add(sphere);
    sphereParent.position.set(hand.x, hand.y, hand.z);
    scene.add(sphereParent);

    scene.add(line);
    arms.push(line)
    objects.push(sphere);
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
    info.innerHTML = '<a href="http://threejs.org" target="_blank">three.js</a> webgl - draggable cubes';
    container.appendChild(info);


    renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);

    //

    window.addEventListener('resize', onWindowResize, false);

}

function updateArms(x, y) {
    for (var i = 0; i < arms.length; i++) {
        var vertices = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 20, 0)];
        for (var j = 0; j < vertices.length; j++) {
            arms[i].geometry.vertices[j] = vertices[j];
        }
        arms[i].geometry.verticesNeedUpdate = true;
    }

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

    if (SELECTED) {
        var intersects = raycaster.intersectObject(plane);
        
        updateArms(intersects[0].point.x, intersects[0].point.y)
        SELECTED.position.copy(intersects[0].point.sub(offset));
        return;
    }

    var intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0) {

        if (INTERSECTED != intersects[0].object) {

            if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);

            INTERSECTED = intersects[0].object;
            INTERSECTED.currentHex = INTERSECTED.material.color.getHex();

            plane.position.copy(INTERSECTED.position);
            plane.lookAt(camera.position);
        }
        container.style.cursor = 'pointer';

    } else {
        if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
        INTERSECTED = null;
        container.style.cursor = 'auto';
    }
}

function onDocumentMouseDown(event) {
    event.preventDefault();
    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
    var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
    var intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
        controls.enabled = false;
        SELECTED = intersects[0].object;
        var intersects = raycaster.intersectObject(plane);
        offset.copy(intersects[0].point).sub(plane.position);
        container.style.cursor = 'move';

    }

}

function onDocumentMouseUp(event) {
    event.preventDefault();
    controls.enabled = true;
    if (INTERSECTED) {
        plane.position.copy(INTERSECTED.position);
        SELECTED = null;
    }
}

//

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    controls.update();
    renderer.render(scene, camera);

}

function makeJacobian() {
    var joints = [];
    for (var i = 0; i < 3; i++) {
        joints[i] = new THREE.Vector3(i,0,0);
    }

    var thetas = [];
    var jacobian = Matrix.create();
    var n = 2;
    var s = new THREE.Vector3(0,0,0); // end effector position
    var endEffector = new THREE.Vector3(0,0,0); // target position
    // var e = endEffector.clone().sub(s); // desired changed in end effector position

    for (var i = 0; i < n; i++) {
        var position = joints[i].position; // joint position
        var axis = new THREE.Vector3(0,0,1); // axis of rotation (for us, directly out of screen)
        var q = position.clone().sub(endEffector); // vector from joint position to end effector
        var temp = a.clone().cross(q);
        var tempM = Matrix.create([temp.x],[temp.y],[temp.z]);
        console.log(temp);
        jacobian.augment(temp);
    }

    console.log(jacobian);
}