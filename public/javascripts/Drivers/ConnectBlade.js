const bladeURLObject = {
    // ip: '172.25.106.169',
    ip: '192.168.43.62',
    port: '9090',
    route: 'displays',
    endpoint: '10'
}
const bladeURL = `ws://${bladeURLObject.ip}:${bladeURLObject.port}/${bladeURLObject.route}/${bladeURLObject.endpoint}`

var WS = new WebSocket(bladeURL);

WS.onopen = function () {
    console.log('Connection established!')
};

WS.onmessage = function (evt) {
    // let messageReceived = evt.data;
    // console.log('Msg received from Blade ::', messageReceived)
};

WS.onclose = function () {
    console.log("Connection with Blade server closed.");
};

console.log('Trying to connect to the Blade server...')