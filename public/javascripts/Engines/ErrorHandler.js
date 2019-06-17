import { speakFeedback } from './AudioFeedbackHandler.js';

const TYPE_ERROR_FEEDBACK = 'ERROR'

export const handleError = (code, arg) => {
    arg = arg || '' 
    switch (code) {
        case 'PHRASE_NOT_FOUND':
            speakFeedback(`Couldn\'t find a match for ${arg}.`, TYPE_ERROR_FEEDBACK)
            break
        case 'INSUFFICIENT_NO_OF_ARGS':
            speakFeedback(`Insufficient number of arguments.`, TYPE_ERROR_FEEDBACK)
            break
        case 'NO_UPDATE':
            speakFeedback(`Nothing to update.`, TYPE_ERROR_FEEDBACK)
            break
        case 'EDIT_MODE_NOT_SUPPORTED':
            speakFeedback(`Edit Mode not supported in this configuration. Please switch back to the default mode.`, TYPE_ERROR_FEEDBACK)
            break;
    }
}