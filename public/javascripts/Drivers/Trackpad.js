import { toggleControllerMode, handleControllerEvent, classifyControllerEvent, isEditModeSupported } from "./RingControllerDriver.js";
import { handleError } from "../Engines/ErrorHandler.js";
import * as tts from '../Services/tts.js'

function degToRad(degrees) {
    var result = Math.PI / 180 * degrees;
    return result;
}

// setup of the canvas

var canvas = document.querySelector('canvas');
// console.log('canvas', canvas)
var ctx = canvas.getContext('2d');

var x = canvas.width / 2;
var y = canvas.height / 2;

const RADIUS = x / 10;

var elStatus = document.getElementById('AppStatus');

function canvasDraw() {
    // ctx.fillStyle = "rgba(102, 204, 255, 0.1)";
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = "rgba(204, 204, 255, 0.1)";
    ctx.beginPath();
    ctx.arc(x, y, RADIUS, 0, degToRad(360), true);
    // ctx.fill();
}
canvasDraw();

canvas.requestPointerLock = canvas.requestPointerLock ||
    canvas.mozRequestPointerLock;

document.exitPointerLock = document.exitPointerLock ||
    document.mozExitPointerLock;

canvas.onclick = function () {
    canvas.requestPointerLock();
};

// pointer lock event listeners

// Hook pointer lock state change events for different browsers
document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

function lockChangeAlert() {
    if (document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas) {
        console.log('The pointer lock status is now locked.');
        elStatus.textContent = 'Canvas Locked'
        canvas.classList.add('canvas-locked')
        groupEventTimer.start({ precision: 'secondTenths', countdown: true, startValues: { secondTenths: COMBINE_EVENTS_TIME_WINDOW } });
        document.addEventListener("mousemove", updatePointerPosition, false);
        document.addEventListener("wheel", updateScroll, false);
    } else {
        console.log('The pointer lock status is now unlocked.');
        elStatus.textContent = 'Canvas Unlocked'
        canvas.classList.remove('canvas-locked')
        document.removeEventListener("mousemove", updatePointerPosition, false);
        document.removeEventListener("wheel", updateScroll, false);
    }
}

// var tracker = document.getElementById('tracker');

var animation;

let groupEventTimer = new Timer();
let positionArray = [];
let rawPosX = x;
let callScrollCounter = 0;
let isPointerMode = true;

let COMBINE_EVENTS_TIME_WINDOW = 1;   // 100ms
// let THRESHOLD_FOR_POINTER_MOVEMENT_CLASSIFICATION = canvas.width;
// let THRESHOLD_FOR_POINTER_MOVEMENT_CLASSIFICATION = 200;
let THRESHOLD_FOR_POINTER_MOVEMENT_CLASSIFICATION = 50;

groupEventTimer.addEventListener('secondTenthsUpdated', function (e) {
    // console.log('groupEventTimer ::', groupEventTimer.getTimeValues().toString(['hours', 'minutes', 'seconds', 'secondTenths']));
});

groupEventTimer.addEventListener('targetAchieved', function (e) {
    groupEventTimer.stop()
    console.log('position array', positionArray)
    classifyPointerMovement()
    positionArray = [];
    rawPosX = x;
});

function updateCanvas() {
    if (x > canvas.width + RADIUS) {
        x = -RADIUS;
    }
    if (y > canvas.height + RADIUS) {
        y = -RADIUS;
    }
    if (x < -RADIUS) {
        x = canvas.width + RADIUS;
    }
    if (y < -RADIUS) {
        y = canvas.height + RADIUS;
    }

    // tracker.textContent = "X position: " + x + ", Y position: " + y;
    elStatus.textContent = `Canvas Pointer Coordinates: (${x},${y})`

    if (!animation) {
        animation = requestAnimationFrame(function () {
            animation = null;
            canvasDraw();
        });
    }
}

function updatePointerPosition(e) {
    if (!isPointerMode) {
        isPointerMode = true;
        toggleControllerMode();
        console.log('####### Switched to Pointer Mode #######')
    }

    x += e.movementX;
    y += e.movementY;
    updateCanvas();
    
    groupEventTimer.reset()
    rawPosX += e.movementX;
    positionArray.push(rawPosX)
}

const classifyPointerMovement = () => {
    let deltaMovement = positionArray[positionArray.length - 1] - positionArray[0]
    console.log('deltaMovement', deltaMovement)

    if ( deltaMovement > THRESHOLD_FOR_POINTER_MOVEMENT_CLASSIFICATION ) {
        console.log('RIGHT', deltaMovement)
        handleControllerEvent(classifyControllerEvent('TRACK_RIGHT'));
    }
    else if ( deltaMovement < -THRESHOLD_FOR_POINTER_MOVEMENT_CLASSIFICATION ) {
        console.log('LEFT', deltaMovement)
        handleControllerEvent(classifyControllerEvent('TRACK_LEFT'));
    }
}

function updateScroll(e) {
    if (!isEditModeSupported()) {
        tts.pause();
        handleError('EDIT_MODE_NOT_SUPPORTED');
        return;
    }

    if (isPointerMode) {
        isPointerMode = false;
        toggleControllerMode();
        console.log('####### Switched to Wheel Mode #######')
    }

    x += e.deltaX;
    y += e.deltaY;
    updateCanvas();

    if (e.deltaX !== 0)
        callScrollCounter += 1;

    if (e.deltaX > 0) {
        console.log(callScrollCounter, 'LEFT', e.deltaX)
        handleControllerEvent(classifyControllerEvent('TRACK_LEFT'));
    }
    else if (e.deltaX < 0) {
        console.log(callScrollCounter, 'RIGHT', e.deltaX)
        handleControllerEvent(classifyControllerEvent('TRACK_RIGHT'));
    }
}