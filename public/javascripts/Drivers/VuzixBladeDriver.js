import { getPushToBladeLockStatus } from "../main.js";

var socket = io.connect('http://localhost:3000');

export const pushTextToBlade = (text, utterance) => {
    let dataObject = {
        "html":true,
        "subheading": text || null,
        "content": utterance || null
    };
    
    // push text to Blade
    if (getPushToBladeLockStatus())
        WS.send(JSON.stringify(dataObject));

    // push to Blade Clone
    socket.emit('bladeData', dataObject)
}