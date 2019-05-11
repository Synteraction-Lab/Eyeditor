import * as editor from './TextEditor.js'
import { quill } from '../Services/quill.js'
import { findinText } from '../Utils/stringutils.js'
import { handleError } from '../error.js';
import { speakFeedback, readTextOnFailedUpdate, readTextOnUpdate } from './AudioFeedbackHandler.js';
import { setUpdateParameter } from './UtteranceParser.js';

export const handleCommand = (keyword, arg, workingText) => {
    let updateParameter;
    try {
        switch ( keyword ) {
            case 'delete': 
                if (arg.length == 0)
                    throw 'INSUFFICIENT_NO_OF_ARGS'
                
                let findResult = findinText(arg, workingText.text)

                if (findResult) {
                    updateParameter = {
                        startIndex: workingText.startIndex + findResult.startIndex,
                        length: findResult.length
                    }

                    setUpdateParameter(updateParameter);
            
                    editor.deleteText( updateParameter )
                    .then(editor.refreshText( quill.getText() ))   // re-format existing text to purge out any formatting anomalies due to prev. operations
                    
                    speakFeedback('Deleted', 'SUCCESS')
                    readTextOnUpdate()
                }
                else throw 'PHRASE_NOT_FOUND'
                break;
            
            case 'undo':
                editor.undo()
                speakFeedback('Undone.', 'SUCCESS')
                readTextOnFailedUpdate()
                break;

            case 'redo':
                editor.redo()
                speakFeedback('Redone.', 'SUCCESS')
                readTextOnFailedUpdate()
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
        
        readTextOnFailedUpdate()
    }
}


