import * as editor from '../TextEditor.js'
import { quill } from '../../Services/quill.js'
import { findInText } from '../../Utils/stringutils.js'
import { handleError } from '../ErrorHandler.js';
import { provideSuccessFeedback, provideFailureFeedback } from './feedback.js'
import { readNextSentence, readPrevSentence, repeatSentence, stopReading } from '../AudioFeedbackHandler.js';
import { navigateContext, isDisplayON, fireDisplayOffRoutine, navigateWorkingText } from '../FeedbackHandler.js';
import { getFeedbackConfiguration } from '../../main.js';

export const handleCommand = (keyword, arg, workingText, isControllerRequest) => {
    let updateParameter;
    isControllerRequest = isControllerRequest || false;

    try {
        switch ( keyword ) {
            case 'delete': 
                if (arg.length == 0)
                    throw 'INSUFFICIENT_NO_OF_ARGS'
                
                let findResult = findInText(arg, workingText.text)

                if (findResult) {
                    updateParameter = {
                        startIndex: workingText.startIndex + findResult.startIndex,
                        length: findResult.length
                    }

                    editor.deleteText( updateParameter )
                    .then(editor.refreshText( quill.getText() ))   // re-format existing text to purge out any formatting anomalies due to prev. operations
                    
                    provideSuccessFeedback('Deleted', updateParameter)
                }
                else throw 'PHRASE_NOT_FOUND'
                break;
            
            case 'undo':
                let indexOfUndo = editor.undo()
                updateParameter = {startIndex: indexOfUndo}
                
                if (indexOfUndo >= 0)   provideSuccessFeedback('Undone', updateParameter)
                    else                provideFailureFeedback('There is nothing more to undo.')
                    
                break;

            case 'redo':
                let indexOfRedo = editor.redo()
                updateParameter = {startIndex: indexOfRedo}
                
                if (indexOfRedo >= 0)   
                    provideSuccessFeedback('Redone', updateParameter)
                else {
                    if ( isControllerRequest && getFeedbackConfiguration() === 'DISP_ON_DEMAND' && isDisplayON() )
                        fireDisplayOffRoutine()
                    else
                        provideFailureFeedback('There is nothing more to redo.')
                }
                    
                break;

            case 'previous':
                if ( getFeedbackConfiguration() === 'AOD_SCROLL' ) {
                    navigateWorkingText('PREV')
                    return;
                }
                else {
                    if ( getFeedbackConfiguration() === 'DISP_ON_DEMAND' && isDisplayON() )
                        fireDisplayOffRoutine(true)
                
                    readPrevSentence(true)
                }
                break;
            
            case 'next':
                if (getFeedbackConfiguration() === 'AOD_SCROLL') {
                    navigateWorkingText('NEXT')
                    return;
                }
                else {
                    if ( getFeedbackConfiguration() === 'DISP_ON_DEMAND' && isDisplayON() )
                        fireDisplayOffRoutine(true)

                    readNextSentence(true)
                }
                break;
            
            case 'repeat':
                repeatSentence()
                break;

            case 'cancel':
                stopReading()
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

        provideFailureFeedback()
    }
}


export const handleCommandPrioritizedWorkingText = (keyword, arg, workingText) => {
    let updateParameter

    switch ( keyword ) {
        case 'delete': 
            if (arg.length == 0) {
                handleError('INSUFFICIENT_NO_OF_ARGS')
                return true;
            }
            
            let findResult = findInText(arg, workingText.text)
            if (findResult) {
                updateParameter = {
                    startIndex: workingText.startIndex + findResult.startIndex,
                    length: findResult.length
                }

                editor.deleteText( updateParameter )
                .then(editor.refreshText( quill.getText() ))   // re-format existing text to purge out any formatting anomalies due to prev. operations
                
                provideSuccessFeedback('Deleted', updateParameter)
                return true;
            } 
            else 
                return false;
        
        case 'undo':
            let indexOfUndo = editor.undo()
            updateParameter = {startIndex: indexOfUndo}
            
            if (indexOfUndo >= 0)   provideSuccessFeedback('Undone', updateParameter)
                else                provideFailureFeedback('There is nothing more to undo.')
            
            return true;

        case 'redo':
            let indexOfRedo = editor.redo()
            updateParameter = {startIndex: indexOfRedo}
            
            if (indexOfRedo >= 0)   provideSuccessFeedback('Redone', updateParameter)
                else                provideFailureFeedback('There is nothing more to redo.')
            
            return true;

        case 'previous':
            navigateContext('PREV')
            return true;

        case 'next':
            navigateContext('NEXT')
            return true;
    }
}