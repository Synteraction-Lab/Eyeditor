import { getPushToBladeLockStatus, getFeedbackConfiguration } from "../main.js";
import { getBladeURLObject, getWebSocketRef } from "./ConnectBlade.js";
import { getSocket } from "../Services/socket.js";

let socket = getSocket()
let ws = getWebSocketRef()
let dataObject = {}

const LAYOUT_CONSTANTS = {
    NO_GRAVITY: 0,
    TOP: 48,
    BOTTOM: 80,
    CENTER: 17,
    CENTER_HORIZONTAL: 1,
    CENTER_VERTICAL: 16,
    START: 8388611,
    END: 8388613,
    LEFT: 3,
    RIGHT: 5,
    FILL: 119,
    FILL_HORIZONTAL: 7,
    FILL_VERTICAL: 112
}

const displayConfigsThatSupportVariableLayout = ['DISP_ON_DEMAND', 'AOD_SCROLL', 'ODD_FLEXI']

export const setDataObjectLayoutHeader = () => {
    if ( displayConfigsThatSupportVariableLayout.includes(getFeedbackConfiguration()) )
        dataObject.heading = `${LAYOUT_CONSTANTS.CENTER},${LAYOUT_CONSTANTS.CENTER}`
    else
        dataObject.heading = `${LAYOUT_CONSTANTS.NO_GRAVITY},${LAYOUT_CONSTANTS.NO_GRAVITY}`
}

export const pushTextToBlade = (text, utterance, status) => {
    dataObject.html = true;
    dataObject.status = status || null;
    dataObject.subheading = text || null;
    dataObject.content = utterance || null;

    // push text to Blade
    if ( getPushToBladeLockStatus() ) {
        try {
            ws.send(JSON.stringify(dataObject));
        } catch(err) {
            console.log('Cannot connect to Blade server.', err)
        }
    }

    // push to Blade Clone
    socket.emit('bladeData', dataObject)
}

export const sendScrollEvent = (scrollDirection) => {
    let bladeURLObject = getBladeURLObject()
    bladeURLObject.port = '8080'
    bladeURLObject.route = 'touch'
    bladeURLObject.endpoint = 13

    const scrollSendEventURL = `http://${bladeURLObject.ip}:${bladeURLObject.port}/${bladeURLObject.route}/${bladeURLObject.endpoint}/`

    let xhr = new XMLHttpRequest()
    let scrollData = {
        'id': null,
        'type': `ONE_FINGER_SWIPE_${scrollDirection}`
    }
    
    xhr.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // console.log('response from Blade Server', this.responseText);
        }
    }

    xhr.open("POST", scrollSendEventURL, true)

    // Request Header Configuration
    xhr.setRequestHeader("Content-Type", "application/json")

    xhr.send(JSON.stringify(scrollData));
}