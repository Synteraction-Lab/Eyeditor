import { getFeedbackConfiguration, getLoadedText } from '../main.js'
import { pushTextToBlade } from '../Drivers/VuzixBladeDriver.js'
import { quill } from '../Services/quill.js'
import { getColorCodedTextHTML } from '../Utils/stringdiff.js';
import { getSentenceGivenSentenceIndex, getSentenceIndexGivenCharIndexPosition, generateSentencesList } from '../Utils/stringutils.js'
import { getCurrentContext, getPTTStatus } from '../Drivers/HandControllerDriver.js'
import { extractWorkingText } from './UtteranceParser.js';
import { resumeReadAfterGeneralInterrupt } from './AudioFeedbackHandler.js';

const MAX_DISPLAY_ON_TIME = 7 // in seconds

var currentText;
var lastUtterance;
var timer = new Timer()
var displayON = false;

timer.addEventListener('secondsUpdated', function (e) {
    console.log('Timer ::',timer.getTimeValues().toString());
});

timer.addEventListener('targetAchieved', function (e) {
    timer.stop()
    console.log('Timer Stopped.');
    
    if ( !getPTTStatus() ) {
        renderBladeDisplayBlank();
        displayON = false
    }
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
    // console.log('inside renderBladeDisplay...')
    // console.log('received text', text)
    // console.log('received utterance', utterance)

    let isReceivedTextNull = (text) ? false : true

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
            let exemptedTriggerKeywords = ['previous', 'next']
            
            if (exemptedTriggerKeywords.includes(utterance))
                pushTextToBlade(null, utterance)
            else if (!isReceivedTextNull) {     // when there is text pushed as working text or after command-execution
                pushTextToBlade(text, utterance)
                timer.start({countdown: true, startValues: {seconds: MAX_DISPLAY_ON_TIME}});
                displayON = true
            }
            else if (displayON) {     // incoming text is null but display is still on
                pushTextToBlade(text, utterance)    // text is the last saved text
                timer.reset()
            }
            else    // incoming text null, display off.
                pushTextToBlade(null, utterance)
            
            break;
    }
}

export const feedbackOnTextLoad = () => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
            renderBladeDisplay(quill.getText(), 'forceClear')
            break;
        case 'DISP_ALWAYS_ON':
            feedbackOnTextNavigation(0, true)
            break;
        case 'DISP_ON_DEMAND':
            renderBladeDisplayBlank()
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

export const feedbackOnCommandExecution = (updateParameter, updatedSentence) => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
            renderBladeDisplay(getColorCodedTextHTML( getLoadedText(), quill.getText() ).replace(/&para.*/g, ''))
            break;
        case 'DISP_ALWAYS_ON':
            feedbackOnTextNavigation(getCurrentContext())
            break;
        case 'DISP_ON_DEMAND':
            renderBladeDisplay(getColorCodedTextHTML( getSentenceGivenSentenceIndex( getLoadedText(), getSentenceIndexGivenCharIndexPosition(getLoadedText(), updateParameter.startIndex) ), updatedSentence ))
            break;
    }
}

export const feedbackOnTextNavigation = (currentContext, isOnload) => {
    let colorCodedTextHTML = (isOnload) ? quill.getText() : getColorCodedTextHTML( getLoadedText(), quill.getText() )
    // console.log('colorCodedTextHTML (feedbackHandler.js)', colorCodedTextHTML)
    let colorCodedTextHTMLSentences = generateSentencesList(colorCodedTextHTML, true)
    // console.log('colorCodedTextHTMLSentences (feedbackHandler.js)', colorCodedTextHTMLSentences)
    let renderTextHTML = colorCodedTextHTMLSentences.map( (sentence, index) => (index === currentContext) ? `<b>${sentence}</b>` : sentence )
    
    if (isOnload)   renderBladeDisplay(renderTextHTML.join(' '), 'forceClear')
        else        renderBladeDisplay(renderTextHTML.join(' '))
}

export const feedbackOnPushToTalk = (interruptIndex) => {
    let PTTStatus = getPTTStatus()
    console.log('PTTStatus', PTTStatus)
    if ( PTTStatus === 'PTT_ON' )
        renderBladeDisplay(extractWorkingText(interruptIndex).text)
    else if ( PTTStatus === 'PTT_OFF' ){
        renderBladeDisplayBlank()
        resumeReadAfterGeneralInterrupt()
    }
}