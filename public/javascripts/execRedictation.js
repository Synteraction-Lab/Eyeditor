import { findLeftContext, findRightContext, getIndexOfLastPunctuation, stripLeftContext, stripRightContext } from './stringutils.js';
import { insertText, replaceText, refreshText } from './TextEditor.js'
import { quill } from './quill.js'
import { speakFeedback } from './feedback.js'
import * as tts from './tts.js'
import { getBargeinIndex } from './utteranceparser.js'

var updateParameter;

export const handleRedictation = (utterance, workingText) => {
    let rightContext = findRightContext(workingText.text, utterance)
    let leftContext
    
    if (rightContext.matchIndex >= 0)   
        leftContext = findLeftContext(workingText.text.substring(0, rightContext.matchIndex-1), utterance)
    else    
        leftContext = findLeftContext(workingText.text, utterance)

    if (leftContext.matchText === utterance || rightContext.matchText === utterance) {
        speakFeedback('Nothing to update.', 'ERROR')
        tts.read(getIndexOfLastPunctuation( quill.getText(), getBargeinIndex() ) + 2)
    }

    else if ( leftContext.matchIndex >= 0 && rightContext.matchIndex >= 0 ) {
        updateParameter = {
            startIndex: workingText.startIndex + leftContext.matchIndex,
            length: rightContext.matchIndex + rightContext.matchText.length - leftContext.matchIndex,
            updateText: utterance
        }

        replaceText( updateParameter )
        .then(refreshText( quill.getText() ))
        
        speakFeedback('Text Updated', 'SUCCESS')
        tts.read(getIndexOfLastPunctuation( quill.getText(), updateParameter.startIndex ) + 2)
    }

    else if ( leftContext.matchIndex >= 0 ) {
        let regexNextWordString = `(?<=\\b${leftContext.matchText}\\b)[;,:]*\\s(\\b\\w+\\b)`
        let regexNextWord = new RegExp(regexNextWordString, 'gi')

        let match = regexNextWord.exec(workingText.text)

        if (match) {
            updateParameter = {
                startIndex: workingText.startIndex + match.index + (match[0].length - match[1].length),
                length: match[1].length,
                updateText: stripLeftContext(utterance, leftContext.matchText)
            }

            replaceText( updateParameter )
            .then(refreshText( quill.getText() ))
        }

        else {
            updateParameter = {
                startIndex: workingText.startIndex + leftContext.matchIndex + leftContext.matchText.length,
                length: 0,
                updateText: ' ' + stripLeftContext(utterance, leftContext.matchText)
            }
            
            insertText( updateParameter )
            .then(refreshText( quill.getText() ))
        }

        speakFeedback('Text Updated', 'SUCCESS')
        tts.read(getIndexOfLastPunctuation( quill.getText(), updateParameter.startIndex ) + 2)
    }

    else if ( rightContext.matchIndex >= 0 ) {
        let regexPrevWordString = `(\\b\\w+\\b)(?=[;,:]*\\s\\b${rightContext.matchText}\\b)`
        let regexPrevWord = new RegExp(regexPrevWordString, 'gi')

        let match = regexPrevWord.exec(workingText.text)
        
        if (match) {
            updateParameter = {
                startIndex: workingText.startIndex + match.index,
                length: match[0].length,
                updateText: stripRightContext(utterance, rightContext.matchText)
            }

            replaceText( updateParameter )
            .then(refreshText( quill.getText() ))
        }

        else {
            updateParameter = {
                startIndex: workingText.startIndex + rightContext.matchIndex - 2,
                length: 0,
                updateText: stripRightContext(utterance, rightContext.matchText)
            }

            insertText( updateParameter )
            .then(refreshText( quill.getText() ))
        }

        speakFeedback('Text Updated', 'SUCCESS')
        tts.read(getIndexOfLastPunctuation( quill.getText(), updateParameter.startIndex ) + 2)
    }
}