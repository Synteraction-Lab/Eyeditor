import * as editor from './TextEditor.js'
import { quill } from './quill.js'
import * as stringutils from './stringutils.js'
import { handleError } from './error.js';
import { speakFeedback } from './feedback.js';
import * as tts from './tts.js';
import { getBargeinIndex } from './utteranceparser.js';

export const handleCommand = (keyword, arg, workingText) => {
    try {
        switch ( keyword ) {
            case 'delete': 
                if (arg.length == 0)
                    throw 'INSUFFICIENT_NO_OF_ARGS'
                
                let findResult = stringutils.findinText(arg, workingText.text)

                if (findResult) {
                    var updateParameter = {
                        startIndex: workingText.startIndex + findResult.startIndex,
                        length: findResult.length
                    }
            
                    editor.deleteText( updateParameter )
                    .then(editor.refreshText( quill.getText() ))   // re-format existing text to purge out any formatting anomalies due to prev. operations
                    
                    speakFeedback('Deleted', 'SUCCESS')

                    tts.read(stringutils.getIndexOfLastPunctuation( quill.getText(), updateParameter.startIndex ) + 2)
                }
                else throw 'PHRASE_NOT_FOUND'
                break;
            
            case 'undo':
                editor.undo()
                speakFeedback('Undone.', 'SUCCESS')
                tts.read(stringutils.getIndexOfLastPunctuation( quill.getText(), getBargeinIndex() ) + 2)
                break;

            case 'redo':
                editor.redo()
                speakFeedback('Redone.', 'SUCCESS')
                tts.read(stringutils.getIndexOfLastPunctuation( quill.getText(), getBargeinIndex() ) + 2)
                break;
        }
    }

    catch(err) {
        switch(err) {
            case 'PHRASE_NOT_FOUND':
                handleError(err, arg)
                break
            case 'INSUFFICIENT_NO_OF_ARGS':
                handleError(err)
                break
        }
        
        tts.read(stringutils.getIndexOfLastPunctuation( quill.getText(), getBargeinIndex() ) + 2)
    }
}


