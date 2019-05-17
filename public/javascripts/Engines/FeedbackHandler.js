import { getFeedbackConfiguration, getLoadedText } from '../main.js'
import { pushTextToBlade } from '../Drivers/VuzixBladeDriver.js'
import { quill } from '../Services/quill.js'
import { getColorCodedTextHTML } from '../Utils/stringdiff.js';
import { getSentenceGivenSentenceIndex, getSentenceIndexGivenCharIndexPosition, generateSentencesList, generateSentenceDelimiterIndicesList, getSentenceCharIndicesGivenSentenceIndex } from '../Utils/stringutils.js'
import { getCurrentContext, getPTTStatus } from '../Drivers/HandControllerDriver.js'
import { extractWorkingText } from './UtteranceParser.js';
import { resumeReadAfterGeneralInterrupt } from './AudioFeedbackHandler.js';

const MAX_DISPLAY_ON_TIME = 7 // in seconds

var currentText
var lastUtterance
var timer = new Timer()
var displayON = false
var workingTextSentenceIndex
var currentWorkingText

export const isDisplayON = () => displayON;
export const getCurrentWorkingText = () => currentWorkingText;

timer.addEventListener('secondsUpdated', function (e) {
    console.log('Timer ::',timer.getTimeValues().toString());
});

timer.addEventListener('targetAchieved', function (e) {
    timer.stop()
    console.log('Timer Stopped.');
    
    if ( !getPTTStatus() ) {
        renderBladeDisplayBlank();
        displayON = false
        currentWorkingText = null
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
            workingTextSentenceIndex = getSentenceIndexGivenCharIndexPosition(quill.getText(), workingText.startIndex)
            renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), workingText.text ) )
            break;
    }
}

export const feedbackOfWorkingTextOnNavigation = () => {
    renderBladeDisplay(getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), currentWorkingText.text ))
    timer.reset()   // at this point display and hence, timer was on, so reset, and do not need to set displayON
}

export const feedbackOnCommandExecution = (updatedSentence, updatedSentenceIndex) => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
            renderBladeDisplay(getColorCodedTextHTML( getLoadedText(), quill.getText() ).replace(/&para.*/g, ''))
            break;
        case 'DISP_ALWAYS_ON':
            feedbackOnTextNavigation(getCurrentContext())
            break;
        case 'DISP_ON_DEMAND':
            renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), updatedSentenceIndex) , updatedSentence ) )
            // update Working Text
            currentWorkingText = {
                text: getSentenceGivenSentenceIndex(quill.getText(), workingTextSentenceIndex),
                startIndex: getSentenceCharIndicesGivenSentenceIndex(quill.getText(), workingTextSentenceIndex).start
            }
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

export const navigateWorkingText = (dir) => {
    if (dir === 'PREV') {
        workingTextSentenceIndex = workingTextSentenceIndex - 1
        if (workingTextSentenceIndex < 0)
            workingTextSentenceIndex = 0
    } else if (dir === 'NEXT') {
        let sentenceDelimiterIndices = generateSentenceDelimiterIndicesList(quill.getText())
        workingTextSentenceIndex = workingTextSentenceIndex + 1
        if (workingTextSentenceIndex >= sentenceDelimiterIndices.length)
            workingTextSentenceIndex = sentenceDelimiterIndices.length - 1
    }

    currentWorkingText = {
        text: getSentenceGivenSentenceIndex(quill.getText(), workingTextSentenceIndex),
        startIndex: getSentenceCharIndicesGivenSentenceIndex(quill.getText(), workingTextSentenceIndex).start
    }

    feedbackOfWorkingTextOnNavigation()
}