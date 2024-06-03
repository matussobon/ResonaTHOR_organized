
// This code is based on three.js, which comes with the following license:
//
// The MIT License
//
// Copyright © 2010-2024 three.js authors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
// import { createMeshesFromInstancedMesh } from 'three/examples/jsm/utils/SceneUtils.js';

let appName = 'ResonaTHOR';
let appDescription = 'the premier tool for simulating the view inside optical resonators';

let scene;
let renderer;
let backgroundTexture;
let camera;
let orbitControls;
let dragControls;
let raytracingSphere;
let raytracingSphereShaderMaterial;

let background = 0;

let resonatorType = 1;	// 0 = single canonical resonator in x direction, 1 = crossed canonical resonators in x and z directions, 2 = Penrose cavity
let mirrorsN2 = 4;	// max number of mirrors in each array

let xMirrorsN;
let xMirrorsX;	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
let xMirrorsY1;	// {y1[0], y1[1], ...}
let xMirrorsY2;	// {y2[0], y2[1], ...}
let xMirrorsZ1;	// {z1[0], z1[1], ...}
let xMirrorsZ2;	// {z2[0], z2[1], ...}
let xMirrorsP;	// {P[0], P[1], ...} Principal points
let xMirrorsOP;	// {op[0], op[1], ...} optical powers

let yMirrorsN;
let yMirrorsY;	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
let yMirrorsX1;	// {x1[0], x1[1], ...}
let yMirrorsX2;	// {x2[0], x2[1], ...}
let yMirrorsZ1;	// {z1[0], z1[1], ...}
let yMirrorsZ2;	// {z2[0], z2[1], ...}
let yMirrorsP;	// {P[0], P[1], ...} Principal points
let yMirrorsOP;	// {op[0], op[1], ...} optical powers

let zMirrorsN;
let zMirrorsZ;	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
let zMirrorsX1;	// {x1[0], x1[1], ...}
let zMirrorsX2;	// {x2[0], x2[1], ...}
let zMirrorsY1;	// {y1[0], y1[1], ...}
let zMirrorsY2;	// {y2[0], y2[1], ...}
let zMirrorsP;	// {P[0], P[1], ...} Principal points
let zMirrorsOP;	// {op[0], op[1], ...} optical powers

let x1 = -.5;
let x2 = 0.5;
let y1 = -.5;
let y2 = 0.5;
let z1 = -.5;
let z2 = 0.5;
let xMirrorX1OP = 0;
let xMirrorX2OP = 0;
let zMirrorZ1OP = 0;
let zMirrorZ2OP = 0;

let sphereCentre = new THREE.Vector3(0.75, 0., 0.25);
let sphereRadius = 0.1;

// lift the resonator up to eye level (in case of VR only)
let resonatorY = 0.0;
	
let fovScreen = 68;

let raytracingSphereRadius = 100.0;

// camera with wide aperture
let apertureRadius = 0.0;
let atanFocusDistance = Math.atan(3e8);	// 1 light second
let noOfRays = 1;
let autofocus = false;

// the status text area
let status;	// = document.createElement('div');
let statusTime;	// the time the last status was posted

// the info text area
let info;

// the menu
let gui;
let GUIParams;
let autofocusControl, focusDistanceControl, resonatorTypeControl, opz0Control, opz1Control, z0Control, z1Control, resonatorYControl, cylindricalLensesControl, backgroundControl, vrControlsVisibleControl, showSphereControl;

let GUIMesh;
let showGUIMesh;
// let meshRotationX = -Math.PI/4, meshRotationY = 0, meshRotationZ = 0;

// true if stored photo is showing
let showingStoredPhoto = false;
let storedPhoto;
let storedPhotoDescription;
let storedPhotoInfoString;

// my Canon EOS450D
const click = new Audio('./click.m4a');


init();
animate();

function init() {
	// create the info element first so that any problems can be communicated
	createStatus();

	scene = new THREE.Scene();
	// scene.background = new THREE.Color( 'skyblue' );
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	camera = new THREE.PerspectiveCamera( fovScreen, windowAspectRatio, 0.1, 2*raytracingSphereRadius + 1 );
	camera.position.z = 0.4;
	screenChanged();
	
	renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	document.body.appendChild( VRButton.createButton( renderer ) );	// for VR content
	document.body.appendChild( renderer.domElement );
	// document.getElementById('livePhoto').appendChild( renderer.domElement );

	loadBackgroundImage();

	initMirrors();
	addRaytracingSphere();

	// user interface

	addEventListenersEtc();

	addOrbitControls();

	// the controls menu
	// refreshGUI();
	createGUI();

	// addDragControls();

	// check if VR is supported (see https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/isSessionSupported)...
	// if (navigator.xr) {
	if ( 'xr' in navigator ) {
		// renderer.xr.enabled = false;
		// navigator.xr.isSessionSupported("immersive-vr").then((isSupported) => {
		navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {
			if (supported) {
				// ... and enable the relevant features
				renderer.xr.enabled = true;
				// use renderer.xr.isPresenting to find out if we are in XR mode -- see https://threejs.org/docs/#api/en/renderers/webxr/WebXRManager 
				// (and https://threejs.org/docs/#api/en/renderers/WebGLRenderer.xr, which states that renderer.xr points to the WebXRManager)
				document.body.appendChild( VRButton.createButton( renderer ) );	// for VR content
				addXRInteractivity();
			}
		});
	}

	createInfo();
	refreshInfo();
}

function animate() {
	renderer.setAnimationLoop( render );
}

function render() {
	// requestAnimationFrame( animate );

	// stats.begin();

	if(!showingStoredPhoto) {
		// update uniforms
		updateUniforms();

		renderer.render( scene,  camera );
	}

	// stats.end();
}

function updateUniforms() {

	// // are we in VR mode?
	let deltaY;
	// if(renderer.xr.enabled && renderer.xr.isPresenting) {
		deltaY = resonatorY;
	// } else {
	// 	deltaY = 0;
	// }

	GUIMesh.position.y = deltaY - 1;

	switch(resonatorType) {
		case 0:	// 0 = no resonator:
			xMirrorsN = 0;
			yMirrorsN = 0;
			zMirrorsN = 0;
			break;
		case 2:	// 2 = crossed canonical resonators in x and z directions
			xMirrorsN = 2;
			yMirrorsN = 0;
			zMirrorsN = 2;

			for(let i=0; i<xMirrorsN; i++) {
				xMirrorsY1[i] = y1+deltaY;
				xMirrorsY2[i] = y2+deltaY;
				xMirrorsZ1[i] = z1;
				xMirrorsZ2[i] = z2;
				xMirrorsP[i].y = deltaY;
			}
			xMirrorsX[0] = x1; xMirrorsP[0].x = x1; xMirrorsOP[0] = xMirrorX1OP;
			xMirrorsX[1] = x2; xMirrorsP[1].x = x2; xMirrorsOP[1] = xMirrorX2OP;

			for(let i=0; i<zMirrorsN; i++) {
				zMirrorsY1[i] = y1+deltaY;
				zMirrorsY2[i] = y2+deltaY;
				zMirrorsX1[i] = x1;
				zMirrorsX2[i] = x2;
				zMirrorsP[i].y = deltaY;
			}
			zMirrorsZ[0] = z1; zMirrorsP[0].z = z1; zMirrorsOP[0] = zMirrorZ1OP;
			zMirrorsZ[1] = z2; zMirrorsP[1].z = z2; zMirrorsOP[1] = zMirrorZ2OP;
			break;
		case 3:	// 3 = Penrose cavity
			xMirrorsN = 4;
			yMirrorsN = 0;
			zMirrorsN = 4;

			let z3 = z1 - 2/Math.abs(zMirrorZ1OP);
			let z4 = z2 + 2/Math.abs(zMirrorZ2OP);

			// the x mirrors
			for(let i=0; i<xMirrorsN; i++) {
				xMirrorsY1[i] = y1+deltaY;
				xMirrorsY2[i] = y2+deltaY;
				xMirrorsP[i].y = deltaY;
			}

			xMirrorsZ1[0] = z3; xMirrorsZ2[0] = z4; xMirrorsX[0] =  2*x1; xMirrorsP[0].x =  2*x1; xMirrorsOP[0] = 0;	// the outer left mirror
			xMirrorsZ1[1] = z1; xMirrorsZ2[1] = z2; xMirrorsX[1] =    x1; xMirrorsP[1].x =    x1; xMirrorsOP[1] = 0;	// the inner left mirror
			xMirrorsZ1[2] = z1; xMirrorsZ2[2] = z2; xMirrorsX[2] =   -x1; xMirrorsP[2].x =   -x1; xMirrorsOP[1] = 0;	// the inner right mirror
			xMirrorsZ1[3] = z3; xMirrorsZ2[3] = z4; xMirrorsX[3] = -2*x1; xMirrorsP[3].x = -2*x1; xMirrorsOP[3] = 0;	// the outer right mirror
			
			// the z mirrors
			for(let i=0; i<zMirrorsN; i++) {
				zMirrorsY1[i] = y1+deltaY;
				zMirrorsY2[i] = y2+deltaY;
				zMirrorsP[i].y = deltaY;
			}

			zMirrorsX1[0] = 2*x1; zMirrorsX2[0] = -2*x1; zMirrorsZ[0] = z3; zMirrorsP[0].z = z3; zMirrorsOP[0] = zMirrorZ1OP;	// the outer top mirror
			zMirrorsX1[1] = 2*x1; zMirrorsX2[1] =    x1; zMirrorsZ[1] =  0; zMirrorsP[1].z =  0; zMirrorsOP[1] = 0;	// the inner top mirror
			zMirrorsX1[2] =  -x1; zMirrorsX2[2] = -2*x1; zMirrorsZ[2] =  0; zMirrorsP[2].z =  0; zMirrorsOP[2] = 0;	// the inner bottom mirror
			zMirrorsX1[3] = 2*x1; zMirrorsX2[3] = -2*x1; zMirrorsZ[3] = z4; zMirrorsP[3].z = z4; zMirrorsOP[3] = zMirrorZ2OP;	// the outer bottom mirror

			break;
		case 1:	// 1 = single canonical resonator in x direction
		default:
			xMirrorsN = 2;
			yMirrorsN = 0;
			zMirrorsN = 0;

			for(let i=0; i<xMirrorsN; i++) {
				xMirrorsY1[i] = y1+deltaY;
				xMirrorsY2[i] = y2+deltaY;
				xMirrorsZ1[i] = z1;
				xMirrorsZ2[i] = z2;
				xMirrorsP[i].y = deltaY;
			}
			xMirrorsX[0] = x1; xMirrorsP[0].x = x1; xMirrorsOP[0] = xMirrorX1OP;
			xMirrorsX[1] = x2; xMirrorsP[1].x = x2; xMirrorsOP[1] = xMirrorX2OP;
	}
	raytracingSphereShaderMaterial.uniforms.xMirrorsN.value = xMirrorsN;
	raytracingSphereShaderMaterial.uniforms.yMirrorsN.value = yMirrorsN;
	raytracingSphereShaderMaterial.uniforms.zMirrorsN.value = zMirrorsN;

	raytracingSphereShaderMaterial.uniforms.sphereCentre.value.x = sphereCentre.x;
	raytracingSphereShaderMaterial.uniforms.sphereCentre.value.y = sphereCentre.y;
	raytracingSphereShaderMaterial.uniforms.sphereCentre.value.z = sphereCentre.z;

	// mesh.rotation.y = -Math.atan2(camera.position.z, camera.position.x);
	// mesh.rotation.z = meshRotationZ;
	
	// raytracingSphereShaderMaterial.uniforms.xMirrorsN.value = xMirrorsN;
	// raytracingSphereShaderMaterial.uniforms.xMirrorsX.value = xMirrorsX;	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
	// raytracingSphereShaderMaterial.uniforms.xMirrorsY1.value = xMirrorsY1;	// {y1[0], y1[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsY2.value = xMirrorsY2;	// {y2[0], y2[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsZ1.value = xMirrorsZ1;	// {z1[0], z1[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsZ2.value = xMirrorsZ2;	// {z2[0], z2[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsP.value = xMirrorsP;	// {P[0], P[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsOP.value = xMirrorsOP;	// {op[0], op[1], ...}

	// raytracingSphereShaderMaterial.uniforms.yMirrorsN.value = yMirrorsN;
	// raytracingSphereShaderMaterial.uniforms.yMirrorsY.value = yMirrorsY;	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
	// raytracingSphereShaderMaterial.uniforms.yMirrorsX1.value = yMirrorsX1;	// {x1[0], x1[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsX2.value = yMirrorsX2;	// {x2[0], x2[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsZ1.value = yMirrorsZ1;	// {z1[0], z1[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsZ2.value = yMirrorsZ2;	// {z2[0], z2[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsP.value = yMirrorsP;	// {P[0], P[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsOP.value = yMirrorsOP;	// {op[0], op[1], ...}

	// raytracingSphereShaderMaterial.uniforms.zMirrorsN.value = zMirrorsN;
	// raytracingSphereShaderMaterial.uniforms.zMirrorsZ.value = zMirrorsZ;	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
	// raytracingSphereShaderMaterial.uniforms.zMirrorsX1.value = zMirrorsX1;	// {x1[0], x1[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsX2.value = zMirrorsX2;	// {x2[0], x2[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsY1.value = zMirrorsY1;	// {y1[0], y1[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsY2.value = zMirrorsY2;	// {y2[0], y2[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsP.value = zMirrorsP;	// {P[0], P[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsOP.value = zMirrorsOP;	// {op[0], op[1], ...}

	raytracingSphereShaderMaterial.uniforms.backgroundTexture.value = backgroundTexture;

	// create the points on the aperture

	// create basis vectors for the camera's clear aperture
	let viewDirection = new THREE.Vector3();
	let apertureBasisVector1 = new THREE.Vector3();
	let apertureBasisVector2 = new THREE.Vector3();
	camera.getWorldDirection(viewDirection);
	viewDirection.normalize();
	// postStatus(`viewDirection.lengthSq() = ${viewDirection.lengthSq()}`);
	// if(counter < 10) console.log(`viewDirection = (${viewDirection.x.toPrecision(2)}, ${viewDirection.y.toPrecision(2)}, ${viewDirection.z.toPrecision(2)})`);

	if((viewDirection.x == 0.0) && (viewDirection.y == 0.0)) {
		// viewDirection is along z direction
		apertureBasisVector1.crossVectors(viewDirection, new THREE.Vector3(1, 0, 0)).normalize();
	} else {
		// viewDirection is not along z direction
		apertureBasisVector1.crossVectors(viewDirection, new THREE.Vector3(0, 0, 1)).normalize();
	}
	apertureBasisVector1.crossVectors(THREE.Object3D.DEFAULT_UP, viewDirection).normalize();
	// viewDirection = new THREE.Vector3(0, 0, -1);
	// apertureBasisVector1 = new THREE.Vector3(1, 0, 0);
	apertureBasisVector2.crossVectors(viewDirection, apertureBasisVector1).normalize();

	raytracingSphereShaderMaterial.uniforms.noOfRays.value = noOfRays;
	raytracingSphereShaderMaterial.uniforms.apertureXHat.value.copy(apertureBasisVector1);
	raytracingSphereShaderMaterial.uniforms.apertureYHat.value.copy(apertureBasisVector2);
	raytracingSphereShaderMaterial.uniforms.viewDirection.value.copy(viewDirection);
	raytracingSphereShaderMaterial.uniforms.apertureRadius.value = apertureRadius;

	let focusDistance = Math.tan(atanFocusDistance);
	
	if(raytracingSphereShaderMaterial.uniforms.focusDistance.value != focusDistance) {
		raytracingSphereShaderMaterial.uniforms.focusDistance.value = focusDistance;
		// GUIParams.'tan<sup>-1</sup>(focus. dist.)'.value = atanFocusDistance;
		focusDistanceControl.setValue(atanFocusDistance);
	}

	// (re)create random numbers
	// let i=0;
	// let randomNumbersX = [];
	// let randomNumbersY = [];
	// do {
	// 	// create a new pairs or random numbers (x, y) such that x^2 + y^2 <= 1
	// 	let x = 2*Math.random()-1;	// random number between -1 and 1
	// 	let y = 2*Math.random()-1;	// random number between -1 and 1
	// 	if(x*x + y*y <= 1) {
	// 		// (x,y) lies within a circle of radius 1
	// 		//  add a new point to the array of points on the aperture
	// 		randomNumbersX.push(apertureRadius*x);
	// 		randomNumbersY.push(apertureRadius*y);
	// 		i++;
	// 	}
	// } while (i < 100);
	// raytracingSphereShaderMaterial.uniforms.randomNumbersX.value = randomNumbersX;
	// raytracingSphereShaderMaterial.uniforms.randomNumbersY.value = randomNumbersY;
}

/** create raytracing phere */
function addRaytracingSphere() {

	// create arrays of random numbers (as GLSL is rubbish at doing random numbers)
	let randomNumbersX = [];
	let randomNumbersY = [];
	// make the first random number 0 in both arrays, meaning the 0th ray starts from the centre of the aperture
	randomNumbersX.push(0);
	randomNumbersY.push(0);
	// fill in the rest of the array with random numbers
	let i=1;
	do {
		// create a new pairs or random numbers (x, y) such that x^2 + y^2 <= 1
		let x = 2*Math.random()-1;	// random number between -1 and 1
		let y = 2*Math.random()-1;	// random number between -1 and 1
		if(x*x + y*y <= 1) {
			// (x,y) lies within a circle of radius 1
			//  add a new point to the array of points on the aperture
			randomNumbersX.push(x);
			randomNumbersY.push(y);
			i++;
		}
	} while (i < 100);

	// let n2Vectors = [];	// principal points
	// let n2Floats = [];
	// for(i=0; i<mirrorsN2; i++) {
	// 	n2Vectors.push(new THREE.Vector3(0., 0., 0.));
	// 	n2Floats.push(0.);
	// }

	// the sphere surrouning the camera in all directions
	const geometry = 
		new THREE.SphereGeometry( raytracingSphereRadius );
	raytracingSphereShaderMaterial = new THREE.ShaderMaterial({
		side: THREE.DoubleSide,
		// wireframe: true,
		uniforms: {
			// the set of mirrors in x planes
			maxTraceLevel: { value: 50 },
			xMirrorsN: { value: 0 },
			xMirrorsX: { value: xMirrorsX },	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
			xMirrorsY1: { value: xMirrorsY1 },	// {y1[0], y1[1], ...}
			xMirrorsY2: { value: xMirrorsY2 },	// {y2[0], y2[1], ...}
			xMirrorsZ1: { value: xMirrorsZ1 },	// {z1[0], z1[1], ...}
			xMirrorsZ2: { value: xMirrorsZ2 },	// {z2[0], z2[1], ...}
			xMirrorsP: { value: xMirrorsP },
			xMirrorsOP: { value: xMirrorsOP },
			// the set of mirrors in y planes
			yMirrorsN: { value: 0 },
			yMirrorsY: { value: yMirrorsY },	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
			yMirrorsX1: { value: yMirrorsX1 },	// {x1[0], x1[1], ...}
			yMirrorsX2: { value: yMirrorsX2 },	// {x2[0], x2[1], ...}
			yMirrorsZ1: { value: yMirrorsZ1 },	// {z1[0], z1[1], ...}
			yMirrorsZ2: { value: yMirrorsZ2 },	// {z2[0], z2[1], ...}
			yMirrorsP: { value: yMirrorsP },
			yMirrorsOP: { value: yMirrorsOP },
			// the set of mirrors in z planes
			zMirrorsN: { value: 0 },
			zMirrorsZ: { value: zMirrorsZ },	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
			zMirrorsX1: { value: zMirrorsX1 },	// {x1[0], x1[1], ...}
			zMirrorsX2: { value: zMirrorsX2 },	// {x2[0], x2[1], ...}
			zMirrorsY1: { value: zMirrorsY1 },	// {y1[0], y1[1], ...}
			zMirrorsY2: { value: zMirrorsY2 },	// {y2[0], y2[1], ...}
			zMirrorsP: { value: zMirrorsP },
			zMirrorsOP: { value: zMirrorsOP },
			cylindricalLenses: { value: true },
			reflectionCoefficient: { value: 0.9 },
			sphereCentre: { value: new THREE.Vector3(0, 0, 0) },
			sphereRadius: { value: sphereRadius },
			showSphere: { value: false },
			backgroundTexture: { value: backgroundTexture },
			focusDistance: { value: 10.0 },
			apertureXHat: { value: new THREE.Vector3(1, 0, 0) },
			apertureYHat: { value: new THREE.Vector3(0, 1, 0) },
			apertureRadius: { value: apertureRadius },
			randomNumbersX: { value: randomNumbersX },
			randomNumbersY: { value: randomNumbersY },
			noOfRays: { value: 1 },
			viewDirection: { value: new THREE.Vector3(0, 0, -1) },
			keepVideoFeedForward: { value: true }
		},
		vertexShader: `
			varying vec3 intersectionPoint;

			void main()	{
				// projectionMatrix, modelViewMatrix, position -> passed in from Three.js
				intersectionPoint = (modelMatrix * vec4(position, 1.0)).xyz;	// position.xyz;
				
  				gl_Position = projectionMatrix
					* modelViewMatrix
					* vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			precision highp float;

			#define PI 3.1415926538

			varying vec3 intersectionPoint;

			uniform int maxTraceLevel;

			// the mirrors

			const int mirrorsN2 = 4;

			// the set of mirrors in x planes
			uniform int xMirrorsN;	// number of x mirrors
			uniform float xMirrorsX[mirrorsN2];	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
			uniform float xMirrorsY1[mirrorsN2];	// {y1[0], y1[1], ...}
			uniform float xMirrorsY2[mirrorsN2];	// {y2[0], y2[1], ...}
			uniform float xMirrorsZ1[mirrorsN2];	// {z1[0], z1[1], ...}
			uniform float xMirrorsZ2[mirrorsN2];	// {z2[0], z2[1], ...}
			uniform vec3 xMirrorsP[mirrorsN2];
			uniform float xMirrorsOP[mirrorsN2];

			// the set of mirrors in y planes
			uniform int yMirrorsN;	// number of x mirrors
			uniform float yMirrorsY[mirrorsN2];	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
			uniform float yMirrorsX1[mirrorsN2];	// {x1[0], x1[1], ...}
			uniform float yMirrorsX2[mirrorsN2];	// {x2[0], x2[1], ...}
			uniform float yMirrorsZ1[mirrorsN2];	// {z1[0], z1[1], ...}
			uniform float yMirrorsZ2[mirrorsN2];	// {z2[0], z2[1], ...}
			uniform vec3 yMirrorsP[mirrorsN2];
			uniform float yMirrorsOP[mirrorsN2];

			// the set of mirrors in z planes
			uniform int zMirrorsN;	// number of z mirrors
			uniform float zMirrorsZ[mirrorsN2];	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
			uniform float zMirrorsX1[mirrorsN2];	// {x1[0], x1[1], ...}
			uniform float zMirrorsX2[mirrorsN2];	// {x2[0], x2[1], ...}
			uniform float zMirrorsY1[mirrorsN2];	// {y1[0], y1[1], ...}
			uniform float zMirrorsY2[mirrorsN2];	// {y2[0], y2[1], ...}
			uniform vec3 zMirrorsP[mirrorsN2];
			uniform float zMirrorsOP[mirrorsN2];

			uniform bool cylindricalLenses;
			uniform float reflectionCoefficient;

			uniform vec3 sphereCentre;
			uniform float sphereRadius;
			uniform bool showSphere;

			// background
			uniform sampler2D backgroundTexture;

			// the camera's wide aperture
			uniform float focusDistance;
			uniform int noOfRays;
			uniform vec3 apertureXHat;
			uniform vec3 apertureYHat;
			uniform vec3 viewDirection;
			uniform float apertureRadius;
			uniform float randomNumbersX[100];
			uniform float randomNumbersY[100];
			// uniform float apertureRadius;
	
			// uniform float xPlaneX[2];

			vec3 xHat = vec3(1., 0., 0.);
			vec3 yHat = vec3(0., 1., 0.);
			vec3 zHat = vec3(0., 0., 1.);

			// // rotation matrix that rotates 2D vectors by the angle alpha (in radians)
			// // from https://gist.github.com/yiwenl/3f804e80d0930e34a0b33359259b556c
			// mat2 getRotationMatrix(float alpha) {
			// 	float s = sin(alpha);
			// 	float c = cos(alpha);
			// 	return mat2(c, s, -s, c);
			// }

			// // rotate the 2D vector v by the angle alpha (in radians)
			// // from https://gist.github.com/yiwenl/3f804e80d0930e34a0b33359259b556c
			// vec2 rotate(vec2 v, float alpha) {
			// 	return getRotationMatrix(alpha) * v;
			// }

			// propagate the ray starting at position s and with direction d to the plane r.n = n0, 
			// provided that plane is in the ray's "forward" direction;
			// nHat is the *normalised* normal to the plane,
			// n0 is the distance of the plane, in the direction n, from the origin,
			// p becomes the point where the ray intersects the plane;
			// isForward is set to true or false depending on whether the intersection point is forwards or backwards along the ray
			void propagateForwardToPlane(
				inout vec3 s, 
				vec3 d, 
				vec3 nHat,
				float n0,
				inout bool isForward
			) {
				// calculate the distance in the n direction from the ray start position to the array
				float deltaN = n0 - dot(s, nHat);

				// is the intersection with the plane in the ray's "forward" direction?
				float dN = dot(d, nHat);
				isForward = (dN*deltaN > 0.0);

				// if the intersection is in the forward direction, advance the ray to the plane
				if(isForward) s += d/dN*deltaN;	// set s to the intersection point with the plane
			}

			// reflect the ray with start point s and direction d off the plane r.nHat = n0,
			// provided the intersection with the plane is in the ray's "forward" direction
			void planarMirrorReflect(
				inout vec3 s, 
				vec3 d, 
				vec3 nHat,
				float n0,
				inout bool isForward
			) {
				propagateForwardToPlane(s, d, nHat, n0, isForward);

				if(isForward) {
					d -= 2.0*d/length(d)*dot(d, nHat);
				}
			}

			// Calculate the light-ray direction after transmission through a (spherical or cylindrical)
			// ideal thin lens or ideal thin (imaging) mirror, or a phase hologram thereof.
			// d is the incident light-ray direction;
			// pi is a 2D vector containing the vector PI = I-P, i.e. the vector from the principal point P to the intersection point I;
			// TO SIMULATE A CYLINDRICAL LENS with (normalised) optical-power direction opdHat, set pi not to (I-P), but to
			// the component of (I-P) in the direction of the optical-power direction, opdHat*dot(I-P, opdHat);
			// nHat is the normalised normal to the lens/mirror (a factor -1 doesn't matter);
			// op is the optical power;
			// reflectionFactor should be +1 for a lens and -1 for a mirror;
			// returns the outgoing light-ray direction
			void lensOrMirrorDeflect(inout vec3 d, vec3 pi, vec3 nHat, float op, float reflectionFactor, bool phaseHologram) {
				vec3 d1, d1T;
				float d1N;
				if(phaseHologram) {
					// phase hologram
					// normalise d such that its length is 1
					d1 = d/length(d);

					d1N = dot(d1, nHat);	// the n component of d1
					vec3 d1T = d1 - nHat*d1N;	// the transverse (perpendicular to nHat) part of d1
	
					// transverse components of the outgoing light-ray direction
					vec3 dTOut = d1T - pi*op;
	
					// from the transverse direction, construct a 3D vector by setting the n component such that the length
					// of the vector is 1
					d = dTOut + nHat*reflectionFactor*sign(d1N)*sqrt(1.0 - dot(dTOut, dTOut));
				} else {
					// ideal thin lens/mirror
					// "normalise" the direction such that the magnitude of the n component is 1
					d1 = d/abs(dot(d, nHat));

					d1N = dot(d1, nHat);	// the n component of d1
					vec3 d1T = d1 - nHat*d1N;	// the transverse (perpendicular to nHat) part of d1

					// the 3D deflected direction comprises the transverse components and a n component of magnitude 1
					// and the same sign as d1N = dot(d, nHat)
					d = d1T - pi*op + nHat*reflectionFactor*sign(d1N);
				} 
			}

			// Calculate the light-ray direction after transmission through a (spherical or cylindrical) lens or lens hologram.
			// d is the incident light-ray direction;
			// pixy is a 2D vector containing the transverse (x, y) components of the vector I-P,
			// i.e. the vector from the principal point P to the intersection point I;
			// TO SIMULATE A CYLINDRICAL LENS, replace (I-P).xy with (I-P).pdHat = pdHat * (I-P).pdHat,
			// i.e. the parts of (I-P).xy parallel to the optical-power direction
			// f is the focal length;
			// returns the outgoing light-ray direction
			void lensDeflect(inout vec3 d, vec2 pixy, float f, bool idealLens) {
				if(idealLens) {
					// ideal thin lens
					// "normalise" the direction such that the magnitude of the z component is 1
					vec3 d1 = d/abs(d.z);

					// the 3D deflected direction comprises the transverse components and a z component of magnitude 1
					// and the same sign as d.z
					d = vec3(d1.xy - pixy/f, d1.z);
				} else {
					// lens hologram
					// normalise d
					vec3 dN = d/length(d);
					// transverse components of the outgoing light-ray direction
					vec2 dxy = dN.xy - pixy/f;
	
					// from the transverse direction, construct a 3D vector by setting the z component such that the length
					// of the vector is 1
					d = vec3(dxy, sign(d.z)*sqrt(1.0 - dot(dxy, dxy)));
				}
			}

			// Pass the current ray (start point s, direction d, brightness factor b) through (or around) a lens.
			// The (ideal thin) lens, of focal length f, is in a z plane through centreOfLens.
			// It is circular, with the given radius, centred on centreOfLenss.
			void passThroughZLens(
				inout vec3 s, 
				inout vec3 d, 
				inout vec4 b,
				vec3 centreOfLens, 
				float radius,
				float focalPower,
				bool idealLens
			) {
				bool isForward;
				propagateForwardToPlane(s, d, zHat, centreOfLens.z, isForward);

				if(isForward) {
					// there is an intersection with the plane of this lens in the ray's forward direction

					// does the intersection point lie within the radius?
					vec3 pi = s - centreOfLens;	// vector from the princpal point to the intersection point, p
					float r2 = dot(pi, pi);
					// vec2 pixy = s.xy - centreOfLens.xy;
					// float r2 = dot(pixy, pixy);
					if(r2 < radius*radius) {
						// the intersection point lies inside the radius, so the lens does something to the ray

						// deflect the light-ray direction accordingly and make sure that the sign of the z component remains the same
						// lensDeflect(d, pixy, focalLength, idealLens);
						lensOrMirrorDeflect(d, pi, 
							vec3(0., 0., 1.),	// nHat 
							// 0.,	// n0
							focalPower,	// f
							-1.,	// reflectionFactor, +1 = transmissive
							false	// phaseHologram
						);

						// lower the brightness factor, giving the light a blue tinge
						b *= vec4(0.9, 0.9, 0.99, 1);
					} 
				}
			}

			vec4 getColorOfBackground(
				vec3 d
			) {
				float l = length(d);
				float phi = atan(d.z, d.x) + PI;
				float theta = acos(d.y/l);
				return texture2D(backgroundTexture, vec2(mod(phi/(2.*PI), 1.0), 1.-theta/PI));
			}

			bool findNearestIntersectionWithSphere(
				vec3 s, 	// ray start point
				vec3 d, 	// ray direction
				vec3 c,		// sphere centre
				float r,	// sphere radius
				out vec3 intersectionPosition,
				out float intersectionDistance
			) {
				// for maths see geometry.pdf
				vec3 v = s - c;
				float A = dot(d, d);
				float B = 2.*dot(d, v);
				float C = dot(v, v) - r*r;

				// calculate the discriminant
				float D= B*B - 4.*A*C;

				if(D < 0.) {
					// the discriminant is negative -- all solutions are imaginary, so there is no intersection
					return false;
				}

				// there is at least one intersection, but is at least one in the forward direction?

				// calculate the square root of the discriminant
				float sd = sqrt(D);

				// try the "-" solution first, as this will be closer, provided it is positive (i.e. in the forward direction)
				float delta = (-B - sd)/(2.*A);
				bool intersection;
				if(delta < 0.) {
					// the delta for the "-" solution is negative, so that is a "backwards" solution; try the "+" solution
					delta = (-B + sd)/(2.*A);

					if(delta < 0.)
						// the "+" solution is also in the backwards direction
						return false;
				}

				// there is an intersection in the forward direction, at
				intersectionPosition = s + delta*d;
				intersectionDistance = delta*length(d);
				return true;
			}

			// find the closest intersection in the ray's forward direction with the x planes
			// s: ray start point (will not be altered)
			// d: ray direction
			// intersectionPosition: initial value ignores; becomes the position of the intersection
			// intersectionDistance: initial value ignored; becomes the distance to the closest intersection point
			// intersectionPlaneIndex: initial value ignored; becomes the index of the x plane being intersected
			// returns true if an intersection has been found
			bool findNearestIntersectionWithXMirrors(
				vec3 s, 
				vec3 d, 
				in int startIntersectionPlaneIndex,
				out vec3 intersectionPosition,
				out float intersectionDistance,
				out int intersectionPlaneIndex
			) {
				int i, di;
				if(d.x > 0.0) {
					// d.x > 0
					// start searching at the lowest index...
					i = 0;
					// ... in the direction of increasing index
					di = +1;
				} else {
					// d.x <= 0
					// start searching at the highest index...
					i = xMirrorsN - 1;
					// ... in the direction of decreasing index
					di = -1;
				}

				// skip through all the mirrors that will certainly not be intersected as the ray is moving away from them
				while (
					(i >= 0) && 
					(i < xMirrorsN) && 
					( (xMirrorsX[i]-s.x)*float(di) < 0.0 )
				)	// while the current mirror is on the "wrong" side of the start point...
					i += di;	// ... go to the next mirror

				// start going through any mirrors on the "right" side of the start point
				while ((i >= 0) && (i < xMirrorsN)) {
					if(i != startIntersectionPlaneIndex) {
						vec3 d1 = d/d.x;	// a vector in the direction of d with x-component +1
						vec3 ip = s + (xMirrorsX[i] - s.x)*d1;	// the intersection point with the plane of mirror #i
						// check if the y and z components are within the rectangle
						if(
							(xMirrorsY1[i] <= ip.y) &&
							(ip.y <= xMirrorsY2[i]) &&
							(xMirrorsZ1[i] <= ip.z) &&
							(ip.z <= xMirrorsZ2[i])						
						) {
							// the intersection point is on the mirror; return it
							intersectionPosition = ip;
							intersectionDistance = length(intersectionPosition - s);
							intersectionPlaneIndex = i;
							return true;	// there is an intersection
						}
					}
					i += di;	// go to the next mirror
				}

				return false;
			}

			// find the closest intersection in the ray's forward direction with the y mirrors
			// s: ray start point (will not be altered)
			// d: ray direction
			// intersectionPosition: initial value ignores; becomes the position of the intersection
			// intersectionDistance: initial value ignored; becomes the distance to the closest intersection point
			// intersectionPlaneIndex: initial value ignored; becomes the index of the y mirror being intersected
			// returns true if an intersection has been found
			bool findNearestIntersectionWithYMirrors(
				vec3 s, 
				vec3 d, 
				in int startIntersectionPlaneIndex,
				out vec3 intersectionPosition,
				out float intersectionDistance,
				out int intersectionPlaneIndex
			) {
				int i, di;
				if(d.y > 0.0) {
					// d.y > 0
					// start searching at the lowest index...
					i = 0;
					// ... in the direction of increasing index
					di = +1;
				} else {
					// d.y <= 0
					// start searching at the highest index...
					i = yMirrorsN - 1;
					// ... in the direction of decreasing index
					di = -1;
				}

				// skip through all the mirrors that will certainly not be intersected as the ray is moving away from them
				while (
					(i >= 0) && 
					(i < yMirrorsN) && 
					( (yMirrorsY[i]-s.y)*float(di) < 0.0 )
				)	// while the current mirror is on the "wrong" side of the start point...
					i += di;	// ... go to the next mirror

				// start going through any mirrors on the "right" side of the start point
				while ((i >= 0) && (i < yMirrorsN)) {
					if(i != startIntersectionPlaneIndex) {
						vec3 d1 = d/d.y;	// a vector in the direction of d with y-component +1
						vec3 ip = s + (yMirrorsY[i] - s.y)*d1;	// the intersection point with the plane of mirror #i
						// check if the x and z components are within the rectangle
						if(
							(yMirrorsX1[i] <= ip.x) &&
							(ip.x <= yMirrorsX2[i]) &&
							(yMirrorsZ1[i] <= ip.z) &&
							(ip.z <= yMirrorsZ2[i])						
						) {
							// the intersection point is on the mirror; return it
							intersectionPosition = ip;
							intersectionDistance = length(intersectionPosition - s);
							intersectionPlaneIndex = i;
							return true;	// there is an intersection
						}
					}
					i += di;	// go to the next mirror
				}

				return false;
			}

			// find the closest intersection in the ray's forward direction with the z mirrors
			// s: ray start point (will not be altered)
			// d: ray direction
			// intersectionPosition: initial value ignores; becomes the position of the intersection
			// intersectionDistance: initial value ignored; becomes the distance to the closest intersection point
			// intersectionPlaneIndex: initial value ignored; becomes the index of the z plane being intersected
			// returns true if an intersection has been found
			bool findNearestIntersectionWithZMirrors(
				vec3 s, 
				vec3 d, 
				in int startIntersectionPlaneIndex,
				out vec3 intersectionPosition,
				out float intersectionDistance,
				out int intersectionPlaneIndex
			) {
				int i, di;
				if(d.z > 0.0) {
					// d.z > 0
					// start searching at the lowest index...
					i = 0;
					// ... in the direction of increasing index
					di = +1;
				} else {
					// d.z <= 0
					// start searching at the highest index...
					i = zMirrorsN - 1;
					// ... in the direction of decreasing index
					di = -1;
				}

				// skip through all the mirrors that will certainly not be intersected as the ray is moving away from them
				while (
					(i >= 0) && 
					(i < zMirrorsN) && 
					( (zMirrorsZ[i]-s.z)*float(di) < 0.0 )
				)	// while the current mirror is on the "wrong" side of the start point...
					i += di;	// ... go to the next mirror

				// start going through any mirrors on the "right" side of the start point
				while ((i >= 0) && (i < zMirrorsN)) {
					if(i != startIntersectionPlaneIndex) {
						vec3 d1 = d/d.z;	// a vector in the direction of d with z-component +1
						vec3 ip = s + (zMirrorsZ[i] - s.z)*d1;	// the intersection point with the plane of mirror #i
						// check if the x and y components are within the rectangle
						if(
							(zMirrorsX1[i] <= ip.x) &&
							(ip.x <= zMirrorsX2[i]) &&					
							(zMirrorsY1[i] <= ip.y) &&
							(ip.y <= zMirrorsY2[i])
						) {
							// the intersection point is on the mirror; return it
							intersectionPosition = ip;
							intersectionDistance = length(intersectionPosition - s);
							intersectionPlaneIndex = i;
							return true;	// there is an intersection
						}
					}
					i += di;	// go to the next mirror
				}

				return false;
			}

			// find the closest intersection in the ray's forward direction with either the x, y or z planes
			// or any other objects (such as a red sphere)
			// s: ray start point (will not be altered)
			// d: ray direction
			// intersectionPosition: initial value ignored; becomes the position of the intersection
			// intersectionDistance: initial value ignored; becomes the distance to the closest intersection point
			// objectSetIndex: 0/1/2 if the intersection is with the x/y/z planes, 3 if it is with coloured spheres
			// objectIndex: initial value ignored; becomes the index of the object within the object set being intersected
			// returns true if an intersection has been found
			bool findNearestIntersectionWithObjects(
				vec3 s, 
				vec3 d, 
				in int startIntersectionPlaneIndex,
				in int startIntersectionPlaneSetIndex,
				out vec3 intersectionPosition,
				out float intersectionDistance,
				out int objectSetIndex,
				out int objectIndex,
				out float mirrorOpticalPower,
				out vec3 mirrorPrincipalPoint,
				out vec3 mirrorNormalHat
			) {
				intersectionDistance = 1e20;	// this means there is no intersection, so far

				// create space for the current...
				vec3 ip;	// ... intersection point, ...
				float id;	// ... intersection distance, ...
				int oi;	// ... and object index

				// is there an intersection with the x mirrors?
				if (findNearestIntersectionWithXMirrors(s, d, (startIntersectionPlaneSetIndex == 0)?startIntersectionPlaneIndex:-1, ip, id, oi)) {
					// yes, there is an intersection with the x mirrors
					intersectionPosition = ip;
					intersectionDistance = id;
					mirrorOpticalPower = xMirrorsOP[oi];
					mirrorPrincipalPoint = xMirrorsP[oi];
					mirrorNormalHat = xHat;
					objectIndex = oi;
					objectSetIndex = 0;	// x mirrors
				}

				// is there an intersection with the y mirrors?
				if (findNearestIntersectionWithYMirrors(s, d, (startIntersectionPlaneSetIndex == 1)?startIntersectionPlaneIndex:-1, ip, id, oi)) {
					// yes, there is an intersection with the y mirrors
					// if there either no intersection already, or, if there is one, is it closer than the closest intersection so far?
					if(id < intersectionDistance) {
						// the intersection with the y mirrors is the closest one so far
						intersectionPosition = ip;
						intersectionDistance = id;
						mirrorOpticalPower = yMirrorsOP[oi];
						mirrorPrincipalPoint = yMirrorsP[oi];
						mirrorNormalHat = yHat;
						objectIndex = oi;
						objectSetIndex = 1;	// y mirrors
					}
				}
				
				// is there an intersection with the z mirrors?
				if (findNearestIntersectionWithZMirrors(s, d, (startIntersectionPlaneSetIndex == 2)?startIntersectionPlaneIndex:-1, ip, id, oi)) {
					// yes, there is an intersection with the z mirrors
					// if there either no intersection already, or, if there is one, is it closer than the closest intersection so far?
					if(id < intersectionDistance) {
						// the intersection with the z mirrors is the closest one so far
						intersectionPosition = ip;
						intersectionDistance = id;
						mirrorOpticalPower = zMirrorsOP[oi];
						mirrorPrincipalPoint = zMirrorsP[oi];
						mirrorNormalHat = zHat;
						objectIndex = oi;
						objectSetIndex = 2;	// z mirrors
					}
				}

				// is there an intersection with the sphere?
				if( showSphere && findNearestIntersectionWithSphere(s, d, sphereCentre, sphereRadius, ip, id) ) {
					// yes, there is an intersection with the sphere
					// if there either no intersection already, or, if there is one, is it closer than the closest intersection so far?
					if(id < intersectionDistance) {
						// the intersection with the z mirrors is the closest one so far
						intersectionPosition = ip;
						intersectionDistance = id;
						objectSetIndex = 3;	// sphere
					}
				}
				
				return (intersectionDistance < 1e20);
			}

			void main() {
				// first calculate the focusPosition, i.e. the point this pixel is focussed on
				vec3 pv = intersectionPoint - cameraPosition;	// the "pixel view direction", i.e. a vector from the centre of the camera aperture to the point on the object the shader is currently "shading"
				vec3 focusPosition = cameraPosition + focusDistance/abs(dot(pv, viewDirection))*pv;	// see Johannes's lab book 30/4/24 p.174

				// trace <noOfRays> rays
				gl_FragColor = vec4(0, 0, 0, 0);
				vec4 color;
				for(int i=0; i<noOfRays; i++) {
					// the current ray start position, a random point on the camera's circular aperture
					vec3 s = cameraPosition + apertureRadius*randomNumbersX[i]*apertureXHat + apertureRadius*randomNumbersY[i]*apertureYHat;
	
					// first calculate the current light-ray direction:
					// the ray first passes through focusPosition and then p,
					// so the "backwards" ray direction from the camera to the intersection point is
					vec3 d = focusPosition - s;
					// we normalise this here such that ???
					// d = pv.z/d.z*d;
	
					// current brightness factor; this will multiply the colour at the end
					vec4 b = vec4(1.0, 1.0, 1.0, 1.0);

					vec3 ip;
					float id;
					float mop;
					vec3 mp;
					vec3 mNHat;
					int oi = -1;
					int si = -1;
					int tl = maxTraceLevel;	// max trace level
					while(
						(tl-- > 0) &&
						findNearestIntersectionWithObjects(s, d, 
							oi, si,
							ip,	// out vec3 intersectionPosition
							id,	// out float intersectionDistance
							si,	// out int objectSetIndex
							oi,	// out int objectIndex
							mop,	// out float mirrorOpticalPower
							mp,	// out vec3 mirrorPrincipalPoint
							mNHat	// out vec3 mirrorNormalHat	
						)
					) {
						if(si == 3) { 
							// the red sphere
							color = vec4(1., 0., 0., 1.);
							tl = -10;
						} else {
							s = ip;
							vec3 p2i = s - mp;
							if(cylindricalLenses) {
								p2i.y = 0.0;
								// p2i.z = 0.0;
							}
							lensOrMirrorDeflect(d, p2i, mNHat, mop, -1., false);
							b *= vec4(reflectionCoefficient, reflectionCoefficient, reflectionCoefficient, 1.);
							// color = vec4(float(si)/2., 0., float(ii)/2., 1.);
						}
					}
	
					if(tl > 0) {
						color = getColorOfBackground(d);
						// color = vec4(0, 0, 1, 1);
					} else if(tl != -11) {
						// max number of bounces, but not the sphere
						color = vec4(0, 0, 0, 1);
					}
		
					// finally, multiply by the brightness factor and add to gl_FragColor
					gl_FragColor += b*color;
				}
					
				gl_FragColor /= float(noOfRays);
			}
		`
	});
	raytracingSphere = new THREE.Mesh( geometry, raytracingSphereShaderMaterial ); 
	scene.add( raytracingSphere );
}


// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_animation_skinning_additive_blending.html
function createGUI() {
	// const 
	gui = new GUI();
	// gui.hide();
	// GUIMesh = new HTMLMesh( gui.domElement );	// placeholder

	GUIParams = {
		noOfReflections: raytracingSphereShaderMaterial.uniforms.maxTraceLevel.value - 2,
		'Horiz. FOV (&deg;)': fovScreen,
		'Aperture radius': apertureRadius,
		'tan<sup>-1</sup>(focus. dist.)': atanFocusDistance,
		'No of rays': noOfRays,
		autofocus: function() { 
			autofocus = !autofocus;
			autofocusControl.name( 'Autofocus: ' + (autofocus?'On':'Off') );
			focusDistanceControl.disable(autofocus);
		},	// (autofocus?'On':'Off'),
		// 'Autofocus': autofocus,
		'Point forward (in -<b>z</b> direction)': pointForward,
		'Show/hide info': toggleInfoVisibility,
		vrControlsVisible: function() {
			GUIMesh.visible = !GUIMesh.visible;
			vrControlsVisibleControl.name( guiMeshVisible2String() );
		},
		background: function() {
			background = (background + 1) % 5;
			loadBackgroundImage();
			backgroundControl.name( background2String() );	
		},
		sphereRadius: sphereRadius,
		sphereCentreX: sphereCentre.x,
		sphereCentreY: sphereCentre.y,
		sphereCentreZ: sphereCentre.z,
		showSphere: function() {
			raytracingSphereShaderMaterial.uniforms.showSphere.value = !raytracingSphereShaderMaterial.uniforms.showSphere.value;
			showSphereControl.name( showSphere2String() );
		},
		resonatorType: function() {
			resonatorType = (resonatorType + 1) % 4;
			resonatorTypeControl.name( resonatorType2String() );
			enableDisableResonatorControls();
			if(resonatorType == 3) {
				// Penrose cavity
				zMirrorZ1OP = Math.max(1, zMirrorZ1OP);
				zMirrorZ2OP = Math.max(1, zMirrorZ2OP);
				opz0Control.setValue( zMirrorZ1OP );
				opz1Control.setValue( zMirrorZ2OP );
			}
			// createGUI();
			// opz0Control.disable( resonatorType == 0 );
			// opz1Control.disable( resonatorType == 0 );
			// z0Control.disable( resonatorType == 0 );
			// z1Control.disable( resonatorType == 0 );
		},
		// optical powers
		opx1: xMirrorX1OP,
		opx2: xMirrorX2OP,
		opz1: zMirrorZ1OP,
		opz2: zMirrorZ2OP,
		x1: x1,
		x2: x2,
		z1: z1,
		z2: z2,
		resonatorY: resonatorY,
		cylindricalLenses: function() {
			raytracingSphereShaderMaterial.uniforms.cylindricalLenses.value = !raytracingSphereShaderMaterial.uniforms.cylindricalLenses.value;
			cylindricalLensesControl.name( cylindricalLenses2String() );
		},
		reflectionCoefficient9s: -Math.log10(1-raytracingSphereShaderMaterial.uniforms.reflectionCoefficient.value),
		makeEyeLevel: function() { resonatorY = camera.position.y; resonatorYControl.setValue(resonatorY); }
		// meshRotX: meshRotationX,
		// meshRotY: meshRotationY,
		// meshRotZ: meshRotationZ
	}

	gui.add( GUIParams, 'noOfReflections', 0, 200, 1 ).name( "#reflections" ).onChange( (r) => {raytracingSphereShaderMaterial.uniforms.maxTraceLevel.value = r + 2; } );
	resonatorTypeControl = gui.add( GUIParams, 'resonatorType' ).name( resonatorType2String() );
	gui.add( GUIParams, 'opx1', -10, 10, 0.001 ).name( "OP<sub><i>x</i>,1</sub>" ).onChange( (o) => { xMirrorX1OP = o; } );
	gui.add( GUIParams, 'opx2', -10, 10, 0.001 ).name( "OP<sub><i>x</i>,2</sub>" ).onChange( (o) => { xMirrorX2OP = o; } );
	// if(resonatorType != 0) {
		opz0Control = gui.add( GUIParams, 'opz1', -10, 10, 0.001 ).name( "OP<sub><i>z</i>,1</sub>" ).onChange( (o) => { zMirrorZ1OP = o; } );
		opz1Control = gui.add( GUIParams, 'opz2', -10, 10, 0.001 ).name( "OP<sub><i>z</i>,2</sub>" ).onChange( (o) => { zMirrorZ2OP = o; } );
	// }

	// gui.add( GUIParams, 'x0', -10, -0.1, 0.001 ).name( "<i>x</i><sub>0</sub>" ).onChange( (x) => { xMirrorsX[0] = x; xMirrorsP[0].x = x; for(let i=0; i<mirrorsN2; i++) zMirrorsX1[i] = x; } );
	// gui.add( GUIParams, 'x1',  0.1,  10, 0.001 ).name( "<i>x</i><sub>1</sub>" ).onChange( (x) => { xMirrorsX[1] = x; xMirrorsP[1].x = x; for(let i=0; i<mirrorsN2; i++) zMirrorsX2[i] = x; } );
	// gui.add( GUIParams, 'z0', -10, -0.1, 0.001 ).name( "<i>z</i><sub>0</sub>" ).onChange( (z) => { zMirrorsZ[0] = z; zMirrorsP[0].z = z; for(let i=0; i<mirrorsN2; i++) xMirrorsZ1[i] = z; } );
	// gui.add( GUIParams, 'z1',  0.1,  10, 0.001 ).name( "<i>z</i><sub>1</sub>" ).onChange( (z) => { zMirrorsZ[1] = z; zMirrorsP[1].z = z; for(let i=0; i<mirrorsN2; i++) xMirrorsZ2[i] = z; } );
	gui.add( GUIParams, 'x1', -10, -0.1, 0.001 ).name( "<i>x</i><sub>1</sub>" ).onChange( (x) => { x1 = x; } );
	gui.add( GUIParams, 'x2',  0.1,  10, 0.001 ).name( "<i>x</i><sub>2</sub>" ).onChange( (x) => { x2 = x; } );
	z0Control = gui.add( GUIParams, 'z1', -10, -0.1, 0.001 ).name( "<i>z</i><sub>1</sub>" ).onChange( (z) => { z1 = z; } );
	z1Control = gui.add( GUIParams, 'z2',  0.1,  10, 0.001 ).name( "<i>z</i><sub>2</sub>" ).onChange( (z) => { z2 = z; } );

	resonatorYControl = gui.add( GUIParams, 'resonatorY',  0, 3, 0.001).name( "<i>y</i><sub>resonator</sub>" ).onChange( (y) => { resonatorY = y; } );
	gui.add( GUIParams, 'makeEyeLevel' ).name( 'Move resonator to eye level' );
	gui.add( GUIParams, 'reflectionCoefficient9s', 0, 3, 0.1 ).name( "-log<sub>10</sub>(1-<i>R</i>)" ).onChange( (l) => { raytracingSphereShaderMaterial.uniforms.reflectionCoefficient.value = 1-Math.pow(10, -l); } );
	cylindricalLensesControl = gui.add( GUIParams, 'cylindricalLenses' ).name( cylindricalLenses2String() );

	gui.add( GUIParams, 'sphereCentreX', -5, 5 ).name( "<i>x</i><sub>sphere</sub>" ).onChange( (x) => { sphereCentre.x = x; } );
	gui.add( GUIParams, 'sphereCentreY',  0, 5 ).name( "<i>y</i><sub>sphere</sub>" ).onChange( (y) => { sphereCentre.y = y; } );
	gui.add( GUIParams, 'sphereCentreZ', -5, 5 ).name( "<i>z</i><sub>sphere</sub>" ).onChange( (z) => { sphereCentre.z = z; } );
	gui.add( GUIParams, 'sphereRadius',   0, 1 ).name( "<i>r</i><sub>sphere</sub>" ).onChange( (r) => { raytracingSphereShaderMaterial.uniforms.sphereRadius.value = r; } );
	showSphereControl = gui.add( GUIParams, 'showSphere' ).name( showSphere2String() );

	// gui.add( GUIParams, 'meshRotX', -Math.PI, Math.PI ).name('Rot x').onChange( (a) => { meshRotationX = a; })
	// gui.add( GUIParams, 'meshRotY', -Math.PI, Math.PI ).name('Rot y').onChange( (a) => { meshRotationY = a; })
	// gui.add( GUIParams, 'meshRotZ', -Math.PI, Math.PI ).name('Rot z').onChange( (a) => { meshRotationZ = a; })

	// const folderVirtualCamera = gui.addFolder( 'Virtual camera' );
	gui.add( GUIParams, 'Horiz. FOV (&deg;)', 1, 170, 1).onChange( setScreenFOV );
	gui.add( GUIParams, 'Aperture radius', 0.0, 1.0, 0.01).onChange( (r) => { apertureRadius = r; } );
	// autofocusControl = gui.add( GUIParams, 'autofocus' ).name( 'Autofocus: ' + (autofocus?'On':'Off') );
	// gui.add( GUIParams, 'Autofocus' ).onChange( (b) => { autofocus = b; focusDistanceControl.disable(autofocus); } );
	focusDistanceControl = gui.add( GUIParams, 'tan<sup>-1</sup>(focus. dist.)', 
		//Math.atan(0.1), 
		0.01,	// -0.5*Math.PI,	// allow only positive focussing distances
		0.5*Math.PI,
		0.0001
	).onChange( (a) => { atanFocusDistance = a; } );
	focusDistanceControl.disable(autofocus);
	// focusDistanceControl = gui.add( GUIParams, 'tan<sup>-1</sup>(focus. dist.)', 
	// 	//Math.atan(0.1), 
	// 	-0.5*Math.PI,
	// 	0.5*Math.PI,
	// 	0.001
	// ).onChange( (a) => { atanFocusDistance = a; } );
	// folderVirtualCamera.add( atanFocusDistance, 'atan focus dist', -0.5*Math.PI, +0.5*Math.PI ).listen();
	gui.add( GUIParams, 'No of rays', 1, 100, 1).onChange( (n) => { noOfRays = n; } );
	gui.add( GUIParams, 'Point forward (in -<b>z</b> direction)' );
	backgroundControl = gui.add( GUIParams, 'background' ).name( background2String() );

	if(renderer.xr.enabled) {
		vrControlsVisibleControl = gui.add( GUIParams, 'vrControlsVisible' );
	}
	// folderVirtualCamera.close();

	// const folderSettings = gui.addFolder( 'Other controls' );
	// // folderSettings.add( params, 'Video feed forward' ).onChange( (b) => { raytracingSphereShaderMaterial.uniforms.keepVideoFeedForward.value = b; } );
	// // folderSettings.add( params, 'Lenslet type', { 'Ideal thin': true, 'Phase hologram': false } ).onChange( (t) => { raytracingSphereShaderMaterial.uniforms.idealLenses.value = t; });
	// // folderSettings.add( params, 'Ideal lenses').onChange( (b) => { raytracingSphereShaderMaterial.uniforms.idealLenses.value = b; } );
	// folderSettings.add( params, 'Show/hide info');
	// folderSettings.close();

	// enableDisableResonatorControls();

	// create the GUI mesh at the end to make sure that it includes all controls
	GUIMesh = new HTMLMesh( gui.domElement );
	GUIMesh.visible = false;
	vrControlsVisibleControl.name( guiMeshVisible2String() );	// this can be called only after GUIMesh has been created

	enableDisableResonatorControls();
}

function enableDisableResonatorControls() {
	// opz0Control.disable( (resonatorType == 1) || (resonatorType == 0) );
	// opz1Control.disable( (resonatorType == 1) || (resonatorType == 0) );
	// z0Control.disable( resonatorType == 0 );
	// z1Control.disable( resonatorType == 0 );
}

function background2String() {
	switch (background) { 
	case 0: return 'Glasgow University, West Quadrangle';	// '360-180 Glasgow University - Western Square.jpg'	// https://www.flickr.com/photos/pano_philou/1041580126
	case 1: return 'Glasgow University, East Quadrangle';	// '360-180 Glasgow University - Eastern Square.jpg'	// https://www.flickr.com/photos/pano_philou/1141564032
	case 2: return 'Mugdock';	// 'Mugdock Woods 6 Milngavie Scotland Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/3485817556
	case 3: return 'Mugdock bluebells';	// 'Bluebells_13_Mugdock_Woods_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889830418
	case 4: return 'Glencoe';	// '360-180 The Glencoe Pass And The Three Sisters.jpg'	// https://www.flickr.com/photos/pano_philou/1140758031
	default: return 'Undefined';		
		// 'Tower_University_Glasgow_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49890100126
		// 'Saddle_05_Arran_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889356918
	}
}

function getBackgroundInfo() {
	switch (background) { 
		case 0: return '<a href="https://www.flickr.com/photos/pano_philou/1041580126"><i>360-180 Glasgow University - Western Square</i></a> by pano_philou';	// https://www.flickr.com/photos/pano_philou/1041580126
		case 1: return '<a href="https://www.flickr.com/photos/pano_philou/1141564032"><i>360-180 Glasgow University - Eastern Square</i></a> by pano_philou';	// 
		case 2: return '<a href="https://www.flickr.com/photos/gawthrop/3485817556"><i>Mugdock Woods 6 Milngavie Scotland Equirectangular</i></a> by Peter Gawthrop';	// https://www.flickr.com/photos/gawthrop/3485817556
		case 3: return '<a href="https://www.flickr.com/photos/gawthrop/49889830418"><i>Bluebells_13_Mugdock_Woods_Scotland-Equirectangular</i></a> by Peter Gawthrop';	// 
		case 4: return '<a href="https://www.flickr.com/photos/pano_philou/1140758031"><i>360-180 The Glencoe Pass And The Three Sisters</i></a> by pano_philou';	// https://www.flickr.com/photos/pano_philou/1140758031
		default: return 'Undefined';		
			// 'Tower_University_Glasgow_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49890100126
			// 'Saddle_05_Arran_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889356918
		}
	
}

function resonatorType2String() {
	switch(resonatorType) {
		case 0: return 'No resonator';
		case 1: return 'Canonical resonator';
		case 2: return 'Crossed canonical resonators';
		case 3: return 'Penrose cavity';
		default: return 'Undefined';
	}
}

function cylindricalLenses2String() {
	return (raytracingSphereShaderMaterial.uniforms.cylindricalLenses.value?'Cylindrical lenses':'Spherical lenses');
}

function showSphere2String() {
	return (raytracingSphereShaderMaterial.uniforms.showSphere.value?'Sphere shown':'Sphere hidden');
}

function guiMeshVisible2String() {
	return 'VR controls '+(GUIMesh.visible?'visible':'hidden');
}

function initMirrors() {
	xMirrorsN = 2;
	// initialise all the elements to default values
	xMirrorsX = [];	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
	xMirrorsY1 = [];	// {y1[0], y1[1], ...}
	xMirrorsY2 = [];	// {y2[0], y2[1], ...}
	xMirrorsZ1 = [];	// {z1[0], z1[1], ...}
	xMirrorsZ2 = [];	// {z2[0], z2[1], ...}
	xMirrorsP = [];	// principal points
	xMirrorsOP = [];	// optical powers
	for(let i=0; i<mirrorsN2; i++) {
		xMirrorsX.push(0.0);
		xMirrorsY1.push(y1+resonatorY);
		xMirrorsY2.push(y2+resonatorY);
		xMirrorsZ1.push(z1);
		xMirrorsZ2.push(z2);
		xMirrorsP.push(new THREE.Vector3(0., resonatorY, 0.));
		xMirrorsOP.push(-1.);
	}
	// set the actual values where those differ from the default ones
	xMirrorsX[0] = x1; xMirrorsP[0].x = x1;
	// xMirrorsX[1] = 0.2; xMirrorsP[1].x = 0.2; xMirrorsY2[1] = 2; xMirrorsZ2[1] = 0;
	xMirrorsX[1] = x2; xMirrorsP[1].x = x2;

	yMirrorsN = 0;
	// initialise all the elements to default values
	yMirrorsY = [];	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
	yMirrorsX1 = [];	// {x1[0], x1[1], ...}
	yMirrorsX2 = [];	// {x2[0], x2[1], ...}
	yMirrorsZ1 = [];	// {z1[0], z1[1], ...}
	yMirrorsZ2 = [];	// {z2[0], z2[1], ...}
	yMirrorsP = [];	// principal points
	yMirrorsOP = [];	// optical powers
	for(let i=0; i<mirrorsN2; i++) {
		yMirrorsY.push(0.0);
		yMirrorsX1.push(x1);
		yMirrorsX2.push(x2);
		yMirrorsZ1.push(z1);
		yMirrorsZ2.push(z2);
		yMirrorsP.push(new THREE.Vector3(0., resonatorY, 0.));
		yMirrorsOP.push(0.);
	}
	// set the actual values where those differ from the default ones
	yMirrorsY[0] = y1+resonatorY; yMirrorsP[0].y = y1+resonatorY;
	yMirrorsY[1] = y2+resonatorY; yMirrorsP[1].y = y2+resonatorY;

	zMirrorsN = 2;
	// initialise all the elements to default values
	zMirrorsZ = [];	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
	zMirrorsX1 = [];	// {x1[0], x1[1], ...}
	zMirrorsX2 = [];	// {x2[0], x2[1], ...}
	zMirrorsY1 = [];	// {y1[0], y1[1], ...}
	zMirrorsY2 = [];	// {y2[0], y2[1], ...}
	zMirrorsP = [];	// principal points
	zMirrorsOP = [];	// optical powers
	for(let i=0; i<mirrorsN2; i++) {
		zMirrorsZ.push(0.0);
		zMirrorsX1.push(x1);
		zMirrorsX2.push(x2);
		zMirrorsY1.push(y1+resonatorY);
		zMirrorsY2.push(y2+resonatorY);
		zMirrorsP.push(new THREE.Vector3(0., resonatorY, 0.));
		zMirrorsOP.push(0.1);
	}
	// set the actual values where those differ from the default ones
	zMirrorsZ[0] = z1; zMirrorsP[0].z = z1;
	zMirrorsZ[1] = z2; zMirrorsP[1].z = z2;
}

function addXRInteractivity() {
	// see https://github.com/mrdoob/three.js/blob/master/examples/webxr_vr_sandbox.html

	// the two hand controllers

	const geometry = new THREE.BufferGeometry();
	geometry.setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 5 ) ] );

	const controller1 = renderer.xr.getController( 0 );
	controller1.add( new THREE.Line( geometry ) );
	scene.add( controller1 );

	const controller2 = renderer.xr.getController( 1 );
	controller2.add( new THREE.Line( geometry ) );
	scene.add( controller2 );

	//

	const controllerModelFactory = new XRControllerModelFactory();

	const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
	controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
	scene.add( controllerGrip1 );

	const controllerGrip2 = renderer.xr.getControllerGrip( 1 );
	controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
	scene.add( controllerGrip2 );

	//

	const group = new InteractiveGroup( renderer, camera );
	group.listenToPointerEvents( renderer, camera );
	group.listenToXRControllerEvents( controller1 );
	group.listenToXRControllerEvents( controller2 );
	scene.add( group );

	// place this below the resonator
	// GUIMesh = new HTMLMesh( gui.domElement );
	GUIMesh.position.x = 0;
	GUIMesh.position.y = resonatorY - 1.5;
	GUIMesh.position.z = -0.4;
	GUIMesh.rotation.x = -Math.PI/4;
	GUIMesh.scale.setScalar( 2 );
	group.add( GUIMesh );	
}

function createVideoFeeds() {
	// create the video stream for the user-facing camera first, as some devices (such as my iPad), which have both cameras,
	// but can (for whatever reason) only have a video feed from one at a time, seem to go with the video stream that was
	// created last, and as the standard view is looking "forward" it is preferable to see the environment-facing camera.
	videoFeedU = document.getElementById( 'videoFeedU' );

	// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video_webcam.html
	if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
		// user-facing camera
		const constraintsU = { video: { 
			// 'deviceId': cameraId,	// this could be the device ID selected 
			width: {ideal: 1280},	// {ideal: 10000}, 
			// height: {ideal: 10000}, 
			facingMode: {ideal: 'user'}
			// aspectRatio: { exact: width / height }
		} };
		navigator.mediaDevices.getUserMedia( constraintsU ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoFeedU.srcObject = stream;
			videoFeedU.play();

			videoFeedU.addEventListener("playing", () => {
				aspectRatioVideoFeedU = videoFeedU.videoWidth / videoFeedU.videoHeight;
				updateUniforms();
				postStatus(`User-facing(?) camera resolution ${videoFeedU.videoWidth} &times; ${videoFeedU.videoHeight}`);
			});
		} ).catch( function ( error ) {
			postStatus(`Unable to access user-facing camera/webcam (Error: ${error})`);
		} );
	} else {
		postStatus( 'MediaDevices interface, which is required for video streams from device cameras, not available.' );
	}

	videoFeedE = document.getElementById( 'videoFeedE' );

	// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video_webcam.html
	if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
		// environment-facing camera
		const constraintsE = { video: { 
			// 'deviceId': cameraId,	// this could be the device ID selected 
			width: {ideal: 1280},	// {ideal: 10000}, 
			// height: {ideal: 10000}, 
			facingMode: {ideal: 'environment'}
			// aspectRatio: { exact: width / height }
		} };
		navigator.mediaDevices.getUserMedia( constraintsE ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoFeedE.srcObject = stream;
			videoFeedE.play();

			videoFeedE.addEventListener("playing", () => {
				aspectRatioVideoFeedE = videoFeedE.videoWidth / videoFeedE.videoHeight;
				updateUniforms();
				postStatus(`Environment-facing(?) camera resolution ${videoFeedE.videoWidth} &times; ${videoFeedE.videoHeight}`);
			});
		} ).catch( function ( error ) {
			postStatus(`Unable to access environment-facing camera/webcam (Error: ${error})`);
		} );
	} else {
		postStatus( 'MediaDevices interface, which is required for video streams from device cameras, not available.' );
	}
}

function loadBackgroundImage() {
	const textureLoader = new THREE.TextureLoader();
	// textureLoader.crossOrigin = "Anonymous";

	let filename;
	switch (background) { 
		case 1: 
			filename = '360-180 Glasgow University - Eastern Square.jpg';	// https://www.flickr.com/photos/pano_philou/1141564032
			break;
		case 2: 
			filename = 'Mugdock Woods 6 Milngavie Scotland Equirectangular.jpg';	// https://www.flickr.com/photos/gawthrop/3485817556
			break;
		case 3: 
			filename = 'Bluebells_13_Mugdock_Woods_Scotland-Equirectangular.jpg';	// https://www.flickr.com/photos/gawthrop/49889830418
			break;
		case 4: 
			filename = '360-180 The Glencoe Pass And The Three Sisters.jpg';	// https://www.flickr.com/photos/pano_philou/1140758031
			break;
		case 0: 
		default:
			filename = '360-180 Glasgow University - Western Square.jpg';	// https://www.flickr.com/photos/pano_philou/1041580126
			// 'Tower_University_Glasgow_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49890100126
			// 'Saddle_05_Arran_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889356918
		}

	backgroundTexture = textureLoader.load(filename);
}

function addEventListenersEtc() {
	// handle device orientation
	// window.addEventListener("deviceorientation", handleOrientation, true);
	
	// handle window resize
	window.addEventListener("resize", onWindowResize, false);

	// handle screen-orientation (landscape/portrait) change
	screen.orientation.addEventListener( "change", recreateVideoFeeds );

	// share button functionality
	document.getElementById('takePhotoButton').addEventListener('click', takePhoto);

	// toggle fullscreen button functionality
	document.getElementById('fullscreenButton').addEventListener('click', toggleFullscreen);

	// info button functionality
	document.getElementById('infoButton').addEventListener('click', toggleInfoVisibility);

	// back button functionality
	document.getElementById('backButton').addEventListener('click', showLivePhoto);
	document.getElementById('backButton').style.visibility = "hidden";

	// share button
	document.getElementById('shareButton').addEventListener('click', share);
	document.getElementById('shareButton').style.visibility = "hidden";
	if(!(navigator.share)) document.getElementById('shareButton').src="./shareButtonUnavailable.png";
	// if(!(navigator.share)) document.getElementById('shareButton').style.opacity = 0.3;

	// delete button
	document.getElementById('deleteButton').addEventListener('click', deleteStoredPhoto);
	document.getElementById('deleteButton').style.visibility = "hidden";

	// hide the thumbnail for the moment
	document.getElementById('storedPhotoThumbnail').addEventListener('click', showStoredPhoto);
	document.getElementById('storedPhotoThumbnail').style.visibility = "hidden";
	document.getElementById('storedPhoto').addEventListener('click', showLivePhoto);
	document.getElementById('storedPhoto').style.visibility = "hidden";
	// showingStoredPhoto = false;
}

/**
 * @param {*} fov	The larger of the camera's horizontal and vertical FOV, in degrees
 * 
 * Set the larger FOV of the screen/window to fov.
 * 
 * Depending on the screen/window's FOV, fov is either the horizontal fov (if screen width > screen height)
 * or the vertical fov (if screen width < screen height).
 */
function setScreenFOV(fov) {
	fovScreen = fov;

	screenChanged();
}

/** 
 * Reset the aspect ratio and FOV of the virtual cameras.
 * 
 * Call if the window size has changed (which also happens when the screen orientation changes)
 * or if camera's FOV has changed
 */
function screenChanged() {
	// alert(`new window size ${window.innerWidth} x ${window.innerHeight}`);

	// in case the screen size has changed
	if(renderer) renderer.setSize(window.innerWidth, window.innerHeight);

	// if the screen orientation changes, width and height swap places, so the aspect ratio changes
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	camera.aspect = windowAspectRatio;

	// fovS is the screen's horizontal or vertical FOV, whichever is greater;
	// re-calculate the camera FOV, which is the *vertical* fov
	let verticalFOV;
	if(windowAspectRatio > 1.0) {
		// fovS is horizontal FOV; convert to get correct vertical FOV
		verticalFOV = 2.0*Math.atan(Math.tan(0.5*fovScreen*Math.PI/180.0)/windowAspectRatio)*180.0/Math.PI;
	} else {
		// fovS is already vertical FOV
		verticalFOV = fovScreen;
	}
	camera.fov = verticalFOV;

	// make sure the camera changes take effect
	camera.updateProjectionMatrix();
}

function  pointForward() {
	let r = camera.position.length();
	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = r;
	orbitControls.update();
	postStatus('Pointing camera forwards (in -<b>z</b> direction)');
}

function onWindowResize() {
	screenChanged();
	postStatus(`window size ${window.innerWidth} &times; ${window.innerHeight}`);	// debug
}

// // see https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/change_event
function recreateVideoFeeds() {
	// stop current video streams...
	videoFeedE.srcObject.getTracks().forEach(function(track) { track.stop(); });
	videoFeedU.srcObject.getTracks().forEach(function(track) { track.stop(); });

	// ... and re-create new ones, hopefully of the appropriate size
	createVideoFeeds();
}

function addOrbitControls() {
	// controls

	orbitControls = new OrbitControls( camera, renderer.domElement );
	// controls = new OrbitControls( cameraOutside, renderer.domElement );
	orbitControls.listenToKeyEvents( window ); // optional

	//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
	orbitControls.addEventListener( 'change', cameraPositionChanged );

	orbitControls.enableDamping = false; // an animation loop is required when either damping or auto-rotation are enabled
	orbitControls.dampingFactor = 0.05;

	orbitControls.enablePan = true;
	orbitControls.enableZoom = true;

	orbitControls.maxPolarAngle = Math.PI;
}

function addDragControls() {
	let objects = [];
	objects.push(GUIMesh);

	dragControls = new DragControls( objects, camera, renderer.domElement );

	// add event listener to highlight dragged objects
	dragControls.addEventListener( 'dragstart', function ( event ) {
		event.object.material.emissive.set( 0xaaaaaa );
	} );

	dragControls.addEventListener( 'dragend', function ( event ) {
		event.object.material.emissive.set( 0x000000 );
	} );
}

function cameraPositionChanged() {
	postStatus(`Camera position (${camera.position.x.toPrecision(2)}, ${camera.position.y.toPrecision(2)}, ${camera.position.z.toPrecision(2)})`);
	// counter = 0;
	// keep the raytracing sphere centred on the camera position
	// raytracingSphere.position.copy(camera.position.clone());	// TODO this doesn't seem to work as intended!?
}

async function toggleFullscreen() {
	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen().catch((err) => {
			postStatus(
				`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
			);
		});
		// allow screen orientation changes
		// screen.orientation.unlock();
	} else {
		document.exitFullscreen();
	}
}

function showStoredPhoto() {
	gui.hide();
	renderer.domElement.style.visibility = "hidden";
	document.getElementById('takePhotoButton').style.visibility = "hidden";
	// document.getElementById('changePositionButton').style.visibility = "hidden";
	document.getElementById('storedPhotoThumbnail').style.visibility = "hidden";
	document.getElementById('backButton').style.visibility = "visible";
	document.getElementById('shareButton').style.visibility = "visible";
	document.getElementById('deleteButton').style.visibility = "visible";
	document.getElementById('storedPhoto').style.visibility = "visible";
	showingStoredPhoto = true;

	postStatus('Showing stored photo, '+storedPhotoDescription);
}

function showLivePhoto() {
	gui.show();
	renderer.domElement.style.visibility = "visible";
	document.getElementById('takePhotoButton').style.visibility = "visible";
	// document.getElementById('changePositionButton').style.visibility = "visible";
	if(storedPhoto) document.getElementById('storedPhotoThumbnail').style.visibility = "visible";
	document.getElementById('backButton').style.visibility = "hidden";
	document.getElementById('shareButton').style.visibility = "hidden";
	document.getElementById('deleteButton').style.visibility = "hidden";
	document.getElementById('storedPhoto').style.visibility = "hidden";
	showingStoredPhoto = false;

	postStatus('Showing live image');
}

function deleteStoredPhoto() {
	storedPhoto = null;

	showLivePhoto();

	postStatus('Stored photo deleted; showing live image');
}

function takePhoto() {
	try {
		click.play();

		storedPhoto = renderer.domElement.toDataURL('image/png');
		storedPhotoInfoString = getInfoString();

		storedPhotoDescription = `${appName}`;
		// 
		document.getElementById('storedPhoto').src=storedPhoto;
		document.getElementById('storedPhotoThumbnail').src=storedPhoto;
		document.getElementById('storedPhotoThumbnail').style.visibility = "visible";
	
		postStatus('Photo taken; click thumbnail to view and share');
	} catch (error) {
		console.error('Error:', error);
	}	
}

async function share() {
	try {
		fetch(storedPhoto)
		.then(response => response.blob())
		.then(blob => {
			const file = new File([blob], storedPhotoDescription+'.png', { type: blob.type });

			// Use the Web Share API to share the screenshot
			if (navigator.share) {
				navigator.share({
					title: storedPhotoDescription,
					text: storedPhotoInfoString,
					files: [file],
				});
			} else {
				postStatus('Sharing is not supported by this browser.');
			}	
		})
		.catch(error => {
			console.error('Error:', error);
			postStatus(`Error: ${error}`);
		});
	} catch (error) {
		console.error('Error:', error);
	}
}

/** 
 * Add a text field to the bottom left corner of the screen
 */
function createStatus() {
	status = document.getElementById('status');
	postStatus(`${appName} welcomes you!`);
}

function postStatus(text) {
	status.innerHTML = '&nbsp;'+text;
	console.log('status: '+text);

	// show the text only for 3 seconds
	statusTime = new Date().getTime();
	setTimeout( () => { if(new Date().getTime() - statusTime > 2999) status.innerHTML = '&nbsp;'+appName+', University of Glasgow, <a href="https://github.com/jkcuk/'+appName+'">https://github.com/jkcuk/'+appName+'</a>' }, 3000);
}

function getInfoString() {
	return '<h4>Resonator</h4>\n' +
		`Resonator type = ${resonatorType2String()}, ${cylindricalLenses2String()}<br>\n` +
		`OP<sub><i>x</i>,1</sub> = ${xMirrorX1OP.toPrecision(4)}, <i>f</i><sub><i>x</i>,1</sub> = ${(1/xMirrorX1OP).toPrecision(4)}<br>\n` +
		`OP<sub><i>x</i>,2</sub> = ${xMirrorX2OP.toPrecision(4)}, <i>f</i><sub><i>x</i>,2</sub> = ${(1/xMirrorX2OP).toPrecision(4)}<br>\n` +
		`OP<sub><i>z</i>,1</sub> = ${zMirrorZ1OP.toPrecision(4)}, <i>f</i><sub><i>z</i>,1</sub> = ${(1/zMirrorZ1OP).toPrecision(4)}<br>\n` +
		`OP<sub><i>z</i>,2</sub> = ${zMirrorZ2OP.toPrecision(4)}, <i>f</i><sub><i>z</i>,2</sub> = ${(1/zMirrorZ2OP).toPrecision(4)}<br>\n` +
		`<i>x</i><sub>1</sub> = ${x1.toPrecision(4)}<br>\n` +
		`<i>x</i><sub>2</sub> = ${x2.toPrecision(4)}<br>\n` +
		`<i>z</i><sub>1</sub> = ${z1.toPrecision(4)}<br>\n` +
		`<i>z</i><sub>2</sub> = ${z2.toPrecision(4)}<br>\n` +
		`<i>y</i><sub>resonator</sub> = ${resonatorY}<br>\n` +
		`Reflection coefficient = ${raytracingSphereShaderMaterial.uniforms.reflectionCoefficient.value.toPrecision(4)}<br>\n` +
		`Max. number of reflections = ${raytracingSphereShaderMaterial.uniforms.maxTraceLevel.value - 2}<br>\n` +
		`<h4>Red sphere</h4>\n` +
		`${showSphere2String()}<br>\n` +
		`Centre = (${sphereCentre.x.toPrecision(4)}, ${sphereCentre.y.toPrecision(4)}, ${sphereCentre.z.toPrecision(4)})<br>\n` +
		`<h4>Virtual camera<h4>\n` +
		`Position = (${camera.position.x.toPrecision(4)}, ${camera.position.y.toPrecision(4)}, ${camera.position.z.toPrecision(4)})<br>\n` +
		`Horiz. FOV = ${fovScreen.toPrecision(4)}<br>\n` +
		`Aperture radius = ${apertureRadius.toPrecision(4)}<br>\n` +
		`Focussing distance = ${Math.tan(atanFocusDistance).toPrecision(4)}<br>\n` +
		`Number of rays = ${noOfRays}\n` +
		`<h4>Stored photo</h4>\n` +
		`Description/name = ${storedPhotoDescription}\n` +
		'<h4>Background image information</h4>\n' +
		getBackgroundInfo() + '<br>\n' +
		// '<a href="https://www.flickr.com/photos/pano_philou/1041580126">"360-180 Glasgow University - Western Square"</a> by pano_philou<br>\n' +
		'License: <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/">CC BY-NC-SA 2.0 DEED</a><br>\n' +
		// `<h4>${appName}</h4>\n` +
		`<br>${appName} (University of Glasgow, <a href="https://github.com/jkcuk/${appName}">https://github.com/jkcuk/${appName}</a>) is ${appDescription}.`
		;
}

function refreshInfo() {
	if(showingStoredPhoto) setInfo( storedPhotoInfoString );
	else setInfo( getInfoString() );

	if(info.style.visibility == "visible") setTimeout( refreshInfo , 100);	// refresh again a while
}

/** 
 * Add a text field to the top left corner of the screen
 */
function createInfo() {
	info = document.getElementById('info');
	info.innerHTML = "-- nothing to show (yet) --";
}

function setInfo(text) {
	info.innerHTML = text;
	// console.log('info: '+text);
}

function toggleInfoVisibility() {
	switch(info.style.visibility) {
		case "visible":
			info.style.visibility = "hidden";
			break;
		case "hidden":
		default:
			info.style.visibility = "visible";
			refreshInfo();
	}
}