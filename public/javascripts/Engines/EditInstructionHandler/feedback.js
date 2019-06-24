import { quill } from '../../Services/quill.js'
import { getSentenceSnippetBetweenIndices, getSentenceIndexGivenCharIndexPosition, getSentenceCharIndicesGivenSentenceIndex } from '../../Utils/stringutils.js'
import { feedbackOnCommandExecution } from '../FeedbackHandler.js';
import { speakFeedback, readTextOnUpdate, readTextOnFailedUpdate } from '../AudioFeedbackHandler.js';
import { getQuillSnapshotBeforeUpdate } from '../UtteranceParser.js';

export const provideSuccessFeedback = (audioFeedbackMeta, updateParameter, quillSnapshotBeforeUpdate) => {
    quillSnapshotBeforeUpdate = quillSnapshotBeforeUpdate || getQuillSnapshotBeforeUpdate();
    let updatedSentenceIndex = getSentenceIndexGivenCharIndexPosition( quillSnapshotBeforeUpdate, updateParameter.startIndex )
    let updatedSentence = getSentenceSnippetBetweenIndices( quill.getText(), getSentenceCharIndicesGivenSentenceIndex(quill.getText(), updatedSentenceIndex) )

    feedbackOnCommandExecution(updatedSentence, updatedSentenceIndex)
    speakFeedback(audioFeedbackMeta, 'SUCCESS')
    readTextOnUpdate(updateParameter)
}

export const provideFailureFeedback = (audioFeedbackMeta) => {
    if (audioFeedbackMeta)
        speakFeedback(audioFeedbackMeta, 'ERROR')
    readTextOnFailedUpdate();
}