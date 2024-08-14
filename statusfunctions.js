let anotherStatus; // = document.createElement('div');
let statusTime; // the time the last status was posted
let appName = "ResonaTHOR";

//txt=text
export function postStatus(text) {
  anotherStatus.innerHTML = "&nbsp;" + text;
  console.log("status: " + text);

  // show the text only for 3 seconds
  statusTime = new Date().getTime();
  setTimeout(() => {
    if (new Date().getTime() - statusTime > 2999)
      anotherStatus.innerHTML =
        "&nbsp;" +
        appName +
        ', University of Glasgow, <a href="https://github.com/jkcuk/' +
        appName +
        '">https://github.com/jkcuk/' +
        appName +
        "</a>";
  }, 3000);
}

/*
 * Add a text field to the bottom left corner of the screen
 */
export function createStatus() {
  anotherStatus = document.getElementById("status");
  postStatus(`${appName} welcomes you!`);
}

/**
 * Reset the aspect ratio and FOV of the virtual cameras.
 *
 * Call if the window size has changed (which also happens when the screen orientation changes)
 * or if camera's FOV has changed
 */

// rndr = renderer
// cmra = camera
// fovScrn = fovScreen
export function screenChanged(renderer, camera, fovScrn) {
  // alert(`new window size ${window.innerWidth} x ${window.innerHeight}`);

  // in case the screen size has changed
  if (renderer) renderer.setSize(window.innerWidth, window.innerHeight);

  // if the screen orientation changes, width and height swap places, so the aspect ratio changes
  let windowAspectRatio = window.innerWidth / window.innerHeight;
  camera.aspect = windowAspectRatio;

  // fovS is the screen's horizontal or vertical FOV, whichever is greater;
  // re-calculate the camera FOV, which is the *vertical* fov
  let verticalFOV;
  if (windowAspectRatio > 1.0) {
    // fovS is horizontal FOV; convert to get correct vertical FOV
    verticalFOV =
      (2.0 *
        Math.atan(
          Math.tan((0.5 * fovScrn * Math.PI) / 180.0) / windowAspectRatio
        ) *
        180.0) /
      Math.PI;
  } else {
    // fovS is already vertical FOV
    verticalFOV = fovScrn;
  }
  camera.fov = verticalFOV;

  // make sure the camera changes take effect
  camera.updateProjectionMatrix();
}

export function onWindowResize(renderer, camera, fovScrn) {
  screenChanged(renderer, camera, fovScrn);
  postStatus(`window size ${window.innerWidth} &times; ${window.innerHeight}`); // debug
}

/**
 * @param {*} fov	The larger of the camera's horizontal and vertical FOV, in degrees
 *
 * Set the larger FOV of the screen/window to fov.
 *
 * Depending on the screen/window's FOV, fov is either the horizontal fov (if screen width > screen height)
 * or the vertical fov (if screen width < screen height).
 */
// fv=fov

// we don't need this!!!!
// export function setScreenFOV(fv, rndr, camera, fovScrn) {
//   //fovScrn = fv;
//   console.log(fv);
//   screenChanged(rndr, camera, fv);
// }
