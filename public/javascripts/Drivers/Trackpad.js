const RADIUS = 10;

function degToRad(degrees) {
    var result = Math.PI / 180 * degrees;
    return result;
}

// setup of the canvas

var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');

var x = canvas.width / 2;
var y = canvas.height / 2;

function canvasDraw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f00";
    ctx.beginPath();
    ctx.arc(x, y, RADIUS, 0, degToRad(360), true);
    ctx.fill();
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
        console.log('The pointer lock status is now locked');
        groupEventTimer.start({ precision: 'secondTenths', countdown: true, startValues: { secondTenths: GROUP_EVENT_WINDOW } });
        document.addEventListener("mousemove", updatePosition, false);
    } else {
        console.log('The pointer lock status is now unlocked');
        document.removeEventListener("mousemove", updatePosition, false);
    }
}

var tracker = document.getElementById('tracker');

var animation;
let groupEventTimer = new Timer();
let positionArray = [];
let rawPosX = x; 

let GROUP_EVENT_WINDOW = 1 // 100ms
let MOVEMENT_THRESHOLD_FOR_CLASSIFICATION = canvas.width

groupEventTimer.addEventListener('secondTenthsUpdated', function (e) {
    // console.log('groupEventTimer ::', groupEventTimer.getTimeValues().toString(['hours', 'minutes', 'seconds', 'secondTenths']));
});

groupEventTimer.addEventListener('targetAchieved', function (e) {
    groupEventTimer.stop()
    console.log('position array', positionArray)
    classifyMovement()
    positionArray = [];
    rawPosX = x;
});

function updatePosition(e) {
    x += e.movementX;
    y += e.movementY;

    rawPosX += e.movementX

    groupEventTimer.reset()
    positionArray.push(rawPosX)

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
    tracker.textContent = "X position: " + x + ", Y position: " + y;

    if (!animation) {
        animation = requestAnimationFrame(function () {
            animation = null;
            canvasDraw();
        });
    }
}

const classifyMovement = () => {
    let deltaMovement = positionArray[positionArray.length - 1] - positionArray[0]

    if ( deltaMovement > MOVEMENT_THRESHOLD_FOR_CLASSIFICATION )
        console.log('RIGHT', deltaMovement)
    
    if ( deltaMovement < -MOVEMENT_THRESHOLD_FOR_CLASSIFICATION )
        console.log('LEFT', deltaMovement)
}
