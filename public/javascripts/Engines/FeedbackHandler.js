import { getFeedbackConfiguration, getLoadedText } from '../main.js'
import { pushTextToBlade, setDataObjectLayoutHeader } from '../Drivers/VuzixBladeDriver.js'
import { quill } from '../Services/quill.js'
import { getColorCodedTextHTML } from '../Utils/stringdiff.js';
import { getSentenceGivenSentenceIndex, getSentenceIndexGivenCharIndexPosition, generateSentencesList, generateSentenceDelimiterIndicesList, getSentenceCharIndicesGivenSentenceIndex } from '../Utils/stringutils.js'
import { getPTTStatus, getWasTTSReading } from '../Drivers/RingControllerDriver.js'
import { getSentenceIndexFromBargeinIndex } from './UtteranceParser.js';
import { resumeReadAfterDisplayTimeout, readFromIndex } from './AudioFeedbackHandler.js';
import { markupForPrioritizedSentence } from '../Utils/HTMLParser.js';
import { renderTextPostUpdate, renderTextPostInsertion, renderTextOnUndoRedoInEditInsertMode } from './WordEditHandler.js';

const MAX_DISPLAY_ON_TIME = 5 // in seconds
const CLEAR = 'signal:clear'
const HOLD = 'signal:hold'
const keywordsThatShouldNotTriggerDisplay = ['previous', 'next', 'read']

let currentText
let lastUtterance
let timer = new Timer()
let displayON = false
let workingTextSentenceIndex = 0
let currentWorkingText

export const isDisplayON = () => displayON
export const getCurrentWorkingText = () => currentWorkingText
export const getCurrentWorkingTextSentenceIndex = () => workingTextSentenceIndex || 0

const getCurrentText = () => currentText
const setCurrentText = (text) => { currentText = text }

const getLastUtterance = () => lastUtterance
const setLastUtterance = (utterance) => { lastUtterance = utterance }

timer.addEventListener('secondsUpdated', function (e) {
    console.log('Timer ::',timer.getTimeValues().toString());
});

timer.addEventListener('targetAchieved', function (e) {
    console.log('Timer expired...');
    fireDisplayOffRoutine();
})

export const stopDisplayTimer = () => { timer.stop(); }

export const fireDisplayOffRoutine = (suppressRead) => {
    suppressRead = suppressRead || false
    timer.stop()
    // console.log('PTT status', getPTTStatus())
    if ( getPTTStatus() !== 'PTT_ON' ) {
        renderBladeDisplayBlank();
        displayON = false
        if (!suppressRead)
            resumeReadAfterDisplayTimeout()
    }
}

export const fireDisplayOnRoutine = () => {
    if ( getFeedbackConfiguration() === 'DISP_ON_DEMAND' )
        timer.start({ countdown: true, startValues: { seconds: MAX_DISPLAY_ON_TIME } })
        
    displayON = true
}

const renderBladeDisplayBlank = () => { pushTextToBlade(null, null) }

export const clearUserUtterance = () => { 
    if (getFeedbackConfiguration() === 'DISP_ON_DEMAND' && !displayON)
        return;
    
    feedbackOnUserUtterance(CLEAR) 
}

const renderBladeDisplay = (text, utterance) => {
    if (!text || text === HOLD) 
        text =  getCurrentText()
        else    setCurrentText(text)

    if (!utterance || utterance === HOLD)
        utterance = getLastUtterance()
        else        setLastUtterance(utterance)
    
    if (text === CLEAR)         text = null
    if (utterance === CLEAR)    utterance = null

    pushTextToBlade(text, utterance)

    if ( getFeedbackConfiguration() === 'DISP_ON_DEMAND' ) {
        if (!displayON && text)
            fireDisplayOnRoutine()
        else if (displayON && utterance)
            timer.reset()
    }
}

export const feedbackOnTextLoad = () => {
    setDataObjectLayoutHeader()
    
    switch (getFeedbackConfiguration()) {
        case 'DEFAULT':
            renderBladeDisplay(quill.getText(), CLEAR)
            break;
        case 'DISP_ALWAYS_ON':
            setTimeout(() => {
                setCurrentWorkingTextFromSentenceIndex()
                feedbackOnContextNavigation(0, 'ON_TEXT_LOAD')
            }, 50)
            break;
        case 'DISP_ON_DEMAND':
            setTimeout(() => {
                setCurrentWorkingTextFromSentenceIndex()
                renderBladeDisplayBlank()
            }, 50)
            break;
        case 'EYES_FREE':
            renderBladeDisplayBlank()
            break;
        case 'AOD_SCROLL':
            setTimeout( () => {
                setCurrentWorkingTextFromSentenceIndex()
                feedbackOfWorkingTextOnNavigation()
            }, 50)
            break;
        case 'ODD_FLEXI':
            setTimeout(() => {
                setCurrentWorkingTextFromSentenceIndex()
                feedbackOfWorkingTextOnNavigation()
                fireDisplayOnRoutine()
            }, 50)
            break;
    }
}

export const feedbackOnUserUtterance = (utterance) => {
    if ( shouldSuppressDisplay(utterance) )
        renderBladeDisplay(CLEAR, utterance)
    else
        renderBladeDisplay(HOLD, utterance) 
}

export const feedbackOfWorkingTextOnUserUtterance = (utterance, workingText, callString) => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
        case 'DISP_ALWAYS_ON':
        case 'AOD_SCROLL':
        case 'ODD_FLEXI':
            break;
        case 'DISP_ON_DEMAND':
            if (callString !== 'PTT')
                setCurrentWorkingTextFromPassedWorkingText(workingText)

            if ( utterance && !displayON && keywordsThatShouldNotTriggerDisplay.includes(utterance) )
                renderBladeDisplay(CLEAR)
            else if (callString === 'PTT')
                renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), workingText.text ), CLEAR )
            else
                renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), workingText.text ) )
            break;
    }
}

export const feedbackOfWorkingTextOnNavigation = () => {
    renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), workingTextSentenceIndex), currentWorkingText.text ), CLEAR )
    if (getFeedbackConfiguration() === 'DISP_ON_DEMAND')
        timer.reset()   // at this point display and hence, timer was on, so reset, and do not need to set displayON
}

const feedbackOfWorkingTextOnPushToTalk = () => { feedbackOfWorkingTextOnUserUtterance(null, currentWorkingText, 'PTT') }

export const feedbackOnCommandExecution = (updatedSentence, updatedSentenceIndex) => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
            renderBladeDisplay(getColorCodedTextHTML( getLoadedText(), quill.getText() ).replace(/&para.*/g, ''))
            break;
        case 'DISP_ALWAYS_ON':
            feedbackOnContextNavigation(updatedSentenceIndex, 'ON_TEXT_UPDATE')
            setCurrentWorkingTextFromSentenceIndex(updatedSentenceIndex)
            break;
        case 'AOD_SCROLL':
            renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), updatedSentenceIndex) , updatedSentence ) )
            setCurrentWorkingTextFromSentenceIndex(updatedSentenceIndex)
            break;
        case 'DISP_ON_DEMAND':
            renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), updatedSentenceIndex) , updatedSentence ) )
            fireDisplayOnRoutine()
            setCurrentWorkingTextFromSentenceIndex(updatedSentenceIndex)
            break;
        case 'ODD_FLEXI':
            if (displayON)
                renderBladeDisplay( getColorCodedTextHTML( getSentenceGivenSentenceIndex(getLoadedText(), updatedSentenceIndex), updatedSentence ) )
            setCurrentWorkingTextFromSentenceIndex(updatedSentenceIndex)
            break;
    }
}

const feedbackOnContextNavigation = (currentContext, callString) => {   // current context is highlighted and sets the scope for the working text
    let colorCodedTextHTML = (callString === 'ON_TEXT_LOAD') ? quill.getText() : getColorCodedTextHTML( getLoadedText(), quill.getText() )
    // console.log('colorCodedTextHTML (feedbackHandler.js)', colorCodedTextHTML)
    let colorCodedTextHTMLSentences = generateSentencesList(colorCodedTextHTML, true)
    // console.log('colorCodedTextHTMLSentences (feedbackHandler.js)', colorCodedTextHTMLSentences)
    let renderTextHTML = colorCodedTextHTMLSentences.map((sentence, index) => (index === currentContext) ? markupForPrioritizedSentence(sentence) : sentence )
    
    if (callString === 'ON_TEXT_UPDATE')
        renderBladeDisplay(renderTextHTML.join(' '))
    else
        renderBladeDisplay(renderTextHTML.join(' '), CLEAR)
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

    setCurrentWorkingTextFromSentenceIndex()
    feedbackOfWorkingTextOnNavigation()
}

export const navigateContext = (dir) => {
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

    setCurrentWorkingTextFromSentenceIndex()
    feedbackOnContextNavigation(workingTextSentenceIndex)
}

export const feedbackOnPushToTalk = () => {
    let PTTStatus = getPTTStatus()

    if (PTTStatus === 'PTT_ON') {
        if (!displayON) {
            if (getWasTTSReading() || !currentWorkingText)
                setCurrentWorkingTextFromSentenceIndex(getSentenceIndexFromBargeinIndex())
            fireDisplayOnRoutine()
            feedbackOfWorkingTextOnPushToTalk()
        }
    }
    else if (PTTStatus === 'PTT_OFF')
        fireDisplayOffRoutine()
}

export const setCurrentWorkingTextFromSentenceIndex = (sentenceIndex) => {
    sentenceIndex = (sentenceIndex != null) ? sentenceIndex : workingTextSentenceIndex

    currentWorkingText = {
        text: getSentenceGivenSentenceIndex(quill.getText(), sentenceIndex),
        startIndex: getSentenceCharIndicesGivenSentenceIndex(quill.getText(), sentenceIndex).start
    }

    workingTextSentenceIndex = sentenceIndex
}

export const setCurrentWorkingTextFromPassedWorkingText = (workingText) => {
    currentWorkingText = Object.assign( {}, workingText )
    workingTextSentenceIndex = getSentenceIndexGivenCharIndexPosition( quill.getText(), workingText.startIndex )
}

export const feedbackOnToggleDisplayState = () => {
    if ( displayON ) {
        fireDisplayOffRoutine(true)
        renderStatusOnBladeDisplay('Display Paused.')
    }
    else {
        if (getWasTTSReading() || !currentWorkingText)
            setCurrentWorkingTextFromSentenceIndex(getSentenceIndexFromBargeinIndex())

        feedbackOfWorkingTextOnNavigation()
        fireDisplayOnRoutine()
    }
}

export const feedbackOnToggleReadState = () => {
    if ( displayON )
        fireDisplayOffRoutine(true)
    if ( !getWasTTSReading() ) {
        readFromIndex(currentWorkingText.startIndex)
        renderStatusOnBladeDisplay(null)
    }
    else
        renderStatusOnBladeDisplay('Reading Paused.')
}

export const renderStatusOnBladeDisplay = (status) => {
    pushTextToBlade(null, null, status)
}

export const feedbackOnTextSelection = (renderHTML) => {
    renderBladeDisplay(renderHTML, CLEAR)
}

export const feedbackOnTextUpdateInEditMode = (utterance, isInsertMode) => {
    setCurrentWorkingTextFromSentenceIndex()
    if (isInsertMode)
        renderTextPostInsertion(utterance);
    else
        renderTextPostUpdate(utterance);
}

export const feedbackOfWorkingTextAfterExitFromEditMode = () => {
    if (getFeedbackConfiguration() === 'DISP_ALWAYS_ON')
        feedbackOnContextNavigation(workingTextSentenceIndex)
    else
        feedbackOfWorkingTextOnNavigation(); 
}

export const feedbackOnUndoRedoInEditMode = (isInsertMode) => {
    setCurrentWorkingTextFromSentenceIndex();
    if (isInsertMode)
        renderTextOnUndoRedoInEditInsertMode();
    else
        renderTextPostUpdate(null, true);
}

export const toggleReadToDisp = () => {
    if (getWasTTSReading() || !currentWorkingText)
        setCurrentWorkingTextFromSentenceIndex(getSentenceIndexFromBargeinIndex())

    feedbackOfWorkingTextOnNavigation()
    fireDisplayOnRoutine()
}

export const shouldSuppressDisplay = (utterance) => {
    switch (getFeedbackConfiguration()) {
        case 'DISP_ON_DEMAND':
        case 'ODD_FLEXI':
            if ( !displayON && utterance )
                return true;
            return false;
        default:
            return false;
    }
}