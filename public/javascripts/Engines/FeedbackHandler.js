import { getFeedbackConfiguration, getLoadedText } from './main.js'
import { pushTextToBlade } from './Drivers/VuzixBladeDriver.js'
import { quill } from './Services/quill.js'
import { getColorCodedTextHTML } from './Utils/stringdiff.js';
import { getUpdateParameter } from './utteranceparser.js'
import { getSentenceGivenSentenceIndex, getSentenceIndexGivenCharIndexPosition } from './Utils/stringutils.js'

const MAX_DISPLAY_ON_TIME = 7 // in seconds

var currentText;
var lastUtterance;
var timer = new Timer()
var isDisplayOn = false;

timer.addEventListener('secondsUpdated', function (e) {
    console.log('Timer ::',timer.getTimeValues().toString());
});

timer.addEventListener('targetAchieved', function (e) {
    renderBladeDisplayBlank();
    isDisplayOn = false
    timer.stop()
    console.log('Timer Stopped.');
});

const setCurrentText = (text) => {
    currentText = text
}

const setLastUtterance = (utterance) => {
    lastUtterance = utterance
}

const getCurrentText = () => currentText
const getLastUtterance = () => lastUtterance

const renderBladeDisplayBlank = () => pushTextToBlade(null, null)

const renderBladeDisplay = (text, utterance) => {
    let saveReceivedText = text

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
            if (saveReceivedText) {
                pushTextToBlade(text, utterance)
                timer.start({countdown: true, startValues: {seconds: MAX_DISPLAY_ON_TIME}});
                isDisplayOn = true
            }
            else if (isDisplayOn) {
                pushTextToBlade(text, utterance)
                timer.reset()
            }
            else
                pushTextToBlade(null, utterance)
            
            break;
    }
}

export const feedbackOnTextLoad = () => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
        case 'DISP_ALWAYS_ON':
            renderBladeDisplay(quill.getText(), 'forceClear')
            break;
        case 'DISP_ON_DEMAND':
            renderBladeDisplayBlank()
            break;
    }
}

export const feedbackOnTextRefresh = () => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
        case 'DISP_ALWAYS_ON':
            renderBladeDisplay(getColorCodedTextHTML( getLoadedText(), quill.getText() ))
            break;
        case 'DISP_ON_DEMAND':
            break;
    }
}

export const feedbackOnUserUtterance = (utterance) => {
    renderBladeDisplay(null, utterance)
}

export const feedbackOfWorkingTextOnUserUtterance = (workingText) => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
        case 'DISP_ALWAYS_ON':
            break;
        case 'DISP_ON_DEMAND':
            renderBladeDisplay(workingText)
            break;
    }
}

export const feedbackOnCommandExecution = (updatedSentence) => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
        case 'DISP_ALWAYS_ON':
            break;
        case 'DISP_ON_DEMAND':
            renderBladeDisplay(getColorCodedTextHTML( getSentenceGivenSentenceIndex( getLoadedText(), getSentenceIndexGivenCharIndexPosition(getLoadedText(), getUpdateParameter().startIndex) ), updatedSentence ))
            break;
    }
}
