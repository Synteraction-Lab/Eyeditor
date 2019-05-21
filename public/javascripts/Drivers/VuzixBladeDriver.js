import { getFeedbackConfiguration } from "../main.js";
import { flattenHTML } from "../Utils/HTMLParser.js";

const bladeURLObject = {
    ip: '172.25.106.169',
    port: '9090',
    route: 'displays',
    endpoint: '10'
}
const bladeURL = `ws://${bladeURLObject.ip}:${bladeURLObject.port}/${bladeURLObject.route}/${bladeURLObject.endpoint}`

var socket = io.connect('http://localhost:3000');
var ws = new WebSocket(bladeURL);

export const pushTextToBlade = (text, utterance) => {
    if (getFeedbackConfiguration() === 'DISP_ALWAYS_ON')
        text = flattenHTML(text)

    let dataObject = {
        "html":true,
        "subheading": text || null,
        "content": utterance || null
    };

    ws.send(JSON.stringify(dataObject));
    
    ws.onopen = function () {
        console.log('Connection established with Blade server...')
    };

    ws.onmessage = function (evt) {
        // let messageReceived = evt.data;
        // console.log('Msg received from Blade ::', messageReceived)
    };

    ws.onclose = function () {
        console.log("Blade Websocket is closed.");
    };

    // push to Blade Clone
    socket.emit('bladeData', dataObject)
}