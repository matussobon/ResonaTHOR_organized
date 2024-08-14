import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { postStatus } from "./statusfunctions";

//domElement was renderer
export function addOrbitControls(camera, domElement) {
  // controls

  const orbitControls = new OrbitControls(camera, domElement);
  // controls = new OrbitControls( cameraOutside, renderer.domElement );
  orbitControls.listenToKeyEvents(window); // optional

  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
  orbitControls.addEventListener("change", () => cameraPositionChanged(camera));

  orbitControls.enableDamping = false; // an animation loop is required when either damping or auto-rotation are enabled
  orbitControls.dampingFactor = 0.05;

  orbitControls.enablePan = true;
  orbitControls.enableZoom = true;

  orbitControls.maxPolarAngle = Math.PI;

  return orbitControls;
}

export function cameraPositionChanged(camera) {
  postStatus(
    `Camera position (${camera.position.x.toPrecision(
      2
    )}, ${camera.position.y.toPrecision(2)}, ${camera.position.z.toPrecision(
      2
    )})`
  );
  // counter = 0;
  // keep the raytracing sphere centred on the camera position
  // raytracingSphere.position.copy(camera.position.clone());	// TODO this doesn't seem to work as intended!?
}

export function pointForward(infoObject, orbitControls) {
  let r = infoObject.camera.position.length();
  infoObject.camera.position.x = 0;
  infoObject.camera.position.y = 0;
  infoObject.camera.position.z = r;
  orbitControls.update();
  postStatus("Pointing camera forwards (in -<b>z</b> direction)");
}
