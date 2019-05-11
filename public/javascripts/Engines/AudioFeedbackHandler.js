import * as tts from '../Services/tts.js'
import { quill } from '../Services/quill.js'
import { getBargeinIndex } from './UtteranceParser.js'
import { getIndexOfLastPunctuation } from '../Utils/stringutils.js'
import { getFeedbackConfiguration } from '../main.js';

const feedbackRate = {
    'ERROR': 1.0,
    'SUCCESS': 1.0
}

export const speakFeedback = (feedback, type) => {
    tts.speak( feedback, feedbackRate[type] )
}

export const readTextOnUpdate = (updateParameter) => {
    if (getFeedbackConfiguration() !== 'DISP_ALWAYS_ON')
        tts.read(getIndexOfLastPunctuation( quill.getText(), updateParameter.startIndex ) + 2)
}

export const readTextOnFailedUpdate = () => {
    if (getFeedbackConfiguration() !== 'DISP_ALWAYS_ON')
        tts.read(getIndexOfLastPunctuation( quill.getText(), getBargeinIndex() ) + 2)
}