    var scene, camera, renderer;

    init();
    animate();

    // Sets up the scene.
    function init() {

      // Create the scene and set the scene size.
      scene = new THREE.Scene();
      var WIDTH = window.innerWidth,
      HEIGHT = window.innerHeight;

      // Create a renderer and add it to the DOM.
      renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
      renderer.setSize(WIDTH, HEIGHT);
      renderer.setClearColor( 0xffffff, 1);
      document.body.appendChild(renderer.domElement);

      // Create a camera, zoom it out from the model a bit, and add it to the scene.
      camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 0.1, 20000);
      camera.position.set(0, 0, -20);
      scene.add(camera);


      // Create an event listener that resizes the renderer with the browser window.
      window.addEventListener('resize', function() {
        var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
      });

      var material = new THREE.LineBasicMaterial({
        color: 0x0000ff
      });
      var geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(0, 10, 0));
      geometry.vertices.push(new THREE.Vector3(10, 0, 0));
      geometry.vertices.push(new THREE.Vector3(0, 0, 0));
      var line = new THREE.Line(geometry, material);

      scene.add(line);

      // Create a light, set its position, and add it to the scene.
      var light = new THREE.AmbientLight( 0x404040 ); // soft white light
      scene.add( light );

      // Add OrbitControls so that we can pan around with the mouse.
      controls = new THREE.OrbitControls(camera, renderer.domElement);

    }


    // Renders the scene and updates the render as needed.
    function animate() {

      // Read more about requestAnimationFrame at http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
      requestAnimationFrame(animate);
      
      // Render the scene.
      renderer.render(scene, camera);
      controls.update();

    }