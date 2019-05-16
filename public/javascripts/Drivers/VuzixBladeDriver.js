
const bladeURLObject = {
    ip: '172.25.96.238',
    port: '9090'
}
const bladeURL = `ws://${bladeURLObject.ip}:${bladeURLObject.port}`

var socket = io.connect('http://localhost:3000');

export const pushTextToBlade = (text, utterance) => {
    let dataObject = {
        "html":true,
        "subheading": text || null,
        "content": utterance || null
    };

    var ws = new WebSocket(bladeURL);

    ws.onopen = function () {
        ws.send(JSON.stringify(dataObject));
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