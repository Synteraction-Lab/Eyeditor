import * as tts from '../Services/tts.js'
import { getSentenceIndices, generateSentenceDelimiterIndicesList } from '../Utils/stringutils.js';
import { quill } from '../Services/quill.js';
import { handleCommand } from '../Engines/EditInstructionHandler/Commanding.js';
import { getFeedbackConfiguration } from '../main.js'
import { feedbackOnTextNavigation } from '../Engines/FeedbackHandler.js'

const LEFT_KEY_CODE = 33
const RIGHT_KEY_CODE = 34
const UNDO_KEY_CODE_1 = 116
const UNDO_KEY_CODE_2 = 27
const REDO_KEY_CODE = 66
const READ_RESTART_INDEX = 0
const prevSentenceRequestDelta = 12 // if LEFT is clicked within first 10 chars of current sent., TTS reads the prev. sentence.
const CUT_KEY_INPUT_DELAY = 3 // 0.1 seconds = 100ms

var timer = new Timer()
var accControllerPresses
var lastKeyPressCode
var interruptIndex
var isDispAlwaysOnMode
var currentContext = 0  // context captures the sentence number/index

export const getCurrentContext = () => currentContext;

// timer.addEventListener('secondTenthsUpdated', function (e) {
    // console.log('Timer ::', timer.getTimeValues().toString(['hours', 'minutes', 'seconds', 'secondTenths']));
// });

timer.addEventListener('targetAchieved', function (e) {
    timer.stop()
    console.log('accControllerPresses', accControllerPresses)
    
    handleControllerEvent(classifyControllerEvent())
});

document.addEventListener('keydown', function(e) {
    isDispAlwaysOnMode = (getFeedbackConfiguration() === 'DISP_ALWAYS_ON')
    if (!isDispAlwaysOnMode) {
        tts.pause()
        interruptIndex = (tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex()) || 0
    }
    
    lastKeyPressCode = e.keyCode
    fireControllerEvent()
})

const fireControllerEvent = () => {
    if (!timer.isRunning()) {
        accControllerPresses = 1;
        timer.start({precision: 'secondTenths', countdown: true, startValues: {secondTenths: CUT_KEY_INPUT_DELAY}});
    } 
    else {
        accControllerPresses += 1
        timer.reset()
    }
}

const classifyControllerEvent = () => {
    let controllerEvent
    switch(lastKeyPressCode) {
        case LEFT_KEY_CODE:
            if (!isDispAlwaysOnMode) {
                if (accControllerPresses > 3 || interruptIndex == 0) 
                            controllerEvent = 'READ_FROM_BEGINNING'
                    else    controllerEvent = 'READ_PREV'
            } 
            else    controllerEvent = 'CONTEXT_PREV'
            break;
        case RIGHT_KEY_CODE:
            if (!isDispAlwaysOnMode) {
                if (interruptIndex == 0) 
                            controllerEvent = 'READ_FROM_BEGINNING'
                    else    controllerEvent = 'READ_NEXT'
            } 
            else    controllerEvent = 'CONTEXT_NEXT'
            break;
        case UNDO_KEY_CODE_1:
        case UNDO_KEY_CODE_2:
            if (accControllerPresses > 3)   handleCommand('undo')
            break;
        case REDO_KEY_CODE:
            if (accControllerPresses > 3 && !quill.hasFocus())   handleCommand('redo')
            break;
    }

    return {
        event: controllerEvent, 
        nPress: accControllerPresses
    }
}

const handleControllerEvent = (event) => {
    let i;
    let currentSentenceIndices;
    let sentenceDelimiterIndices;

    switch(event.event) {
        case 'READ_FROM_BEGINNING':
            tts.read(READ_RESTART_INDEX)
            break;

        case 'READ_PREV':
            for (i=0; i < event.nPress; i++) {
                currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
                if (event.nPress > 1)
                    interruptIndex = currentSentenceIndices.start - 2
            }

            if (event.nPress == 1 && ( interruptIndex - currentSentenceIndices.start < prevSentenceRequestDelta ))
                currentSentenceIndices = getSentenceIndices(quill.getText(), currentSentenceIndices.start - 2)

            tts.read(currentSentenceIndices.start)
            break;

        case 'READ_NEXT':
            currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
            for (i=0; i < event.nPress; i++) {
                if (currentSentenceIndices.end < quill.getText().length - 1) {
                    interruptIndex = currentSentenceIndices.end + 2 
                    currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
                }
                else break;
            }
            
            tts.read(currentSentenceIndices.start)
            break;

        case 'CONTEXT_PREV':    // both context_prev and context_next are only for always-on display
            currentContext = currentContext - event.nPress
            if (currentContext < 0)
                currentContext = 0

            feedbackOnTextNavigation(currentContext)
            break;

        case 'CONTEXT_NEXT':
            sentenceDelimiterIndices = generateSentenceDelimiterIndicesList(quill.getText())

            currentContext = currentContext + event.nPress
            if (currentContext >= sentenceDelimiterIndices.length)
                currentContext = sentenceDelimiterIndices.length - 1
            
            feedbackOnTextNavigation(currentContext)
            break;
    }
}