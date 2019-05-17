import * as tts from '../Services/tts.js'
import { generateSentenceDelimiterIndicesList } from '../Utils/stringutils.js';
import { quill } from '../Services/quill.js';
import { handleCommand } from '../Engines/EditInstructionHandler/Commanding.js';
import { getFeedbackConfiguration } from '../main.js'
import { feedbackOnTextNavigation, feedbackOnPushToTalk, isDisplayON, navigateWorkingText } from '../Engines/FeedbackHandler.js'
import { readPrevSentence, readNextSentence } from '../Engines/AudioFeedbackHandler.js';

const LEFT_KEY_CODE = 33
const RIGHT_KEY_CODE = 34
const UNDO_KEY_CODE_1 = 116
const UNDO_KEY_CODE_2 = 27
const REDO_KEY_CODE = 66
const READ_RESTART_INDEX = 0
const LONG_PRESS_TRIGGER_DELAY = 3 // 0.3 seconds = 300ms
const keyStatus = {}    // on or off
const keyPressEventStatus = {}    // short/long_pressed/long_released
const KEY_PRESS_EVENT_TYPES = {
    short: 0,
    longPressed: 1,
    longReleased: -1
}
Object.freeze(KEY_PRESS_EVENT_TYPES)
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
export const getPTTStatus = () => {
    if ( keyPressEventStatus[REDO_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
        return 'PTT_ON'
    else if ( keyPressEventStatus[REDO_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longReleased )
        return 'PTT_OFF'
}

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

    keyStatus[e.keyCode] = SWITCH.on
    keyPressEventStatus[REDO_KEY_CODE] = KEY_PRESS_EVENT_TYPES.short
    lastKeyPressCode = e.keyCode

    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
            isDispAlwaysOnMode = false;
            isDispOnDemandMode = false;

            tts.pause()
            interruptIndex = (tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex()) || 0
            
            handleControllerEvent(classifyControllerEvent())
            break;

        case 'DISP_ON_DEMAND':
            isDispAlwaysOnMode = false;
            isDispOnDemandMode = true;

            tts.pause()
            interruptIndex = (tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex()) || 0

            if ( e.keyCode === REDO_KEY_CODE )
                longPressTimer.start({ precision: 'secondTenths', countdown: true, startValues: { secondTenths: LONG_PRESS_TRIGGER_DELAY } });
            else
                handleControllerEvent(classifyControllerEvent())
            break;

        case 'DISP_ALWAYS_ON':
            isDispAlwaysOnMode = true;
            isDispOnDemandMode = false;

            handleControllerEvent(classifyControllerEvent())
            break;
    }
})

document.addEventListener('keyup', function (e) {
    keyStatus[e.keyCode] = SWITCH.off

    if (isDispOnDemandMode && e.keyCode === REDO_KEY_CODE) {
        if ( keyPressEventStatus[e.keyCode] === KEY_PRESS_EVENT_TYPES.longPressed )
            keyPressEventStatus[e.keyCode] = KEY_PRESS_EVENT_TYPES.longReleased
        
        handleControllerEvent(classifyControllerEvent())
    }
})

const handleLongPressEvent = () => {
    if (keyStatus[lastKeyPressCode] === SWITCH.on) {
        keyPressEventStatus[lastKeyPressCode] = KEY_PRESS_EVENT_TYPES.longPressed
        handleControllerEvent(classifyControllerEvent());
    }
}

const classifyControllerEvent = () => {
    let controllerEvent
    switch(lastKeyPressCode) {
        case LEFT_KEY_CODE:
            if (!isDispAlwaysOnMode)
                if ( isDispOnDemandMode && isDisplayON() )
                    controllerEvent = 'WORKING_TEXT_PREV'
                else
                    if ( interruptIndex == 0 && !tts.getTTSReadStartedFlag() )
                            controllerEvent = 'READ_FROM_BEGINNING'
                    else    controllerEvent = 'READ_PREV'
            else    controllerEvent = 'CONTEXT_PREV'
            break;

        case RIGHT_KEY_CODE:
            if (!isDispAlwaysOnMode)
                if ( isDispOnDemandMode && isDisplayON() )
                    controllerEvent = 'WORKING_TEXT_NEXT'
                else
                    if ( interruptIndex == 0 && !tts.getTTSReadStartedFlag() )
                            controllerEvent = 'READ_FROM_BEGINNING'
                    else    controllerEvent = 'READ_NEXT'
            else    controllerEvent = 'CONTEXT_NEXT'
            break;

        case UNDO_KEY_CODE_1:
        case UNDO_KEY_CODE_2:
            controllerEvent = 'UNDO'
            break;

        case REDO_KEY_CODE:
            if ( !quill.hasFocus() ) {
                switch ( keyPressEventStatus[REDO_KEY_CODE] ) {
                    case KEY_PRESS_EVENT_TYPES.short:
                        controllerEvent = 'REDO'
                        break;
                    case KEY_PRESS_EVENT_TYPES.longPressed:
                        controllerEvent = 'PUSH_TO_TALK_ENGAGED'
                        break;
                    case KEY_PRESS_EVENT_TYPES.longReleased:
                        controllerEvent = 'PUSH_TO_TALK_RELEASED'
                        break;
                    default:
                        controllerEvent = 'REDO'
                }
            }
            break;
    }

    return controllerEvent;
}

const handleControllerEvent = (event) => {
    switch(event) {
        case 'READ_FROM_BEGINNING':
            tts.read(READ_RESTART_INDEX)
            break;

        case 'READ_PREV':
            readPrevSentence(interruptIndex)
            break;

        case 'READ_NEXT':
            readNextSentence(interruptIndex)
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
            let sentenceDelimiterIndices = generateSentenceDelimiterIndicesList(quill.getText())

            currentContext = currentContext + 1
            if (currentContext >= sentenceDelimiterIndices.length)
                currentContext = sentenceDelimiterIndices.length - 1
            
            feedbackOnTextNavigation(currentContext)
            break;

        case 'WORKING_TEXT_PREV':
            navigateWorkingText('PREV')
            break;

        case 'WORKING_TEXT_NEXT':
            navigateWorkingText('NEXT')
            break;

        case 'PUSH_TO_TALK_ENGAGED':
            console.log('firing event :: PUSH_TO_TALK_ENGAGED')
            feedbackOnPushToTalk(interruptIndex)
            break;

        case 'PUSH_TO_TALK_RELEASED':
            console.log('firing event :: PUSH_TO_TALK_RELEASED')
            feedbackOnPushToTalk()
            break;
    }
}