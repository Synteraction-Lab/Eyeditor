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
const prevSentenceRequestDelta = 12 // if LEFT is clicked within first 12 chars of current sentence, TTS reads the prev. sentence.
const LONG_PRESS_TRIGGER_DELAY = 3 // 0.3 seconds = 300ms
const keyStatus = {}
const isKeyLongPressed = {}
const SWITCH = {
    on: true,
    off: false,
}
Object.freeze(SWITCH)


var longPressTimer = new Timer()
var lastKeyPressCode
var interruptIndex
var isDispAlwaysOnMode
var isDispOnDemandMode
var currentContext = 0  // context captures the sentence number/index

export const getCurrentContext = () => currentContext;

// longPressTimer.addEventListener('secondTenthsUpdated', function (e) {
    // console.log('longPressTimer ::', longPressTimer.getTimeValues().toString(['hours', 'minutes', 'seconds', 'secondTenths']));
// });

longPressTimer.addEventListener('targetAchieved', function (e) {
    longPressTimer.stop()
    handleLongPressEvent()
});

document.addEventListener('keydown', function(e) {
    /* reject multiple undos/redos */
    if (keyStatus[e.keyCode] && [UNDO_KEY_CODE_1, UNDO_KEY_CODE_2, REDO_KEY_CODE].includes(e.keyCode) && keyStatus[e.keyCode] === SWITCH.on)
        return;

    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
            isDispAlwaysOnMode = false;
            isDispOnDemandMode = false;

            tts.pause()
            interruptIndex = (tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex()) || 0
            
            keyStatus[e.keyCode] = SWITCH.on
            lastKeyPressCode = e.keyCode

            handleControllerEvent(classifyControllerEvent())
            break;

        case 'DISP_ON_DEMAND':
            isDispAlwaysOnMode = false;
            isDispOnDemandMode = true;

            tts.pause()
            interruptIndex = (tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex()) || 0

            keyStatus[e.keyCode] = SWITCH.on
            lastKeyPressCode = e.keyCode

            if ( e.keyCode === REDO_KEY_CODE )
                longPressTimer.start({ precision: 'secondTenths', countdown: true, startValues: { secondTenths: LONG_PRESS_TRIGGER_DELAY } });
            else
                handleControllerEvent(classifyControllerEvent())
            break;

        case 'DISP_ALWAYS_ON':
            isDispAlwaysOnMode = true;
            isDispOnDemandMode = false;

            keyStatus[e.keyCode] = SWITCH.on
            lastKeyPressCode = e.keyCode

            handleControllerEvent(classifyControllerEvent())
            break;
    }
})

document.addEventListener('keyup', function (e) {
    keyStatus[e.keyCode] = SWITCH.off

    if (isDispOnDemandMode && e.keyCode === REDO_KEY_CODE) {
        if ( isKeyLongPressed[e.keyCode] )
            isKeyLongPressed[e.keyCode] = false;
        else
            handleControllerEvent(classifyControllerEvent())
    }
})

const handleLongPressEvent = () => {
    if (keyStatus[lastKeyPressCode] === SWITCH.on) {
        isKeyLongPressed[lastKeyPressCode] = true;
        handleControllerEvent(classifyControllerEvent())
    }
}

const classifyControllerEvent = () => {
    let controllerEvent
    switch(lastKeyPressCode) {
        case LEFT_KEY_CODE:
            if (!isDispAlwaysOnMode) {
                if (interruptIndex == 0) 
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
            controllerEvent = 'UNDO'
            break;
        case REDO_KEY_CODE:
            if ( !quill.hasFocus() ) {
                if( !isKeyLongPressed[REDO_KEY_CODE] )
                        controllerEvent = 'REDO'
                else    controllerEvent = 'PUSH_TO_TALK'
            }
            break;
    }

    return controllerEvent;
}

const handleControllerEvent = (event) => {
    let i;
    let currentSentenceIndices;
    let sentenceDelimiterIndices;

    switch(event) {
        case 'READ_FROM_BEGINNING':
            tts.read(READ_RESTART_INDEX)
            break;

        case 'READ_PREV':
            currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
            if ( interruptIndex - currentSentenceIndices.start < prevSentenceRequestDelta )
                currentSentenceIndices = getSentenceIndices(quill.getText(), currentSentenceIndices.start - 2)

            tts.read(currentSentenceIndices.start)
            break;

        case 'READ_NEXT':
            currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
            if (currentSentenceIndices.end < quill.getText().length - 1) {
                interruptIndex = currentSentenceIndices.end + 2 
                currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
            }
            
            tts.read(currentSentenceIndices.start)
            break;
        
        case 'UNDO':
            handleCommand('undo');
            break;

        case 'REDO':
            handleCommand('redo');
            break;

        case 'CONTEXT_PREV':    // both context_prev and context_next are only for always-on display
            currentContext = currentContext - 1
            if (currentContext < 0)
                currentContext = 0

            feedbackOnTextNavigation(currentContext)
            break;

        case 'CONTEXT_NEXT':
            sentenceDelimiterIndices = generateSentenceDelimiterIndicesList(quill.getText())

            currentContext = currentContext + 1
            if (currentContext >= sentenceDelimiterIndices.length)
                currentContext = sentenceDelimiterIndices.length - 1
            
            feedbackOnTextNavigation(currentContext)
            break;

        case 'PUSH_TO_TALK':
            console.log('firing event :: PUSH_TO_TALK')
            break;
            
    }
}