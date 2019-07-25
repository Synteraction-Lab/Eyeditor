const bladeURLObject = {
    // ip: '172.25.106.169',
    ip: '192.168.43.62',
    port: '9090',
    route: 'displays',
    endpoint: '10'
}
const bladeURL = `ws://${bladeURLObject.ip}:${bladeURLObject.port}/${bladeURLObject.route}/${bladeURLObject.endpoint}`

export const getBladeURLObject = () => bladeURLObject;
export const getWebSocketRef = () => ws

var ws = new WebSocket(bladeURL);

ws.onopen = function () {
    console.log('Connection established!')
    AppStatus.textContent = 'Vuzix Blade Connected!'
};

ws.onmessage = function (evt) {
    // let messageReceived = evt.data;
    // console.log('Msg received from Blade ::', messageReceived)
};

ws.onclose = function () {
    console.log("Connection with Blade server closed.");
    AppStatus.textContent = 'Connection with Vuzix Blade server closed.'
};

console.log('Trying to connect to the Blade server...')
AppStatus.textContent = 'Trying to connect to the Vuzix Blade server...'