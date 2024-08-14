// a separate file for all the background stuff
// just to make main.js more readable I guess
let appName = "ResonaTHOR";
let appDescription =
  "the premier tool for simulating the view inside optical resonators";
/*
X1 = x1
X2 = x2
Z1 = z1
Z2 = z2
RESy = resonatorY
Xmirr_x10p = xMirrorX1OP
Xmirr_x20p = xMirrorX2OP
Zmirr_z10p = zMirrorZ1OP
Zmirr_z20p = zMirrorZ2OP
SphrCntr = sphereCentre
aprtrRad = apertureRadius
atFocDis = atanFocusDistance
RayAmount = noOfRays
strdPhotDesc = storedPhotoDescription
*/
// {showingStoredPhoto,
//  storedPhotoInfoString,
//  }
// a potom konkretne premenne
export function getInfoString(infoObject) {
  //console.log(infoObject.xMirrorX1OP);
  //console.log(bg, cmra);
  //console.log(ShaderMat);
  return (
    "<h4>Resonator</h4>\n" +
    `Resonator type = ${resonatorType2String(
      infoObject.resonatorType
    )} (${resonatorTypeInfo(infoObject.resonatorType)})<br>\n` +
    `Mirror type = ${mirrorType2String(
      infoObject.raytracingSphereShaderMaterial.uniforms.mirrorType.value
    )}<br>\n` +
    // `${cylindricalMirrors2String()}<br>\n` +
    `OP<sub><i>x</i>,1</sub> = ${infoObject.xMirrorX1OP.toPrecision(
      4
    )}, <i>f</i><sub><i>x</i>,1</sub> = ${(
      1 / infoObject.xMirrorX1OP
    ).toPrecision(4)}<br>\n` +
    `OP<sub><i>x</i>,2</sub> = ${infoObject.xMirrorX2OP.toPrecision(
      4
    )}, <i>f</i><sub><i>x</i>,2</sub> = ${(
      1 / infoObject.xMirrorX2OP
    ).toPrecision(4)}<br>\n` +
    `OP<sub><i>z</i>,1</sub> = ${infoObject.zMirrorZ1OP.toPrecision(
      4
    )}, <i>f</i><sub><i>z</i>,1</sub> = ${(
      1 / infoObject.zMirrorZ1OP
    ).toPrecision(4)}<br>\n` +
    `OP<sub><i>z</i>,2</sub> = ${infoObject.zMirrorZ2OP.toPrecision(
      4
    )}, <i>f</i><sub><i>z</i>,2</sub> = ${(
      1 / infoObject.zMirrorZ2OP
    ).toPrecision(4)}<br>\n` +
    `<i>x</i><sub>1</sub> = ${infoObject.x1.toPrecision(4)}<br>\n` +
    `<i>x</i><sub>2</sub> = ${infoObject.x2.toPrecision(4)}<br>\n` +
    `<i>z</i><sub>1</sub> = ${infoObject.z1.toPrecision(4)}<br>\n` +
    `<i>z</i><sub>2</sub> = ${infoObject.z2.toPrecision(4)}<br>\n` +
    `<i>y</i><sub>resonator</sub> = ${infoObject.resonatorY}<br>\n` +
    `Reflection coefficient = ${infoObject.raytracingSphereShaderMaterial.uniforms.reflectionCoefficient.value.toPrecision(
      4
    )} (reflection loss = ${(
      10 *
      Math.log10(
        1 -
          infoObject.raytracingSphereShaderMaterial.uniforms
            .reflectionCoefficient.value
      )
    ).toPrecision(4)} dB)<br>\n` +
    `<div class="tooltip">Max. number of reflections<span class="tooltiptext">Maximum number of<br>simulated reflections<br>before the pixel is<br>coloured black</span></div> = ${
      infoObject.raytracingSphereShaderMaterial.uniforms.maxTraceLevel.value - 2
    }<br>\n` +
    `<h4>Red sphere</h4>\n` +
    `${showSphere2String(infoObject.raytracingSphereShaderMaterial)}<br>\n` +
    `Centre = (${infoObject.sphereCentre.x.toPrecision(
      4
    )}, ${infoObject.sphereCentre.y.toPrecision(
      4
    )}, ${infoObject.sphereCentre.z.toPrecision(4)})<br>\n` +
    `<h4>Virtual camera</h4>\n` +
    `Position = (${infoObject.camera.position.x.toPrecision(
      4
    )}, ${infoObject.camera.position.y.toPrecision(
      4
    )}, ${infoObject.camera.position.z.toPrecision(4)})<br>\n` +
    `Horiz. FOV = ${infoObject.fovScreen.toPrecision(4)}<br>\n` +
    `Aperture radius = ${infoObject.apertureRadius.toPrecision(4)}<br>\n` +
    `Focussing distance = ${Math.tan(infoObject.atanFocusDistance).toPrecision(
      4
    )}<br>\n` +
    `Number of rays = ${infoObject.noOfRays}\n` +
    `<h4>Stored photo</h4>\n` +
    `Description/name = ${infoObject.storedPhotoDescription}\n` +
    "<h4>Background image information</h4>\n" +
    getBackgroundInfo(infoObject.background) +
    "<br>\n" +
    // '<a href="https://www.flickr.com/photos/pano_philou/1041580126">"360-180 Glasgow University - Western Square"</a> by pano_philou<br>\n' +
    'License: <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/">CC BY-NC-SA 2.0 DEED</a><br>\n' +
    // `<h4>${appName}</h4>\n` +
    `<br>${appName} (University of Glasgow, <a href="https://github.com/jkcuk/${appName}">https://github.com/jkcuk/${appName}</a>) is ${appDescription}.`
  );
}

// bg = background
export function background2String(bg) {
  switch (bg) {
    case 0:
      return "Glasgow University, West Quadrangle"; // '360-180 Glasgow University - Western Square.jpg'	// https://www.flickr.com/photos/pano_philou/1041580126
    case 1:
      return "Glasgow University, East Quadrangle"; // '360-180 Glasgow University - Eastern Square.jpg'	// https://www.flickr.com/photos/pano_philou/1141564032
    case 2:
      return "Mugdock"; // 'Mugdock Woods 6 Milngavie Scotland Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/3485817556
    case 3:
      return "Mugdock bluebells"; // 'Bluebells_13_Mugdock_Woods_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889830418
    case 4:
      return "Glencoe"; // '360-180 The Glencoe Pass And The Three Sisters.jpg'	// https://www.flickr.com/photos/pano_philou/1140758031
    default:
      return "Undefined";
    // 'Tower_University_Glasgow_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49890100126
    // 'Saddle_05_Arran_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889356918
  }
}

export function getBackgroundInfo(bg) {
  switch (bg) {
    case 0:
      return '<a href="https://www.flickr.com/photos/pano_philou/1041580126"><i>360-180 Glasgow University - Western Square</i></a> by pano_philou'; // https://www.flickr.com/photos/pano_philou/1041580126
    case 1:
      return '<a href="https://www.flickr.com/photos/pano_philou/1141564032"><i>360-180 Glasgow University - Eastern Square</i></a> by pano_philou'; //
    case 2:
      return '<a href="https://www.flickr.com/photos/gawthrop/3485817556"><i>Mugdock Woods 6 Milngavie Scotland Equirectangular</i></a> by Peter Gawthrop'; // https://www.flickr.com/photos/gawthrop/3485817556
    case 3:
      return '<a href="https://www.flickr.com/photos/gawthrop/49889830418"><i>Bluebells_13_Mugdock_Woods_Scotland-Equirectangular</i></a> by Peter Gawthrop'; //
    case 4:
      return '<a href="https://www.flickr.com/photos/pano_philou/1140758031"><i>360-180 The Glencoe Pass And The Three Sisters</i></a> by pano_philou'; // https://www.flickr.com/photos/pano_philou/1140758031
    default:
      return "Undefined";
    // 'Tower_University_Glasgow_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49890100126
    // 'Saddle_05_Arran_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889356918
  }
}
// rt = resonator type
export function resonatorType2String(rt) {
  switch (rt) {
    case 0:
      return "No resonator"; // '<div class="tooltip">No resonator<span class="tooltiptext">No mirrors</span></div>';
    case 1:
      return "Canonical resonator"; // '<div class="tooltip">Canonical resonator<span class="tooltiptext">Two planar mirrors<br>facing each other.</span></div>';
    case 2:
      return "Crossed canonical resonators"; // '<div class="tooltip">Crossed canonical resonators<span class="tooltiptext">Two sets of<br>planar mirrors<br>facing each other.</span></div>';
    case 3:
      return "Penrose unilluminable room"; // '<a href="https://en.wikipedia.org/wiki/Illumination_problem#Penrose_unilluminable_room">Penrose unilluminable room</a>';
    default:
      return "Undefined";
  }
}

export function resonatorTypeInfo(rt) {
  switch (rt) {
    case 0:
      return "no mirrors";
    case 1:
      return "two planar mirrors facing each other";
    case 2:
      return "two sets of planar mirrors facing each other";
    case 3:
      return '<a href="https://en.wikipedia.org/wiki/Illumination_problem#Penrose_unilluminable_room">https://en.wikipedia.org/wiki/Illumination_problem#Penrose_unilluminable_room</a>';
    default:
      return "Undefined";
  }
}
//ShaderMat=raytracingSphereShaderMaterial
export function mirrorType2String(raytracingSphereShaderMaterial) {
  switch (raytracingSphereShaderMaterial) {
    case 0:
      return "Spherical, ideal, thin, imaging, mirrors";
    case 1:
      return "Cylindrical, ideal, thin, imaging, mirrors";
    default:
      return "Undefined";
  }
}

export function guiMeshVisible2String(GUIMesh) {
  return "VR controls " + (GUIMesh.visible ? "visible" : "hidden");
}

export function showSphere2String(ShaderMat) {
  return (
    "Red sphere " + (ShaderMat.uniforms.showSphere.value ? "shown" : "hidden")
  );
}

let info;

//inf=info
export function createInfo() {
  info = document.getElementById("info");
  info.innerHTML = "-- nothing to show (yet) --";
}

export function setInfo(txt) {
  info.innerHTML = txt;
  // console.log('info: '+txt);
}

//shwStrdPhoto = showingStoredPhoto
//strdPhotoInfStr = storedPhotoInfoString
export function refreshInfo(infoObject) {
  if (infoObject.showingStoredPhoto) setInfo(infoObject.storedPhotoInfoString);
  else setInfo(getInfoString(infoObject));

  if (info.style.visibility == "visible") {
    setTimeout(() => refreshInfo(infoObject), 100);
  } // refresh again a while
}

export function toggleInfoVisibility(infoObject) {
  switch (info.style.visibility) {
    case "visible":
      info.style.visibility = "hidden";
      break;
    case "hidden":
    default:
      info.style.visibility = "visible";
      refreshInfo(infoObject);
  }
}
