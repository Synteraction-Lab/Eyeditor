import * as tts from './tts.js'
import { quill } from './quill.js'
import { getUpdateParameter, getBargeinIndex } from './utteranceparser.js'
import { getIndexOfLastPunctuation } from './stringutils.js'
import { getFeedbackConfiguration } from './main.js';

const feedbackRate = {
    'ERROR': 1.0,
    'SUCCESS': 1.0
}

export const speakFeedback = (feedback, type) => {
    tts.speak( feedback, feedbackRate[type] )
}

export const readTextOnUpdate = () => {
    if (getFeedbackConfiguration() !== 'DISP_ALWAYS_ON')
        tts.read(getIndexOfLastPunctuation( quill.getText(), getUpdateParameter().startIndex ) + 2)
}

export const readTextOnFailedUpdate = () => {
    if (getFeedbackConfiguration() !== 'DISP_ALWAYS_ON')
        tts.read(getIndexOfLastPunctuation( quill.getText(), getBargeinIndex() ) + 2)
}