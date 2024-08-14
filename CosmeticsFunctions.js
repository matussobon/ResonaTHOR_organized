import * as THREE from "three";
import { postStatus } from "./statusFunctions";

//bg = background
//bgTxtr = backgroundTexture

export function loadBackgroundImage(bg, bgTxtr) {
  const textureLoader = new THREE.TextureLoader();
  // textureLoader.crossOrigin = "Anonymous";
  // let bgTxtr;
  let filename;
  switch (bg) {
    case 1:
      filename =
        "textures/backgrounds/360-180 Glasgow University - Eastern Square.jpg"; // https://www.flickr.com/photos/pano_philou/1141564032
      break;
    case 2:
      filename =
        "textures/backgrounds/Mugdock Woods 6 Milngavie Scotland Equirectangular.jpg"; // https://www.flickr.com/photos/gawthrop/3485817556
      break;
    case 3:
      filename =
        "textures/backgrounds/Bluebells_13_Mugdock_Woods_Scotland-Equirectangular.jpg"; // https://www.flickr.com/photos/gawthrop/49889830418
      break;
    case 4:
      filename =
        "textures/backgrounds/360-180 The Glencoe Pass And The Three Sisters.jpg"; // https://www.flickr.com/photos/pano_philou/1140758031
      break;
    case 0:
    default:
      filename =
        "textures/backgrounds/360-180 Glasgow University - Western Square.jpg"; // https://www.flickr.com/photos/pano_philou/1041580126
    // 'Tower_University_Glasgow_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49890100126
    // 'Saddle_05_Arran_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889356918
  }

  bgTxtr = textureLoader.load(filename);
  return bgTxtr;
  //goddamn this took a lot of work,
}

export async function toggleFullscreen() {
  console.log("Entering fullscreen");
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      postStatus(
        `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`
      );
    });
    // allow screen orientation changes
    // screen.orientation.unlock();
  } else {
    document.exitFullscreen();
    console.log("Exiting fullscreen");
  }
}
