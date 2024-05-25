
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
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let name = 'Resona-THOR';

let scene;
let renderer;
let textureGU;
let camera;
let controls;
let raytracingSphere;
let raytracingSphereShaderMaterial;

let mirrorsNMax = 4;	// max number of mirrors in each array

let xMirrorsN;
let xMirrorsX;	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
let xMirrorsYMin;	// {yMin[0], yMin[1], ...}
let xMirrorsYMax;	// {yMax[0], yMax[1], ...}
let xMirrorsZMin;	// {zMin[0], zMin[1], ...}
let xMirrorsZMax;	// {zMax[0], zMax[1], ...}
let xMirrorsP;	// {P[0], P[1], ...} Principal points
let xMirrorsOP;	// {op[0], op[1], ...} optical powers

let yMirrorsN;
let yMirrorsY;	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
let yMirrorsXMin;	// {xMin[0], xMin[1], ...}
let yMirrorsXMax;	// {xMax[0], xMax[1], ...}
let yMirrorsZMin;	// {zMin[0], zMin[1], ...}
let yMirrorsZMax;	// {zMax[0], zMax[1], ...}
let yMirrorsP;	// {P[0], P[1], ...} Principal points
let yMirrorsOP;	// {op[0], op[1], ...} optical powers

let zMirrorsN;
let zMirrorsZ;	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
let zMirrorsXMin;	// {xMin[0], xMin[1], ...}
let zMirrorsXMax;	// {xMax[0], xMax[1], ...}
let zMirrorsYMin;	// {yMin[0], yMin[1], ...}
let zMirrorsYMax;	// {yMax[0], yMax[1], ...}
let zMirrorsP;	// {P[0], P[1], ...} Principal points
let zMirrorsOP;	// {op[0], op[1], ...} optical powers

let xMin = -.5;
let xMax = 0.5;
let yMin = -.5;
let yMax = 0.5;
let zMin = -.5;
let zMax = 0.5;

// lift the resonator up to eye level (in case of VR only)
let resonatorY = 1.5;
	
let fovScreen = 68;

let raytracingSphereRadius = 20.0;

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
let autofocusControl, focusDistanceControl;


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
	camera.position.z = 1;
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

	// check if VR is supported (see https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/isSessionSupported)...
	if (navigator.xr) {
		navigator.xr.isSessionSupported("immersive-vr").then((isSupported) => {
		  if (isSupported) {
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

	// two crossed canonical resonators
	xMirrorsN = 2;
	yMirrorsN = 0;
	zMirrorsN = 2;

	raytracingSphereShaderMaterial.uniforms.xMirrorsN.value = xMirrorsN;
	raytracingSphereShaderMaterial.uniforms.yMirrorsN.value = yMirrorsN;
	raytracingSphereShaderMaterial.uniforms.zMirrorsN.value = zMirrorsN;

	for(let i=0; i<xMirrorsN; i++) {
		xMirrorsYMin[i] = yMin+deltaY;
		xMirrorsYMax[i] = yMax+deltaY;
		xMirrorsZMin[i] = zMin;
		xMirrorsZMax[i] = zMax;
		xMirrorsP[i].y = deltaY;
	}
	xMirrorsX[0] = xMin; xMirrorsP[0].x = xMin;
	xMirrorsX[1] = xMax; xMirrorsP[1].x = xMax;

	for(let i=0; i<zMirrorsN; i++) {
		zMirrorsYMin[i] = yMin+deltaY;
		zMirrorsYMax[i] = yMax+deltaY;
		zMirrorsXMin[i] = xMin;
		zMirrorsXMax[i] = xMax;
		zMirrorsP[i].y = deltaY;
	}
	zMirrorsZ[0] = zMin; zMirrorsP[0].z = zMin;
	zMirrorsZ[1] = zMax; zMirrorsP[1].z = zMax;
	
	// raytracingSphereShaderMaterial.uniforms.xMirrorsN.value = xMirrorsN;
	// raytracingSphereShaderMaterial.uniforms.xMirrorsX.value = xMirrorsX;	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
	// raytracingSphereShaderMaterial.uniforms.xMirrorsYMin.value = xMirrorsYMin;	// {yMin[0], yMin[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsYMax.value = xMirrorsYMax;	// {yMax[0], yMax[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsZMin.value = xMirrorsZMin;	// {zMin[0], zMin[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsZMax.value = xMirrorsZMax;	// {zMax[0], zMax[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsP.value = xMirrorsP;	// {P[0], P[1], ...}
	// raytracingSphereShaderMaterial.uniforms.xMirrorsOP.value = xMirrorsOP;	// {op[0], op[1], ...}

	// raytracingSphereShaderMaterial.uniforms.yMirrorsN.value = yMirrorsN;
	// raytracingSphereShaderMaterial.uniforms.yMirrorsY.value = yMirrorsY;	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
	// raytracingSphereShaderMaterial.uniforms.yMirrorsXMin.value = yMirrorsXMin;	// {xMin[0], xMin[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsXMax.value = yMirrorsXMax;	// {xMax[0], xMax[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsZMin.value = yMirrorsZMin;	// {zMin[0], zMin[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsZMax.value = yMirrorsZMax;	// {zMax[0], zMax[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsP.value = yMirrorsP;	// {P[0], P[1], ...}
	// raytracingSphereShaderMaterial.uniforms.yMirrorsOP.value = yMirrorsOP;	// {op[0], op[1], ...}

	// raytracingSphereShaderMaterial.uniforms.zMirrorsN.value = zMirrorsN;
	// raytracingSphereShaderMaterial.uniforms.zMirrorsZ.value = zMirrorsZ;	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
	// raytracingSphereShaderMaterial.uniforms.zMirrorsXMin.value = zMirrorsXMin;	// {xMin[0], xMin[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsXMax.value = zMirrorsXMax;	// {xMax[0], xMax[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsYMin.value = zMirrorsYMin;	// {yMin[0], yMin[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsYMax.value = zMirrorsYMax;	// {yMax[0], yMax[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsP.value = zMirrorsP;	// {P[0], P[1], ...}
	// raytracingSphereShaderMaterial.uniforms.zMirrorsOP.value = zMirrorsOP;	// {op[0], op[1], ...}

	raytracingSphereShaderMaterial.uniforms.backgroundTexture.value = textureGU;

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

	// let nMaxVectors = [];	// principal points
	// let nMaxFloats = [];
	// for(i=0; i<mirrorsNMax; i++) {
	// 	nMaxVectors.push(new THREE.Vector3(0., 0., 0.));
	// 	nMaxFloats.push(0.);
	// }

	// the sphere surrouning the camera in all directions
	const geometry = 
		new THREE.SphereGeometry( raytracingSphereRadius );
	raytracingSphereShaderMaterial = new THREE.ShaderMaterial({
		side: THREE.DoubleSide,
		// wireframe: true,
		uniforms: {
			// the set of mirrors in x planes
			maxTraceLevel: { value: 100 },
			xMirrorsN: { value: 0 },
			xMirrorsX: { value: xMirrorsX },	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
			xMirrorsYMin: { value: xMirrorsYMin },	// {yMin[0], yMin[1], ...}
			xMirrorsYMax: { value: xMirrorsYMax },	// {yMax[0], yMax[1], ...}
			xMirrorsZMin: { value: xMirrorsZMin },	// {zMin[0], zMin[1], ...}
			xMirrorsZMax: { value: xMirrorsZMax },	// {zMax[0], zMax[1], ...}
			xMirrorsP: { value: xMirrorsP },
			xMirrorsOP: { value: xMirrorsOP },
			// the set of mirrors in y planes
			yMirrorsN: { value: 0 },
			yMirrorsY: { value: yMirrorsY },	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
			yMirrorsXMin: { value: yMirrorsXMin },	// {xMin[0], xMin[1], ...}
			yMirrorsXMax: { value: yMirrorsXMax },	// {xMax[0], xMax[1], ...}
			yMirrorsZMin: { value: yMirrorsZMin },	// {zMin[0], zMin[1], ...}
			yMirrorsZMax: { value: yMirrorsZMax },	// {zMax[0], zMax[1], ...}
			yMirrorsP: { value: yMirrorsP },
			yMirrorsOP: { value: yMirrorsOP },
			// the set of mirrors in z planes
			zMirrorsN: { value: 0 },
			zMirrorsZ: { value: zMirrorsZ },	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
			zMirrorsXMin: { value: zMirrorsXMin },	// {xMin[0], xMin[1], ...}
			zMirrorsXMax: { value: zMirrorsXMax },	// {xMax[0], xMax[1], ...}
			zMirrorsYMin: { value: zMirrorsYMin },	// {yMin[0], yMin[1], ...}
			zMirrorsYMax: { value: zMirrorsYMax },	// {yMax[0], yMax[1], ...}
			zMirrorsP: { value: zMirrorsP },
			zMirrorsOP: { value: zMirrorsOP },
			backgroundTexture: { value: textureGU },
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
				intersectionPoint = position.xyz;
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

			const int mirrorsNMax = 4;

			// the set of mirrors in x planes
			uniform int xMirrorsN;	// number of x mirrors
			uniform float xMirrorsX[mirrorsNMax];	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
			uniform float xMirrorsYMin[mirrorsNMax];	// {yMin[0], yMin[1], ...}
			uniform float xMirrorsYMax[mirrorsNMax];	// {yMax[0], yMax[1], ...}
			uniform float xMirrorsZMin[mirrorsNMax];	// {zMin[0], zMin[1], ...}
			uniform float xMirrorsZMax[mirrorsNMax];	// {zMax[0], zMax[1], ...}
			uniform vec3 xMirrorsP[mirrorsNMax];
			uniform float xMirrorsOP[mirrorsNMax];

			// the set of mirrors in y planes
			uniform int yMirrorsN;	// number of x mirrors
			uniform float yMirrorsY[mirrorsNMax];	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
			uniform float yMirrorsXMin[mirrorsNMax];	// {xMin[0], xMin[1], ...}
			uniform float yMirrorsXMax[mirrorsNMax];	// {xMax[0], xMax[1], ...}
			uniform float yMirrorsZMin[mirrorsNMax];	// {zMin[0], zMin[1], ...}
			uniform float yMirrorsZMax[mirrorsNMax];	// {zMax[0], zMax[1], ...}
			uniform vec3 yMirrorsP[mirrorsNMax];
			uniform float yMirrorsOP[mirrorsNMax];

			// the set of mirrors in z planes
			uniform int zMirrorsN;	// number of z mirrors
			uniform float zMirrorsZ[mirrorsNMax];	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
			uniform float zMirrorsXMin[mirrorsNMax];	// {xMin[0], xMin[1], ...}
			uniform float zMirrorsXMax[mirrorsNMax];	// {xMax[0], xMax[1], ...}
			uniform float zMirrorsYMin[mirrorsNMax];	// {yMin[0], yMin[1], ...}
			uniform float zMirrorsYMax[mirrorsNMax];	// {yMax[0], yMax[1], ...}
			uniform vec3 zMirrorsP[mirrorsNMax];
			uniform float zMirrorsOP[mirrorsNMax];

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
			// TO SIMULATE A CYLINDRICAL LENS with (normalised) optical-power direction opdHat, set IP not to (I-P), but to
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
				return texture2D(backgroundTexture, vec2(phi/(2.*PI), 1.-theta/PI));
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
							(xMirrorsYMin[i] <= ip.y) &&
							(ip.y <= xMirrorsYMax[i]) &&
							(xMirrorsZMin[i] <= ip.z) &&
							(ip.z <= xMirrorsZMax[i])						
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
							(yMirrorsXMin[i] <= ip.x) &&
							(ip.x <= yMirrorsXMax[i]) &&
							(yMirrorsZMin[i] <= ip.z) &&
							(ip.z <= yMirrorsZMax[i])						
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
							(zMirrorsXMin[i] <= ip.x) &&
							(ip.x <= zMirrorsXMax[i]) &&					
							(zMirrorsYMin[i] <= ip.y) &&
							(ip.y <= zMirrorsYMax[i])
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
			// s: ray start point (will not be altered)
			// d: ray direction
			// intersectionPosition: initial value ignored; becomes the position of the intersection
			// intersectionDistance: initial value ignored; becomes the distance to the closest intersection point
			// intersectionPlaneIndex: initial value ignored; becomes the index of the z plane being intersected
			// intersectionPlaneSetIndex: 0/1/2 if the intersection is with the x/y/z planes 
			// returns true if an intersection has been found
			bool findNearestIntersectionWithMirrors(
				vec3 s, 
				vec3 d, 
				in int startIntersectionPlaneIndex,
				in int startIntersectionPlaneSetIndex,
				out vec3 intersectionPosition,
				out float intersectionDistance,
				out float mirrorOpticalPower,
				out vec3 mirrorPrincipalPoint,
				out vec3 mirrorNormalHat,
				out int intersectionPlaneIndex,
				out int intersectionPlaneSetIndex
			) {
				intersectionDistance = 1e20;	// this means there is no intersection, so far

				// create space for the current...
				vec3 ip;	// ... intersection point, ...
				float id;	// ... intersection distance, ...
				int ii;	// ... and intersection-plane index

				// is there an intersection with the x mirrors?
				if (findNearestIntersectionWithXMirrors(s, d, (startIntersectionPlaneSetIndex == 0)?startIntersectionPlaneIndex:-1, ip, id, ii)) {
					// yes, there is an intersection with the x mirrors
					intersectionPosition = ip;
					intersectionDistance = id;
					mirrorOpticalPower = xMirrorsOP[ii];
					mirrorPrincipalPoint = xMirrorsP[ii];
					mirrorNormalHat = xHat;
					intersectionPlaneIndex = ii;
					intersectionPlaneSetIndex = 0;	// x mirrors
				}

				// is there an intersection with the y mirrors?
				if (findNearestIntersectionWithYMirrors(s, d, (startIntersectionPlaneSetIndex == 1)?startIntersectionPlaneIndex:-1, ip, id, ii)) {
					// yes, there is an intersection with the y mirrors
					// if there either no intersection already, or, if there is one, is it closer than the closest intersection so far?
					if(id < intersectionDistance) {
						// the intersection with the y mirrors is the closest one so far
						intersectionPosition = ip;
						intersectionDistance = id;
						mirrorOpticalPower = yMirrorsOP[ii];
						mirrorPrincipalPoint = yMirrorsP[ii];
						mirrorNormalHat = yHat;
						intersectionPlaneIndex = ii;
						intersectionPlaneSetIndex = 1;	// y mirrors
					}
				}
				
				// is there an intersection with the z mirrors?
				if (findNearestIntersectionWithZMirrors(s, d, (startIntersectionPlaneSetIndex == 2)?startIntersectionPlaneIndex:-1, ip, id, ii)) {
					// yes, there is an intersection with the z mirrors
					// if there either no intersection already, or, if there is one, is it closer than the closest intersection so far?
					if(id < intersectionDistance) {
						// the intersection with the z mirrors is the closest one so far
						intersectionPosition = ip;
						intersectionDistance = id;
						mirrorOpticalPower = zMirrorsOP[ii];
						mirrorPrincipalPoint = zMirrorsP[ii];
						mirrorNormalHat = zHat;
						intersectionPlaneIndex = ii;
						intersectionPlaneSetIndex = 2;	// z mirrors
					}
				}

				// // is there an intersection with the sphere?
				// if( findNearestIntersectionWithSphere(s, d, vec3(0., 0., 0.), 0.2, ip, id) ) {
				// 	// yes, there is an intersection with the sphere
				// 	// if there either no intersection already, or, if there is one, is it closer than the closest intersection so far?
				// 	if(id < intersectionDistance) {
				// 		// the intersection with the z mirrors is the closest one so far
				// 		intersectionPosition = ip;
				// 		intersectionDistance = id;
				// 		intersectionPlaneSetIndex = 3;	// sphere
				// 	}
				// }
				
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
					int ii = -1;
					int si = -1;
					int tl = maxTraceLevel;	// max trace level
					while(
						(tl-- > 0) &&
						findNearestIntersectionWithMirrors(s, d, 
							ii, si,
							ip,	// out vec3 intersectionPosition
							id,	// out float intersectionDistance
							mop,	// out float mirrorOpticalPower
							mp,	// out vec3 mirrorPrincipalPoint
							mNHat,	// out vec3 mirrorNormalHat	
							ii,	// out int intersectionPlaneIndex
							si	// out int intersectionPlaneSetIndex
						)
					) {
						if(si == 3) { 
							// the red sphere
							color = vec4(1., 0., 0., 1.);
							tl = -10;
						} else {
							s = ip;
							lensOrMirrorDeflect(d, s - mp, mNHat, mop, -1., false);
							b *= vec4(0.9, 0.9, 0.9, 1.);
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

	GUIParams = {
		maxTraceLevel: raytracingSphereShaderMaterial.uniforms.maxTraceLevel.value,
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
		// optical powers
		opx0: xMirrorsOP[0],
		opx1: xMirrorsOP[1],
		opz0: zMirrorsOP[0],
		opz1: zMirrorsOP[1],
		x0: xMin,
		x1: xMax,
		z0: zMin,
		z1: zMax,
		resonatorY: resonatorY,
		makeEyeLevel: function() { resonatorY = camera.position.y; }
	}

	gui.add( GUIParams, 'maxTraceLevel', 1, 200, 1 ).name( "max. TL" ).onChange( (mtl) => {raytracingSphereShaderMaterial.uniforms.maxTraceLevel.value = mtl; } );
	gui.add( GUIParams, 'opx0', -10, 10, 0.001 ).name( "OP<sub>x,0</sub>" ).onChange( (o) => { xMirrorsOP[0] = o; } );
	gui.add( GUIParams, 'opx1', -10, 10, 0.001 ).name( "OP<sub>x,1</sub>" ).onChange( (o) => { xMirrorsOP[1] = o; } );
	gui.add( GUIParams, 'opz0', -10, 10, 0.001 ).name( "OP<sub>z,0</sub>" ).onChange( (o) => { zMirrorsOP[0] = o; } );
	gui.add( GUIParams, 'opz1', -10, 10, 0.001 ).name( "OP<sub>z,1</sub>" ).onChange( (o) => { zMirrorsOP[1] = o; } );

	// gui.add( GUIParams, 'x0', -10, -0.1, 0.001 ).name( "<i>x</i><sub>0</sub>" ).onChange( (x) => { xMirrorsX[0] = x; xMirrorsP[0].x = x; for(let i=0; i<mirrorsNMax; i++) zMirrorsXMin[i] = x; } );
	// gui.add( GUIParams, 'x1',  0.1,  10, 0.001 ).name( "<i>x</i><sub>1</sub>" ).onChange( (x) => { xMirrorsX[1] = x; xMirrorsP[1].x = x; for(let i=0; i<mirrorsNMax; i++) zMirrorsXMax[i] = x; } );
	// gui.add( GUIParams, 'z0', -10, -0.1, 0.001 ).name( "<i>z</i><sub>0</sub>" ).onChange( (z) => { zMirrorsZ[0] = z; zMirrorsP[0].z = z; for(let i=0; i<mirrorsNMax; i++) xMirrorsZMin[i] = z; } );
	// gui.add( GUIParams, 'z1',  0.1,  10, 0.001 ).name( "<i>z</i><sub>1</sub>" ).onChange( (z) => { zMirrorsZ[1] = z; zMirrorsP[1].z = z; for(let i=0; i<mirrorsNMax; i++) xMirrorsZMax[i] = z; } );
	gui.add( GUIParams, 'x0', -10, -0.1, 0.001 ).name( "<i>x</i><sub>0</sub>" ).onChange( (x) => { xMin = x; } );
	gui.add( GUIParams, 'x1',  0.1,  10, 0.001 ).name( "<i>x</i><sub>1</sub>" ).onChange( (x) => { xMax = x; } );
	gui.add( GUIParams, 'z0', -10, -0.1, 0.001 ).name( "<i>z</i><sub>0</sub>" ).onChange( (z) => { zMin = z; } );
	gui.add( GUIParams, 'z1',  0.1,  10, 0.001 ).name( "<i>z</i><sub>1</sub>" ).onChange( (z) => { zMax = z; } );

	gui.add( GUIParams, 'resonatorY',  0, 3).name( "<i>y</i><sub>resonator</sub>" ).onChange( (y) => { resonatorY = y; } );
	gui.add( GUIParams, 'makeEyeLevel' ).name( 'Move resonator to eye level' );

	// const folderVirtualCamera = gui.addFolder( 'Virtual camera' );
	gui.add( GUIParams, 'Horiz. FOV (&deg;)', 1, 170, 1).onChange( setScreenFOV );
	gui.add( GUIParams, 'Aperture radius', 0.0, 1.0, 0.01).onChange( (r) => { apertureRadius = r; } );
	// autofocusControl = gui.add( GUIParams, 'autofocus' ).name( 'Autofocus: ' + (autofocus?'On':'Off') );
	// gui.add( GUIParams, 'Autofocus' ).onChange( (b) => { autofocus = b; focusDistanceControl.disable(autofocus); } );
	focusDistanceControl = gui.add( GUIParams, 'tan<sup>-1</sup>(focus. dist.)', 
		//Math.atan(0.1), 
		-0.5*Math.PI,
		0.5*Math.PI,
		0.001
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
	// folderVirtualCamera.close();

	// const folderSettings = gui.addFolder( 'Other controls' );
	// // folderSettings.add( params, 'Video feed forward' ).onChange( (b) => { raytracingSphereShaderMaterial.uniforms.keepVideoFeedForward.value = b; } );
	// // folderSettings.add( params, 'Lenslet type', { 'Ideal thin': true, 'Phase hologram': false } ).onChange( (t) => { raytracingSphereShaderMaterial.uniforms.idealLenses.value = t; });
	// // folderSettings.add( params, 'Ideal lenses').onChange( (b) => { raytracingSphereShaderMaterial.uniforms.idealLenses.value = b; } );
	// folderSettings.add( params, 'Show/hide info');
	// folderSettings.close();
}

function background2String() {
	switch (background) { 
	case 0: return 'Camera video';
	case 1: return 'Dr TIM';
	case 2: return 'Buzz Aldrin';
	case 3: return 'Descent from Half Dome';
	default: return 'Undefined';
	}
}

function initMirrors() {
	xMirrorsN = 2;
	// initialise all the elements to default values
	xMirrorsX = [];	// {x[0], x[1], ...}; note that we require x[0] <= x[1] <= x[2] ...!
	xMirrorsYMin = [];	// {yMin[0], yMin[1], ...}
	xMirrorsYMax = [];	// {yMax[0], yMax[1], ...}
	xMirrorsZMin = [];	// {zMin[0], zMin[1], ...}
	xMirrorsZMax = [];	// {zMax[0], zMax[1], ...}
	xMirrorsP = [];	// principal points
	xMirrorsOP = [];	// optical powers
	for(let i=0; i<mirrorsNMax; i++) {
		xMirrorsX.push(0.0);
		xMirrorsYMin.push(yMin+resonatorY);
		xMirrorsYMax.push(yMax+resonatorY);
		xMirrorsZMin.push(zMin);
		xMirrorsZMax.push(zMax);
		xMirrorsP.push(new THREE.Vector3(0., resonatorY, 0.));
		xMirrorsOP.push(-1.);
	}
	// set the actual values where those differ from the default ones
	xMirrorsX[0] = xMin; xMirrorsP[0].x = xMin;
	// xMirrorsX[1] = 0.2; xMirrorsP[1].x = 0.2; xMirrorsYMax[1] = 2; xMirrorsZMax[1] = 0;
	xMirrorsX[1] = xMax; xMirrorsP[1].x = xMax;

	yMirrorsN = 0;
	// initialise all the elements to default values
	yMirrorsY = [];	// {y[0], y[1], ...}; note that we require y[0] <= y[1] <= y[2] ...!
	yMirrorsXMin = [];	// {xMin[0], xMin[1], ...}
	yMirrorsXMax = [];	// {xMax[0], xMax[1], ...}
	yMirrorsZMin = [];	// {zMin[0], zMin[1], ...}
	yMirrorsZMax = [];	// {zMax[0], zMax[1], ...}
	yMirrorsP = [];	// principal points
	yMirrorsOP = [];	// optical powers
	for(let i=0; i<mirrorsNMax; i++) {
		yMirrorsY.push(0.0);
		yMirrorsXMin.push(xMin);
		yMirrorsXMax.push(xMax);
		yMirrorsZMin.push(zMin);
		yMirrorsZMax.push(zMax);
		yMirrorsP.push(new THREE.Vector3(0., resonatorY, 0.));
		yMirrorsOP.push(0.);
	}
	// set the actual values where those differ from the default ones
	yMirrorsY[0] = yMin+resonatorY; yMirrorsP[0].y = yMin+resonatorY;
	yMirrorsY[1] = yMax+resonatorY; yMirrorsP[1].y = yMax+resonatorY;

	zMirrorsN = 2;
	// initialise all the elements to default values
	zMirrorsZ = [];	// {z[0], z[1], ...}; note that we require z[0] <= z[1] <= z[2] ...!
	zMirrorsXMin = [];	// {xMin[0], xMin[1], ...}
	zMirrorsXMax = [];	// {xMax[0], xMax[1], ...}
	zMirrorsYMin = [];	// {yMin[0], yMin[1], ...}
	zMirrorsYMax = [];	// {yMax[0], yMax[1], ...}
	zMirrorsP = [];	// principal points
	zMirrorsOP = [];	// optical powers
	for(let i=0; i<mirrorsNMax; i++) {
		zMirrorsZ.push(0.0);
		zMirrorsXMin.push(xMin);
		zMirrorsXMax.push(xMax);
		zMirrorsYMin.push(yMin+resonatorY);
		zMirrorsYMax.push(yMax+resonatorY);
		zMirrorsP.push(new THREE.Vector3(0., resonatorY, 0.));
		zMirrorsOP.push(0.1);
	}
	// set the actual values where those differ from the default ones
	zMirrorsZ[0] = zMin; zMirrorsP[0].z = zMin;
	zMirrorsZ[1] = zMax; zMirrorsP[1].z = zMax;
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
	const mesh = new HTMLMesh( gui.domElement );
	mesh.position.x = 0;
	mesh.position.y = resonatorY - 1;
	mesh.position.z = 0;
	mesh.rotation.y = 0;
	mesh.scale.setScalar( 2 );
	group.add( mesh );	
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

	textureGU = textureLoader.load('GlasgowUniversity.jpg');
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
	controls.update();
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

	controls = new OrbitControls( camera, renderer.domElement );
	// controls = new OrbitControls( cameraOutside, renderer.domElement );
	controls.listenToKeyEvents( window ); // optional

	//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
	controls.addEventListener( 'change', cameraPositionChanged );

	controls.enableDamping = false; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 0.05;

	controls.enablePan = true;
	controls.enableZoom = true;

	controls.maxPolarAngle = Math.PI;
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

		storedPhotoDescription = `${name}`;
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
	postStatus("Welcome!");
}

function postStatus(text) {
	status.innerHTML = '&nbsp;'+text;
	console.log('status: '+text);

	// show the text only for 3 seconds
	statusTime = new Date().getTime();
	setTimeout( () => { if(new Date().getTime() - statusTime > 2999) status.innerHTML = '&nbsp;'+name+', University of Glasgow, <a href="https://github.com/jkcuk/'+name+'">https://github.com/jkcuk/'+name+'</a>' }, 3000);
}

function getInfoString() {
	return `<br>Virtual camera<br>\n` +
		`&nbsp;&nbsp;Position = (${camera.position.x.toPrecision(4)}, ${camera.position.y.toPrecision(4)}, ${camera.position.z.toPrecision(4)})<br>\n` +
		`&nbsp;&nbsp;Horiz. FOV = ${fovScreen.toPrecision(4)}<br>\n` +
		`&nbsp;&nbsp;Aperture radius = ${apertureRadius.toPrecision(4)}<br>\n` +
		`&nbsp;&nbsp;Focussing distance = ${Math.tan(atanFocusDistance).toPrecision(4)}<br>\n` +
		`&nbsp;&nbsp;Number of rays = ${noOfRays}\n` +
		`<br><br>Stored photo description/name = ${storedPhotoDescription}`
		;
		console.log("*");
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