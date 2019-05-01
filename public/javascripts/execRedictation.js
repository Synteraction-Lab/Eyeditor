import { findLeftContext, findRightContext, getIndexOfLastPunctuation } from './stringutils.js';
import { replaceText, refreshText } from './TextEditor.js'
import { quill } from './quill.js'
import { speakFeedback } from './feedback.js'
import * as tts from './tts.js'

export const handleRedictation = (utterance, workingText) => {
    let rightContext = findRightContext(workingText.text, utterance)
    let leftContext = findLeftContext(workingText.text.substring(0, rightContext.matchIndex-1), utterance)
    
    console.log('left context::', leftContext)
    console.log('right context::', rightContext)

    if ( leftContext.matchIndex >= 0 && rightContext.matchIndex >= 0 ) {
        var updateParameter = {
            startIndex: workingText.startIndex + leftContext.matchIndex,
            length: rightContext.matchIndex + rightContext.matchText.length - leftContext.matchIndex,
            updateText: utterance
        }

        console.log('update Parameters for redict', updateParameter)

        replaceText( updateParameter )
        .then(refreshText( quill.getText() ))   // re-format existing text to purge out any formatting anomalies due to prev. operations
                    
        speakFeedback('Text Updated', 'SUCCESS')

        tts.read(getIndexOfLastPunctuation( quill.getText(), updateParameter.startIndex ) + 2)
    }
}