import { getPushToBladeLockStatus } from "../main.js";
import { getBladeURLObject, getWebSocketRef } from "./ConnectBlade.js";

var socket = io.connect('http://localhost:3000');
let ws = getWebSocketRef()

export const pushTextToBlade = (text, utterance) => {
    let dataObject = {
        "html":true,
        "subheading": text || null,
        "content": utterance || null
    };
    
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