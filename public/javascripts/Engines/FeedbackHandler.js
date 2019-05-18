import { getFeedbackConfiguration, getLoadedText } from '../main.js'
import { pushTextToBlade } from '../Drivers/VuzixBladeDriver.js'
import { quill } from '../Services/quill.js'
import { getColorCodedTextHTML } from '../Utils/stringdiff.js';
import { getSentenceGivenSentenceIndex, getSentenceIndexGivenCharIndexPosition, generateSentencesList, generateSentenceDelimiterIndicesList, getSentenceCharIndicesGivenSentenceIndex } from '../Utils/stringutils.js'
import { getPTTStatus } from '../Drivers/HandControllerDriver.js'
import { extractWorkingText } from './UtteranceParser.js';
import { resumeReadAfterDisplayTimeout } from './AudioFeedbackHandler.js';

const MAX_DISPLAY_ON_TIME = 5 // in seconds

var currentText
var lastUtterance
var timer = new Timer()
var displayON = false
var workingTextSentenceIndex
var currentWorkingText
var currentContext = 0  // context captures the sentence number/index in DISP_ALWAYS_ON mode

export const isDisplayON = () => displayON
export const getCurrentWorkingText = () => currentWorkingText
export const getCurrentWorkingTextSentenceIndex = () => workingTextSentenceIndex
export const getCurrentContext = () => currentContext

const getCurrentText = () => currentText
const setCurrentText = (text) => { currentText = text }

const getLastUtterance = () => lastUtterance
const setLastUtterance = (utterance) => { lastUtterance = utterance }

timer.addEventListener('secondsUpdated', function (e) {
    console.log('Timer ::',timer.getTimeValues().toString());
});

timer.addEventListener('targetAchieved', function (e) {
    fireDisplayOffRoutine();
})

export const fireDisplayOffRoutine = (callString) => {
    timer.stop()
    
    if ( callString === 'PTT' || !getPTTStatus() ) {
        renderBladeDisplayBlank();
        displayON = false
        currentWorkingText = null
        resumeReadAfterDisplayTimeout()
    }
}

export const fireDisplayOnRoutine = () => {
    timer.start({ countdown: true, startValues: { seconds: MAX_DISPLAY_ON_TIME } })
    displayON = true
}

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
            let exemptedTriggerKeywords = ['previous', 'next', 'cancel']
            
            if (exemptedTriggerKeywords.includes(utterance))
                pushTextToBlade(null, utterance)
            else if (!isReceivedTextNull) {     // when there is text pushed as working text or after command-execution
                pushTextToBlade(text, utterance)
                fireDisplayOnRoutine()
            }
            else if (displayON) {     // incoming text is null but display is still on i.e. streaming utterance coming in with display on
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
            // console.log('(feedbackOfWorkingTextOnUserUtterance) Setting workingTextSentenceIndex :', workingTextSentenceIndex)
            renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), workingText.text ) )
            break;
    }
}

export const feedbackOfWorkingTextOnNavigation = () => {
    renderBladeDisplay(getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), currentWorkingText.text ))
    timer.reset()   // at this point display and hence, timer was on, so reset, and do not need to set displayON
}

export const feedbackOfWorkingTextOnPushToTalk = () => { feedbackOfWorkingTextOnUserUtterance(currentWorkingText) }

export const feedbackOnCommandExecution = (updatedSentence, updatedSentenceIndex) => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
            renderBladeDisplay(getColorCodedTextHTML( getLoadedText(), quill.getText() ).replace(/&para.*/g, ''))
            break;
        case 'DISP_ALWAYS_ON':
            feedbackOnTextNavigation(currentContext)
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

    // console.log('(navigateWorkingText) Setting workingTextSentenceIndex :', workingTextSentenceIndex)
    currentWorkingText = {
        text: getSentenceGivenSentenceIndex(quill.getText(), workingTextSentenceIndex),
        startIndex: getSentenceCharIndicesGivenSentenceIndex(quill.getText(), workingTextSentenceIndex).start
    }

    feedbackOfWorkingTextOnNavigation()
}

export const navigateContext = (dir) => {
    if (dir === 'PREV') {
        currentContext = currentContext - 1
        if (currentContext < 0)
            currentContext = 0
        
        feedbackOnTextNavigation(currentContext)
    } else if (dir === 'NEXT') {
        let sentenceDelimiterIndices = generateSentenceDelimiterIndicesList(quill.getText())

        currentContext = currentContext + 1
        if (currentContext >= sentenceDelimiterIndices.length)
            currentContext = sentenceDelimiterIndices.length - 1

        feedbackOnTextNavigation(currentContext)
    }
}

export const feedbackOnPushToTalk = (interruptIndex) => {
    let PTTStatus = getPTTStatus()

    if (PTTStatus === 'PTT_ON') {
        fireDisplayOnRoutine()
        currentWorkingText = extractWorkingText(interruptIndex)
        feedbackOfWorkingTextOnPushToTalk()
    }
    else if (PTTStatus === 'PTT_OFF')
        fireDisplayOffRoutine('PTT')
}