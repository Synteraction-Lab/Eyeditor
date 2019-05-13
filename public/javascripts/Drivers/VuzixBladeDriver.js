
const bladeURLObject = {
    ip: '172.25.106.143',
    port: '8080',
    route: 'displays',
    endpoint: '10'
}
const bladeURL = `http://${bladeURLObject.ip}:${bladeURLObject.port}/${bladeURLObject.route}/${bladeURLObject.endpoint}/`

var socket = io.connect('http://localhost:3000');
var dataObject;

export const pushTextToBlade = (text, utterance) => {
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
        // "heading": null,
        "subheading": text || null,
        "content": utterance || null
    };

    xhr.send(JSON.stringify(dataObject));

    // push to Blade Clone
    socket.emit('bladeData', dataObject)
}