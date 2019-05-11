import { quill } from '../../Services/quill.js'
import { getSentenceIndices, getSentenceSnippetBetweenIndices } from '../../Utils/stringutils.js'
import { feedbackOnCommandExecution } from '../FeedbackHandler.js';
import { speakFeedback, readTextOnUpdate, readTextOnFailedUpdate } from '../AudioFeedbackHandler.js';

export const provideSuccessFeedback = (audioFeedbackMeta, updateParameter) => {
    let updatedSentence = getSentenceSnippetBetweenIndices(quill.getText(), getSentenceIndices(quill.getText(), updateParameter.startIndex))
    feedbackOnCommandExecution(updateParameter, updatedSentence)
    speakFeedback(audioFeedbackMeta, 'SUCCESS')
    readTextOnUpdate(updateParameter)
}

export const provideFailureFeedback = (audioFeedbackMeta) => {
    if (audioFeedbackMeta)
        speakFeedback(audioFeedbackMeta, 'ERROR')
    readTextOnFailedUpdate();
}