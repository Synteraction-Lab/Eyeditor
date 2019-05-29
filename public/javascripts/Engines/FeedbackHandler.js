import { getFeedbackConfiguration, getLoadedText } from '../main.js'
import { pushTextToBlade } from '../Drivers/VuzixBladeDriver.js'
import { quill } from '../Services/quill.js'
import { getColorCodedTextHTML } from '../Utils/stringdiff.js';
import { getSentenceGivenSentenceIndex, getSentenceIndexGivenCharIndexPosition, generateSentencesList, generateSentenceDelimiterIndicesList, getSentenceCharIndicesGivenSentenceIndex } from '../Utils/stringutils.js'
import { getPTTStatus, getWasTTSReading } from '../Drivers/HandControllerDriver.js'
import { getWorkingTextFromReadIndex } from './UtteranceParser.js';
import { resumeReadAfterDisplayTimeout } from './AudioFeedbackHandler.js';
import { markupSentenceForHighlight } from '../Utils/HTMLParser.js';

const MAX_DISPLAY_ON_TIME = 5 // in seconds

var currentText
var lastUtterance
var timer = new Timer()
var displayON = false
var workingTextSentenceIndex = 0
var currentWorkingText
var currentContext = 0  // context captures the sentence number/index in DISP_ALWAYS_ON mode
let exemptedTriggerKeywords = ['previous', 'next', 'cancel']

export const isDisplayON = () => displayON
export const getCurrentWorkingText = () => currentWorkingText
export const getCurrentWorkingTextSentenceIndex = () => workingTextSentenceIndex || 0
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

export const fireDisplayOffRoutine = (suppressRead) => {
    suppressRead = suppressRead || false

    timer.stop()
    if ( getPTTStatus() !== 'PTT_ON' ) {
        renderBladeDisplayBlank();
        displayON = false
        if (!suppressRead)
            resumeReadAfterDisplayTimeout()
    }
}

const fireDisplayOnRoutine = () => {
    timer.start({ countdown: true, startValues: { seconds: MAX_DISPLAY_ON_TIME } })
    displayON = true
}

const renderBladeDisplayBlank = () => { pushTextToBlade(null, null) }

export const clearUserUtterance = () => { 
    if (getFeedbackConfiguration() === 'DISP_ON_DEMAND' && !displayON)
        return;
    
    feedbackOnUserUtterance('forceClear') 
}

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
        case 'AOD_SCROLL':
            pushTextToBlade(text, utterance)
            break;

        case 'DISP_ON_DEMAND':
            if (!utterance)
                pushTextToBlade(text, null)
            else if (exemptedTriggerKeywords.includes(utterance))
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
            feedbackOnContextNavigation(0, 'ON_TEXT_LOAD')
            break;
        case 'DISP_ON_DEMAND':
            renderBladeDisplayBlank()
            break;
        case 'AOD_SCROLL':
            setTimeout( () => {
                setCurrentWorkingText()
                feedbackOfWorkingTextOnNavigation()
            }, 50)
            break;
    }
}

export const feedbackOnUserUtterance = (utterance) => { renderBladeDisplay(null, utterance) }

export const feedbackOfWorkingTextOnUserUtterance = (workingText, callString) => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
        case 'DISP_ALWAYS_ON':
        case 'AOD_SCROLL':
            break;
        case 'DISP_ON_DEMAND':
            currentWorkingText = Object.assign({}, workingText)
            workingTextSentenceIndex = getSentenceIndexGivenCharIndexPosition(quill.getText(), workingText.startIndex)
            // console.log('(feedbackOfWorkingTextOnUserUtterance) Setting workingTextSentenceIndex :', workingTextSentenceIndex)
            if (callString === 'PTT')
                renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), workingText.text ), 'forceClear' )
            else
                renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), workingText.text ) )
            break;
    }
}

const feedbackOfWorkingTextOnNavigation = () => {
    renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), currentWorkingText.text ), 'forceClear' )
    if (getFeedbackConfiguration() !== 'AOD_SCROLL')
        timer.reset()   // at this point display and hence, timer was on, so reset, and do not need to set displayON
}

const feedbackOfWorkingTextOnPushToTalk = () => { feedbackOfWorkingTextOnUserUtterance(currentWorkingText, 'PTT') }

export const feedbackOnCommandExecution = (updatedSentence, updatedSentenceIndex) => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
            renderBladeDisplay(getColorCodedTextHTML( getLoadedText(), quill.getText() ).replace(/&para.*/g, ''))
            break;
        case 'DISP_ALWAYS_ON':
            feedbackOnContextNavigation(currentContext, 'ON_TEXT_UPDATE')
            break;
        case 'DISP_ON_DEMAND':
        case 'AOD_SCROLL':
            renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), updatedSentenceIndex) , updatedSentence ) )
            setCurrentWorkingText()
            break;
    }
}

const feedbackOnContextNavigation = (currentContext, callString) => {
    let colorCodedTextHTML = (callString === 'ON_TEXT_LOAD') ? quill.getText() : getColorCodedTextHTML( getLoadedText(), quill.getText() )
    // console.log('colorCodedTextHTML (feedbackHandler.js)', colorCodedTextHTML)
    let colorCodedTextHTMLSentences = generateSentencesList(colorCodedTextHTML, true)
    // console.log('colorCodedTextHTMLSentences (feedbackHandler.js)', colorCodedTextHTMLSentences)
    let renderTextHTML = colorCodedTextHTMLSentences.map((sentence, index) => (index === currentContext) ? markupSentenceForHighlight(sentence) : sentence )
    
    if (callString === 'ON_TEXT_UPDATE')
        renderBladeDisplay(renderTextHTML.join(' '))
    else
        renderBladeDisplay(renderTextHTML.join(' '), 'forceClear')
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

    setCurrentWorkingText()
    feedbackOfWorkingTextOnNavigation()
}

export const navigateContext = (dir) => {
    if (dir === 'PREV') {
        currentContext = currentContext - 1
        if (currentContext < 0)
            currentContext = 0
        
        feedbackOnContextNavigation(currentContext)
    } else if (dir === 'NEXT') {
        let sentenceDelimiterIndices = generateSentenceDelimiterIndicesList(quill.getText())

        currentContext = currentContext + 1
        if (currentContext >= sentenceDelimiterIndices.length)
            currentContext = sentenceDelimiterIndices.length - 1

        feedbackOnContextNavigation(currentContext)
    }
}

export const feedbackOnPushToTalk = () => {
    let PTTStatus = getPTTStatus()

    if (PTTStatus === 'PTT_ON') {
        if (!displayON) {
            if (getWasTTSReading() || !currentWorkingText)
                currentWorkingText = getWorkingTextFromReadIndex()
            fireDisplayOnRoutine()
            feedbackOfWorkingTextOnPushToTalk()
        }
    }
    else if (PTTStatus === 'PTT_OFF')
        fireDisplayOffRoutine()
}

export const setCurrentWorkingText = (sentenceIndex) => {
    sentenceIndex = sentenceIndex || workingTextSentenceIndex

    currentWorkingText = {
        text: getSentenceGivenSentenceIndex(quill.getText(), sentenceIndex),
        startIndex: getSentenceCharIndicesGivenSentenceIndex(quill.getText(), sentenceIndex).start
    }
}