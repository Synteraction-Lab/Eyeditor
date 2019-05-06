var currentText;
var lastUtterance;

export const pushTextToBlade = (text, utterance) => {
    if (!text) text = getCurrentText()
    else setCurrentText(text)

    if (!utterance) utterance = getLastUtterance()
    else setLastUtterance(utterance)

    var xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log('response from Blade Server', this.responseText);
        }
    }
    xhr.open("POST", "http://172.25.97.225:8080/displays/9/", true)
    
    // Request Header Configuration
    xhr.setRequestHeader("Content-Type", "application/json")

    xhr.send(JSON.stringify({
        "heading": "",
        "subheading": text,
        "content": utterance
    }));
}

const setCurrentText = (text) => {
    currentText = text
}

const setLastUtterance = (utterance) => {
    lastUtterance = utterance
}

const getCurrentText = () => currentText
const getLastUtterance = () => lastUtterance