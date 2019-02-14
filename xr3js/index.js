// Copyright (c) 2018 8th Wall, Inc.

window.onload = () => {
  const purple = 0xAD50FF
  const cherry = 0xDD0065
  const mint = 0x00EDAF
  const canary = 0xFCEE21

  // xr3js owns the 3JS scene, camera and renderer. It is responsible for driving the scene camera,
  // matching the camera field of view to the AR field of view, and for calling 'render' inside the
  // camera run loop.
  const xr3js = XR.ThreejsRenderer()

  // XR controller provides 6DoF camera tracking and interfaces for configuring tracking.
  const xrController = XR.xrController()

  // To illustrate how to integrate render updates with the camera run loop, we drive a cone in
  // a circle every three seconds.
  let animateCone
  const startTime = Date.now()
  const coneLoopMillis = 3000

  // Populates some object into an XR scene and sets the initial camera position. The scene and
  // camera come from xr3js, and are only available in the camera loop lifecycle onStart() or later.
  const initXrScene = ({scene, camera}) => {
    // Add a grid of purple spheres to the scene. Objects in the scene at height/ y=0 will appear to
    // stick to physical surfaces.
    for (let i = -5; i <=5 ; i += .5) {
      for (let j = -5; j <= 5; j += .5) {
        if (Math.round(i) != i && Math.round(j) != j) { continue }
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(.03, 8, 8), new THREE.MeshBasicMaterial({color: purple}))
        sphere.position.set(i, 0, j)
        scene.add(sphere)
      }
    }

    // Add one cone in each cardinal direction, and three ahead. Objects in the scene at height
    // y=0 will appear to stick to physical surfaces.
    const cones = [
      {c: canary, p: [ 5, .5, 0]}, {c: mint, p: [-5, .5, 0]}, {c: cherry, p: [ 0, .5, 5]},
      {c: cherry, p: [ 0, .5, -5]}, {c: canary, p: [-1, .5, -5]}, {c: mint, p: [ 1, .5, -5]}
    ]
    const shape = new THREE.ConeGeometry( 0.25, 1, 8 )
    cones.forEach(({c, p}) => {
      const cone = new THREE.Mesh(shape, new THREE.MeshBasicMaterial({color: c}))
      cone.position.set(...p)
      if (p[0] == 0 && p[2] == -5) { animateCone = cone } // save one cone for animation.
      scene.add(cone)
    })

    // Set the initial camera position relative to the scene we just laid out. This must be at a
    // height greater than y=0.
    camera.position.set(0, 3, 0)
  }

  // Add the xrController module, which enables 6DoF camera motion estimation.
  XR.addCameraPipelineModule(xrController.cameraPipelineModule())

  // Add a GLRenderer which draws the camera feed to the canvas.
  XR.addCameraPipelineModule(XR.GLRenderer())

  // Add xr3js which creates a threejs scene, camera, and renderer, and drives the scene camera
  // based on 6DoF camera motion.
  XR.addCameraPipelineModule(xr3js)

  // Add custom logic to the camera loop. This is done with camera pipeline modules that provide
  // logic for key lifecycle moments for processing each camera frame. In this case, we'll be
  // adding onStart logic for scene initialization, and onUpdateWithResults logic for scene updates.
  XR.addCameraPipelineModule({
    // Camera pipeline modules need a name. It can be whatever you want but must be unique within
    // your app.
    name: 'myawesomeapp',

    // onStart is called once when the camera feed begins. In this case, we need to wait for the
    // xr3js scene to be ready before we can access it to add content.
    onStart: ({canvasWidth, canvasHeight}) => {
      // Get the 3js sceen from xr3js.
      const {scene, camera} = xr3js.xrScene()

      // Add some objects to the scene and set the starting camera position.
      initXrScene({scene, camera})

      // Sync the xr controller's 6DoF position and camera paremeters with our scene.
      xrController.updateCameraProjectionMatrix({
        // NOTE: soon we won't require to specify cam, although clip planes will be optional.
        cam: {
          pixelRectWidth: canvasWidth,
          pixelRectHeight: canvasHeight,
          nearClipPlane: 0.01,
          farClipPlane: 1000
        },
        origin: camera.position,
        facing: camera.quaternion,
      })
    },

    // onUpdateWithResults is called once per camera loop prior to render. Any 3js geometry scene
    // would typically happen here.
    onUpdateWithResults: () => {
      // Update the position of the animating cone at a constant angular velocity.
      const coneTheta = ((Date.now() - startTime) % coneLoopMillis) * 2 * Math.PI  / coneLoopMillis
      animateCone.position.set(Math.sin(coneTheta) * 1.5, .5, -Math.cos(coneTheta) * 1.5 - 3.5)
    },
  })

  // Call xrController.pause() / xrController.resume() when the button is pressed.
  document.getElementById('pause').addEventListener(
    'click',
    () => {
      if (!XR.isPaused()) {
        XR.pause()
        pauseButton.innerHTML = "RESUME"
        pauseButton.className = 'paused'
      } else {
        XR.resume()
        pauseButton.innerHTML = "PAUSE",
        pauseButton.className = ''
      }
    },
    true)

  // Call xrController.recenter() when the canvas is tapped with two fingers. This resets the
  // ar camera to the position specified by xrController.updateCameraProjectionMatrix() above.
  document.getElementById('xrweb').addEventListener(
    'touchstart',
    (e) => { if (e.touches.length == 2) { xrController.recenter() }},
    true)

  // Open the camera and start running the camera run loop.
  XR.run({canvas: document.getElementById('xrweb')})
}
