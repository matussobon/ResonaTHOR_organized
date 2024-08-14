import { postStatus } from "./statusFunctions";
import { getInfoString } from "./InfoFunctions";

let appName = "ResonaTHOR";

// my Canon EOS450D
const click = new Audio("./misc/sounds/click.m4a");
const trash = new Audio("./misc/sounds/EmptyTrash.m4a");

export function takePhoto(storedPhoto, renderer, infoObject) {
  try {
    click.play();

    storedPhoto = renderer.domElement.toDataURL("image/png");
    infoObject.storedPhotoInfoString = getInfoString(infoObject);

    infoObject.storedPhotoDescription = `${appName}`;
    //
    document.getElementById("storedPhoto").src = storedPhoto;
    document.getElementById("storedPhotoThumbnail").src = storedPhoto;
    document.getElementById("storedPhotoThumbnail").style.visibility =
      "visible";

    postStatus("Photo taken; click thumbnail to view and share");
  } catch (error) {
    console.error("Error:", error);
  }
}

export function showStoredPhoto(renderer, gui, infoObject) {
  console.log(storedPhoto);
  gui.hide();
  renderer.domElement.style.visibility = "hidden";
  document.getElementById("takePhotoButton").style.visibility = "hidden";
  // document.getElementById('changePositionButton').style.visibility = "hidden";
  document.getElementById("storedPhotoThumbnail").style.visibility = "hidden";
  document.getElementById("backButton").style.visibility = "visible";
  document.getElementById("shareButton").style.visibility = "visible";
  document.getElementById("deleteButton").style.visibility = "visible";
  document.getElementById("storedPhoto").style.visibility = "visible";
  infoObject.showingStoredPhoto = true;

  postStatus("Showing stored photo, " + infoObject.storedPhotoDescription);
}

export function showLivePhoto(renderer, gui, infoObject) {
  gui.show();
  renderer.domElement.style.visibility = "visible";
  document.getElementById("takePhotoButton").style.visibility = "visible";
  // document.getElementById('changePositionButton').style.visibility = "visible";
  if (storedPhoto)
    document.getElementById("storedPhotoThumbnail").style.visibility =
      "visible";
  document.getElementById("backButton").style.visibility = "hidden";
  document.getElementById("shareButton").style.visibility = "hidden";
  document.getElementById("deleteButton").style.visibility = "hidden";
  document.getElementById("storedPhoto").style.visibility = "hidden";
  infoObject.showingStoredPhoto = false;

  postStatus("Showing live image");
}

export function deleteStoredPhoto(storedPhoto, renderer, gui, infoObject) {
  storedPhoto = null;
  trash.play();
  showLivePhoto(renderer, gui, infoObject);

  postStatus("Stored photo deleted; showing live image");
  document.getElementById("storedPhotoThumbnail").style.visibility = "hidden";
}
