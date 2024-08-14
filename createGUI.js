import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';



// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_animation_skinning_additive_blending.html
export function createGUI() {
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
		mirrorType: function() {
			raytracingSphereShaderMaterial.uniforms.mirrorType.value = (raytracingSphereShaderMaterial.uniforms.mirrorType.value + 1) % 2;
			mirrorTypeControl.name( mirrorType2String() );
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
		cylindricalMirrors: function() {
			raytracingSphereShaderMaterial.uniforms.cylindricalMirrors.value = !raytracingSphereShaderMaterial.uniforms.cylindricalMirrors.value;
			cylindricalMirrorsControl.name( cylindricalMirrors2String() );
		},
		// reflectionCoefficient9s: -Math.log10(1-raytracingSphereShaderMaterial.uniforms.reflectionCoefficient.value),
		reflectionLossDB: 10*Math.log10(1-raytracingSphereShaderMaterial.uniforms.reflectionCoefficient.value),
		makeEyeLevel: function() { resonatorY = camera.position.y; resonatorYControl.setValue(resonatorY); }
		// meshRotX: meshRotationX,
		// meshRotY: meshRotationY,
		// meshRotZ: meshRotationZ
	}

	gui.add( GUIParams, 'noOfReflections', 0, 200, 1 ).name( 'Max. reflections' ).onChange( (r) => {raytracingSphereShaderMaterial.uniforms.maxTraceLevel.value = r + 2; } );
	resonatorTypeControl = gui.add( GUIParams, 'resonatorType' ).name( resonatorType2String() );
	mirrorTypeControl = gui.add( GUIParams, 'mirrorType' ).name( mirrorType2String() );
	// cylindricalMirrorsControl = gui.add( GUIParams, 'cylindricalMirrors' ).name( cylindricalMirrors2String() );
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
	// gui.add( GUIParams, 'reflectionCoefficient9s', 0, 3, 0.1 ).name( '<div class="tooltip">Nines(<i>R</i>)<span class="tooltiptext">The number of <a href="https://en.m.wikipedia.org/wiki/Nines_(notation)">nines</a><br>in the reflection<br>coefficient, <i>R</i>.<br>E.g. Nines(0.99) = 2.</span></div> ' ).onChange( (l) => { raytracingSphereShaderMaterial.uniforms.reflectionCoefficient.value = 1-Math.pow(10, -l); } );
	gui.add( GUIParams, 'reflectionLossDB', -30, 0, 0.1 ).name( 'Refl. loss (dB)' ).onChange( (l) => { raytracingSphereShaderMaterial.uniforms.reflectionCoefficient.value = 1-Math.pow(10, 0.1*l); } );
	// remove these for the moment
	// gui.add( GUIParams, 'sphereCentreX', -5, 5 ).name( "<i>x</i><sub>sphere</sub>" ).onChange( (x) => { sphereCentre.x = x; } );
	// gui.add( GUIParams, 'sphereCentreY',  0, 5 ).name( "<i>y</i><sub>sphere</sub>" ).onChange( (y) => { sphereCentre.y = y; } );
	// gui.add( GUIParams, 'sphereCentreZ', -5, 5 ).name( "<i>z</i><sub>sphere</sub>" ).onChange( (z) => { sphereCentre.z = z; } );
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