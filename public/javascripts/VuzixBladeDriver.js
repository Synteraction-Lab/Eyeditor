import { getFeedbackConfiguration } from './main.js'

const MAX_DISPLAY_ON_TIME = 7 // in seconds
const bladeURLObject = {
    ip: '172.25.105.13',
    port: '8080',
    route: 'displays',
    endpoint: '10'
}
const bladeURL = `http://${bladeURLObject.ip}:${bladeURLObject.port}/${bladeURLObject.route}/${bladeURLObject.endpoint}/`

var currentText;
var lastUtterance;
var socket = io.connect('http://localhost:3000');
var dataObject;
var timer = new Timer()

const pushTextToBlade = (text, utterance) => {
    var xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log('response from Blade Server', this.responseText);
        }
    }
    
    xhr.open("POST", bladeURL, true)
    
    // Request Header Configuration
    xhr.setRequestHeader("Content-Type", "application/json")

    // text = '<b>hello world</b> <i>what</i><br><strike>hello</strike> <font color="#ff00ff">text</font>'

    dataObject = {
        "html":true,
        "heading": null,
        "subheading": text,
        "content": utterance
    };

    xhr.send(JSON.stringify(dataObject));

    // push to Blade Clone
    socket.emit('bladeData', dataObject)
}

const setCurrentText = (text) => {
    currentText = text
}

const setLastUtterance = (utterance) => {
    lastUtterance = utterance
}

const getCurrentText = () => currentText
const getLastUtterance = () => lastUtterance

export const renderBladeDisplayBlank = () => pushTextToBlade(null, null)

export const renderBladeDisplay = (text, utterance) => {
    if (!text) text = getCurrentText()
    else setCurrentText(text)

    if (utterance === 'forceClear')
        utterance = null;
    else if (!utterance) utterance = getLastUtterance()
    else setLastUtterance(utterance)

    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
        case 'DISP_ALWAYS_ON':
            pushTextToBlade(text, utterance)
            break;

        case 'DISP_ON_DEMAND':
            pushTextToBlade(text, utterance)
            if (!timer.isRunning())
                timer.start({countdown: true, startValues: {seconds: MAX_DISPLAY_ON_TIME}});
            else timer.reset()

            break;
    }
}

timer.addEventListener('secondsUpdated', function (e) {
    console.log('Timer ::',timer.getTimeValues().toString());
});

timer.addEventListener('targetAchieved', function (e) {
    renderBladeDisplayBlank();
    timer.stop()
    console.log('Timer Stopped.');
});