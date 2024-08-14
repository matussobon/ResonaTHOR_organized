import { postStatus } from "./statusfunctions.js";

function createVideoFeeds() {
  // create the video stream for the user-facing camera first, as some devices (such as my iPad), which have both cameras,
  // but can (for whatever reason) only have a video feed from one at a time, seem to go with the video stream that was
  // created last, and as the standard view is looking "forward" it is preferable to see the environment-facing camera.
  videoFeedU = document.getElementById("videoFeedU");

  // see https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video_webcam.html
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // user-facing camera
    const constraintsU = {
      video: {
        // 'deviceId': cameraId,	// this could be the device ID selected
        width: { ideal: 1280 }, // {ideal: 10000},
        // height: {ideal: 10000},
        facingMode: { ideal: "user" },
        // aspectRatio: { exact: width / height }
      },
    };
    navigator.mediaDevices
      .getUserMedia(constraintsU)
      .then(function (stream) {
        // apply the stream to the video element used in the texture
        videoFeedU.srcObject = stream;
        videoFeedU.play();

        videoFeedU.addEventListener("playing", () => {
          aspectRatioVideoFeedU =
            videoFeedU.videoWidth / videoFeedU.videoHeight;
          updateUniforms();
          postStatus(
            `User-facing(?) camera resolution ${videoFeedU.videoWidth} &times; ${videoFeedU.videoHeight}`
          );
        });
      })
      .catch(function (error) {
        postStatus(
          `Unable to access user-facing camera/webcam (Error: ${error})`
        );
      });
  } else {
    postStatus(
      "MediaDevices interface, which is required for video streams from device cameras, not available."
    );
  }

  videoFeedE = document.getElementById("videoFeedE");

  // see https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video_webcam.html
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // environment-facing camera
    const constraintsE = {
      video: {
        // 'deviceId': cameraId,	// this could be the device ID selected
        width: { ideal: 1280 }, // {ideal: 10000},
        // height: {ideal: 10000},
        facingMode: { ideal: "environment" },
        // aspectRatio: { exact: width / height }
      },
    };
    navigator.mediaDevices
      .getUserMedia(constraintsE)
      .then(function (stream) {
        // apply the stream to the video element used in the texture
        videoFeedE.srcObject = stream;
        videoFeedE.play();

        videoFeedE.addEventListener("playing", () => {
          aspectRatioVideoFeedE =
            videoFeedE.videoWidth / videoFeedE.videoHeight;
          updateUniforms();
          postStatus(
            `Environment-facing(?) camera resolution ${videoFeedE.videoWidth} &times; ${videoFeedE.videoHeight}`
          );
        });
      })
      .catch(function (error) {
        postStatus(
          `Unable to access environment-facing camera/webcam (Error: ${error})`
        );
      });
  } else {
    postStatus(
      "MediaDevices interface, which is required for video streams from device cameras, not available."
    );
  }
}
