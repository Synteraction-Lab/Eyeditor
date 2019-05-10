import * as tts from './tts.js'
import { quill } from './quill.js'
import { getUpdateParameter, getBargeinIndex } from './utteranceparser.js'
import { getIndexOfLastPunctuation } from './stringutils.js'

const feedbackRate = {
    'ERROR': 1.0,
    'SUCCESS': 1.0
}

export const speakFeedback = (feedback, type) => {
    tts.speak( feedback, feedbackRate[type] )
}

export const readTextOnUpdate = () => {
    tts.read(getIndexOfLastPunctuation( quill.getText(), getUpdateParameter().startIndex ) + 2)
}

export const readTextOnFailedUpdate = () => {
    tts.read(getIndexOfLastPunctuation( quill.getText(), getBargeinIndex() ) + 2)
}