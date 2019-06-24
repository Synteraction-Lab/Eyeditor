import * as editor from '../TextEditor.js'
import { quill } from '../../Services/quill.js'
import { findInText } from '../../Utils/stringutils.js'
import { handleError } from '../ErrorHandler.js';
import { provideSuccessFeedback, provideFailureFeedback } from './feedback.js'
import { readNextSentence, readPrevSentence, repeatSentence, readFromIndex } from '../AudioFeedbackHandler.js';
import { navigateContext, isDisplayON, navigateWorkingText, getCurrentWorkingText, feedbackOfWorkingTextOnNavigation, fireDisplayOffRoutine, fireDisplayOnRoutine, renderStatusOnBladeDisplay, setCurrentWorkingTextFromSentenceIndex } from '../FeedbackHandler.js';
import { getFeedbackConfiguration } from '../../main.js';
import { setFeedbackModality, getFeedbackModality } from '../../Drivers/RingControllerDriver.js';
import { getSentenceIndexFromBargeinIndex } from '../UtteranceParser.js'

export const handleCommand = (keyword, arg, workingText, isControllerRequest) => {
    let updateParameter;
    isControllerRequest = isControllerRequest || false;

    let feedbackConfig = getFeedbackConfiguration();
    let quillSnapshotBeforeUpdate;

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
                quillSnapshotBeforeUpdate = (isControllerRequest) ? quill.getText() : undefined

                let indexOfUndo = editor.undo()
                updateParameter = {startIndex: indexOfUndo}
                // console.log('index of undo', indexOfUndo)
                
                if (indexOfUndo >= 0)   provideSuccessFeedback('Undone', updateParameter, quillSnapshotBeforeUpdate)
                    else                provideFailureFeedback('There is nothing more to undo.')
                    
                break;

            case 'redo':
                quillSnapshotBeforeUpdate = (isControllerRequest) ? quill.getText() : undefined

                let indexOfRedo = editor.redo()
                updateParameter = {startIndex: indexOfRedo}
                // console.log('index of redo', indexOfRedo)
                
                if (indexOfRedo >= 0)   provideSuccessFeedback('Redone', updateParameter, quillSnapshotBeforeUpdate)
                    else                provideFailureFeedback('There is nothing more to redo.')

                break;

            case 'previous':
                if ( feedbackConfig === 'AOD_SCROLL' || feedbackConfig === 'ODD_FLEXI' && isDisplayON() ) {
                    navigateWorkingText('PREV')
                    return;
                }
                else {
                    if ( feedbackConfig === 'DISP_ON_DEMAND' && isDisplayON() )
                        fireDisplayOffRoutine(true)
                
                    readPrevSentence(true)
                }
                break;
            
            case 'next':
                if ( feedbackConfig === 'AOD_SCROLL' || feedbackConfig === 'ODD_FLEXI' && isDisplayON() ) {
                    navigateWorkingText('NEXT')
                    return;
                }
                else {
                    if ( feedbackConfig === 'DISP_ON_DEMAND' && isDisplayON() )
                        fireDisplayOffRoutine(true)

                    readNextSentence(true)
                }
                break;
            
            case 'repeat':
                repeatSentence()
                break;

            case 'read':
                if ( feedbackConfig === 'EYES_FREE' )
                    repeatSentence()
                else if ( feedbackConfig === 'ODD_FLEXI' ) {
                    if (getFeedbackModality() === 'DISP') {
                        setFeedbackModality('AUDIO')
                        fireDisplayOffRoutine(true)
                    }
                    else
                        renderStatusOnBladeDisplay(null)

                    readFromIndex(getCurrentWorkingText().startIndex)
                }
                else if ( feedbackConfig === 'DISP_ON_DEMAND' ) {
                    if (isDisplayON())
                        fireDisplayOffRoutine()
                    else
                        repeatSentence()
                }
                break;

            case 'stop':
                if ( feedbackConfig === 'ODD_FLEXI' && getFeedbackModality() === 'AUDIO' )
                    renderStatusOnBladeDisplay('Reading Paused.')
                break;

            case 'show':
                if ( feedbackConfig === 'ODD_FLEXI' ) {
                    if (getFeedbackModality() === 'AUDIO') {
                        setFeedbackModality('DISP');
                        setCurrentWorkingTextFromSentenceIndex( getSentenceIndexFromBargeinIndex() )
                    }
                    
                    feedbackOfWorkingTextOnNavigation()
                    fireDisplayOnRoutine()
                }
                break;

            case 'hide':
                if ( feedbackConfig === 'ODD_FLEXI' && getFeedbackModality() === 'DISP' ) {
                    fireDisplayOffRoutine(true)
                    renderStatusOnBladeDisplay('Display Paused.')
                }
                else if ( feedbackConfig === 'DISP_ON_DEMAND')
                    fireDisplayOffRoutine()
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