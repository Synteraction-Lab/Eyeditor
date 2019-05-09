import * as tts from './tts.js'

const feedbackRate = {
    'ERROR': 1.0,
    'SUCCESS': 1.0
}

export const speakFeedback = (feedback, type) => {
    tts.speak( feedback, feedbackRate[type] )
}