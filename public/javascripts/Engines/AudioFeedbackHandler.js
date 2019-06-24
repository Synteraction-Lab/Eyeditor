import * as tts from '../Services/tts.js'
import { quill } from '../Services/quill.js'
import { getBargeinIndex, getWasTTSReadingBeforeUtterance } from './UtteranceParser.js'
import { getIndexOfLastPunctuation, getSentenceIndices, generateSentenceDelimiterIndicesList, getSentenceCharIndicesGivenSentenceIndex } from '../Utils/stringutils.js'
import { getFeedbackConfiguration } from '../main.js';
import { getPTTStatus, getWasTTSReading } from '../Drivers/RingControllerDriver.js';
import { isDisplayON, getCurrentWorkingTextSentenceIndex, getCurrentWorkingText } from './FeedbackHandler.js';

const prevSentenceRequestDelta = 12 // if LEFT is clicked within first 12 chars of current sentence, TTS reads the prev. sentence.
const feedbackRate = {
    'ERROR': 1.0,
    'SUCCESS': 1.0,
    'DEFAULT': 1.0
}
const READ_RESTART_INDEX = 0

export const speakFeedback = (feedback, type) => {
    type = type || 'DEFAULT'
    tts.speak( feedback, feedbackRate[type] )
}

export const readTextOnUpdate = (updateParameter) => {
    let feedbackConfig = getFeedbackConfiguration()
    if (    feedbackConfig === 'DISP_ALWAYS_ON'
        ||  feedbackConfig === 'AOD_SCROLL'
        || ( ['DISP_ON_DEMAND', 'ODD_FLEXI'].includes(feedbackConfig) && isDisplayON() )
        ||  getPTTStatus() === 'PTT_ON'     )
        return;
    else
        tts.read(getIndexOfLastPunctuation( quill.getText(), updateParameter.startIndex ) + 2)
}

export const readTextOnFailedUpdate = () => {
    let feedbackConfig = getFeedbackConfiguration()
    if (    feedbackConfig === 'DISP_ALWAYS_ON'
        ||  feedbackConfig === 'AOD_SCROLL'
        || ( ['DISP_ON_DEMAND', 'ODD_FLEXI'].includes(feedbackConfig) && isDisplayON() )
        ||  getPTTStatus() === 'PTT_ON'     )
        return;
    else 
        tts.read(getIndexOfLastPunctuation( quill.getText(), getBargeinIndex() ) + 2)
}

export const resumeReadAfterGeneralInterrupt = () => { readTextOnFailedUpdate() }

export const resumeReadAfterDisplayTimeout = () => {
    let workingTextSentenceIndex = getCurrentWorkingTextSentenceIndex() + 1
    let sentenceDelimiterIndices = generateSentenceDelimiterIndicesList(quill.getText())

    if (workingTextSentenceIndex < sentenceDelimiterIndices.length)
        tts.read(getSentenceCharIndicesGivenSentenceIndex(quill.getText(), workingTextSentenceIndex).start)
}

export const readPrevSentence = (isVoiceRequest) => {
    isVoiceRequest = isVoiceRequest || false

    if ( ( isVoiceRequest && getWasTTSReadingBeforeUtterance() ) || ( !isVoiceRequest && getWasTTSReading() ) ) {
        let interruptIndex = getBargeinIndex()
        let currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
        if (interruptIndex - currentSentenceIndices.start < prevSentenceRequestDelta || isVoiceRequest)
            currentSentenceIndices = getSentenceIndices(quill.getText(), currentSentenceIndices.start - 2)
        tts.read(currentSentenceIndices.start)
    }
    else if ( getFeedbackConfiguration() === 'DISP_ON_DEMAND' || getFeedbackConfiguration() === 'ODD_FLEXI' ) {
        let workingTextSentenceIndex = getCurrentWorkingTextSentenceIndex() - 1
        if (workingTextSentenceIndex < 0)   workingTextSentenceIndex = 0
        tts.read(getSentenceCharIndicesGivenSentenceIndex(quill.getText(), workingTextSentenceIndex).start)
    }
}

export const readNextSentence = (isVoiceRequest) => {
    isVoiceRequest = isVoiceRequest || false

    if ( ( isVoiceRequest && getWasTTSReadingBeforeUtterance() ) || ( !isVoiceRequest && getWasTTSReading() ) ) {
        let interruptIndex = getBargeinIndex()
        let currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
        if (currentSentenceIndices.end < quill.getText().length - 1) {
            interruptIndex = currentSentenceIndices.end + 2
            currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
        }
        tts.read(currentSentenceIndices.start)
    }
    else if ( getFeedbackConfiguration() === 'DISP_ON_DEMAND' || getFeedbackConfiguration() === 'ODD_FLEXI' )
        resumeReadAfterDisplayTimeout()
}

export const repeatSentence = () => {
    tts.read(getSentenceCharIndicesGivenSentenceIndex(quill.getText(), getCurrentWorkingTextSentenceIndex()).start)
}

// export const repeatSentence = () => {
//     let interruptIndex = getBargeinIndex()
//     let currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
//     tts.read(currentSentenceIndices.start)
// }

export const stopReading = () => { tts.pause() }
export const readFromStart = () => { tts.read(READ_RESTART_INDEX) }
export const readFromIndex = (index) => { tts.read(index) }

// export const toggleRead = () => {
//     if (!getWasTTSReading()) {
//         let charIndex = getCurrentWorkingText() && getCurrentWorkingText().startIndex || 0 
//         readFromIndex(charIndex)
//     }
// }

export const toggleReadEyesFree = () => {
    if (!getWasTTSReading())
        repeatSentence()
}