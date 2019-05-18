import * as tts from '../Services/tts.js'
import { quill } from '../Services/quill.js'
import { getBargeinIndex } from './UtteranceParser.js'
import { getIndexOfLastPunctuation, getSentenceIndices, generateSentenceDelimiterIndicesList, getSentenceCharIndicesGivenSentenceIndex } from '../Utils/stringutils.js'
import { getFeedbackConfiguration } from '../main.js';
import { getPTTStatus } from '../Drivers/HandControllerDriver.js';
import { isDisplayON, getCurrentWorkingTextSentenceIndex } from './FeedbackHandler.js';

const prevSentenceRequestDelta = 12 // if LEFT is clicked within first 12 chars of current sentence, TTS reads the prev. sentence.
const feedbackRate = {
    'ERROR': 1.0,
    'SUCCESS': 1.0
}

export const speakFeedback = (feedback, type) => {
    tts.speak( feedback, feedbackRate[type] )
}

export const readTextOnUpdate = (updateParameter) => {
    if (    getFeedbackConfiguration() === 'DISP_ALWAYS_ON' 
        || (getFeedbackConfiguration() === 'DISP_ON_DEMAND' && isDisplayON())
        ||  getPTTStatus()             === 'PTT_ON'     )
        return;
    else
        tts.read(getIndexOfLastPunctuation( quill.getText(), updateParameter.startIndex ) + 2)
}

export const readTextOnFailedUpdate = () => {
    if (    getFeedbackConfiguration() === 'DISP_ALWAYS_ON'
        || (getFeedbackConfiguration() === 'DISP_ON_DEMAND' && isDisplayON())
        ||  getPTTStatus()             === 'PTT_ON'     )
        return;
    else 
        tts.read(getIndexOfLastPunctuation( quill.getText(), getBargeinIndex() ) + 2)
}

export const resumeReadAfterGeneralInterrupt = () => { readTextOnFailedUpdate() }

export const readPrevSentence = (interruptIndex, isVoiceRequest) => {
    interruptIndex = interruptIndex || getBargeinIndex()
    let currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
    if (interruptIndex - currentSentenceIndices.start < prevSentenceRequestDelta || isVoiceRequest)
        currentSentenceIndices = getSentenceIndices(quill.getText(), currentSentenceIndices.start - 2)
    
    tts.read(currentSentenceIndices.start)
}

export const readNextSentence = (interruptIndex) => {
    interruptIndex = interruptIndex || getBargeinIndex()
    let currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
    if (currentSentenceIndices.end < quill.getText().length - 1) {
        interruptIndex = currentSentenceIndices.end + 2
        currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
    }

    tts.read(currentSentenceIndices.start)
}

export const repeatSentence = (interruptIndex) => {
    interruptIndex = interruptIndex || getBargeinIndex()
    let currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
    tts.read(currentSentenceIndices.start)
}

export const resumeReadAfterDisplayTimeout = () => {
    let workingTextSentenceIndex = getCurrentWorkingTextSentenceIndex() + 1
    // console.log('(resumeReadAfterDisplayTimeout) Retrieving and computing workingTextSentenceIndex :', workingTextSentenceIndex)
    let sentenceDelimiterIndices = generateSentenceDelimiterIndicesList(quill.getText())

    if (workingTextSentenceIndex < sentenceDelimiterIndices.length)
        tts.read(getSentenceCharIndicesGivenSentenceIndex(quill.getText(), workingTextSentenceIndex).start)
}