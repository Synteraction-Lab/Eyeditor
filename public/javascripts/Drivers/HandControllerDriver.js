import * as tts from '../Services/tts.js'
import { quill } from '../Services/quill.js';
import { handleCommand } from '../Engines/EditInstructionHandler/Commanding.js';
import { getFeedbackConfiguration } from '../main.js'
import { feedbackOnPushToTalk, isDisplayON, navigateWorkingText, navigateContext, getCurrentContext, getCurrentWorkingText, feedbackOnToggleDisplayState, fireDisplayOffRoutine } from '../Engines/FeedbackHandler.js'
import { readPrevSentence, readNextSentence, speakFeedback, readFromStart, resumeReadAfterGeneralInterrupt, stopReading, readFromIndex } from '../Engines/AudioFeedbackHandler.js';
import { getBargeinIndex } from '../Engines/UtteranceParser.js';
import { sendScrollEvent } from './VuzixBladeDriver.js';

const LEFT_KEY_CODE = 33
const RIGHT_KEY_CODE = 34
const UNDO_KEY_CODE_1 = 116
const UNDO_KEY_CODE_2 = 27
const REDO_KEY_CODE = 66
const LONG_PRESS_TRIGGER_DELAY = 3 // 0.3 seconds = 300ms
const MIN_KEY_PRESSES_FOR_READ_FROM_START = 4
const keyStatus = {}    // on or off
const keyPressEventStatus = {}    // short/long_pressed/long_released
const keysThatSupportLongPressEvent = [UNDO_KEY_CODE_1, UNDO_KEY_CODE_2, REDO_KEY_CODE]
const keysThatAcknowledgeKeyUpEvent = [REDO_KEY_CODE]
const undoKeyCodes = [UNDO_KEY_CODE_1, UNDO_KEY_CODE_2]
const SCROLL_INITIATION = 3         // measured in no. of keypresses
const SCROLL_GRANULARITY = 7       // measured in no. of keypresses
const AUTOSCROLL_CHUNK_SIZE = 2     // scroll up/down if navigating backward/forward by 2 sentences.
const feedbackModesThatSupportUndoRedoLongPressEvent = ['DISP_ON_DEMAND', 'AOD_SCROLL', 'ODD_FLEXI']

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
let wasTTSReading
let accKeyPresses = 0
let hasFiredScrollEvent = false
let nextScrollThreshold;
let currentContext;
let lastSavedContext = 0;
let feedbackConfig;

export const getPTTStatus = () => {
    if ( keyPressEventStatus[REDO_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
        return 'PTT_ON'
    else if ( keyPressEventStatus[REDO_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longReleased )
        return 'PTT_OFF'
}

export const getWasTTSReading = () => wasTTSReading;

// longPressTimer.addEventListener('secondTenthsUpdated', function (e) {
    // console.log('longPressTimer ::', longPressTimer.getTimeValues().toString(['hours', 'minutes', 'seconds', 'secondTenths']));
// });

longPressTimer.addEventListener('targetAchieved', function (e) {
    longPressTimer.stop()
    handleLongPressEvent()
});

const initKeysThatSupportLongPressEvent = () => {
    keysThatSupportLongPressEvent.forEach( keycode => keyPressEventStatus[keycode] = KEY_PRESS_EVENT_TYPES.short )
}

document.addEventListener('keydown', function(e) {
    feedbackConfig = getFeedbackConfiguration()

    /* reject multiple undos/redos */
    if ( feedbackModesThatSupportUndoRedoLongPressEvent.includes(feedbackConfig) && keyStatus[e.keyCode] && keysThatSupportLongPressEvent.includes(e.keyCode) && keyStatus[e.keyCode] === SWITCH.on )
        return;

    accKeyPresses = accKeyPresses + 1
    keyStatus[e.keyCode] = SWITCH.on
    lastKeyPressCode = e.keyCode

    switch (feedbackConfig) {
        case 'DEFAULT':
        case 'EYES_FREE':
            isDispAlwaysOnMode = false;
            isDispOnDemandMode = false;

            wasTTSReading = tts.isReading()
            tts.pause()
            interruptIndex = getBargeinIndex()
            
            handleControllerEvent(classifyControllerEvent())
            break;

        case 'DISP_ON_DEMAND':
            isDispAlwaysOnMode = false;
            isDispOnDemandMode = true;

            wasTTSReading = tts.isReading()
            tts.pause()
            interruptIndex = getBargeinIndex()

            initKeysThatSupportLongPressEvent()

            if ( keysThatSupportLongPressEvent.includes(e.keyCode) )
                longPressTimer.start({ precision: 'secondTenths', countdown: true, startValues: { secondTenths: LONG_PRESS_TRIGGER_DELAY } });
            else
                handleControllerEvent(classifyControllerEvent())
            break;

        case 'DISP_ALWAYS_ON':
            isDispAlwaysOnMode = true;
            isDispOnDemandMode = false;

            handleControllerEvent(classifyControllerEvent())
            break;

        case 'AOD_SCROLL':
            initKeysThatSupportLongPressEvent()
            if ( keysThatSupportLongPressEvent.includes(e.keyCode) )
                longPressTimer.start({ precision: 'secondTenths', countdown: true, startValues: { secondTenths: LONG_PRESS_TRIGGER_DELAY } });
            else
                handleControllerEvent(classifyControllerEvent())
            break;

        case 'ODD_FLEXI':
            wasTTSReading = tts.isReading()
            tts.pause()

            initKeysThatSupportLongPressEvent()

            if (keysThatSupportLongPressEvent.includes(e.keyCode))
                longPressTimer.start({ precision: 'secondTenths', countdown: true, startValues: { secondTenths: LONG_PRESS_TRIGGER_DELAY } });
            else
                handleControllerEvent(classifyControllerEvent())
            break;
    }
})

document.addEventListener('keyup', function (e) {
    keyStatus[e.keyCode] = SWITCH.off
    // console.log('::::::::: accKeyPresses', accKeyPresses)
    
    if ( feedbackModesThatSupportUndoRedoLongPressEvent.includes(feedbackConfig) ) {
        if ( keyPressEventStatus[e.keyCode] === KEY_PRESS_EVENT_TYPES.short )
            handleControllerEvent(classifyControllerEvent())
    
        else if ( isDispOnDemandMode && keysThatAcknowledgeKeyUpEvent.includes(e.keyCode) ) {
            if ( keyPressEventStatus[e.keyCode] === KEY_PRESS_EVENT_TYPES.longPressed )
                keyPressEventStatus[e.keyCode] = KEY_PRESS_EVENT_TYPES.longReleased
            
            handleControllerEvent(classifyControllerEvent())
        }
    }

    else if (isDispAlwaysOnMode) {
        if ( undoKeyCodes.includes(e.keyCode) || e.keyCode === REDO_KEY_CODE ) {
            if (accKeyPresses <= 2 && !hasFiredScrollEvent)
                if (undoKeyCodes.includes(e.keyCode))
                        handleControllerEvent('SCROLL_UP')      //handleControllerEvent('UNDO')
                else    handleControllerEvent('SCROLL_DOWN')    //handleControllerEvent('REDO')

            hasFiredScrollEvent = false;
        }
    } 

    accKeyPresses = 0
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
            if (!isDispAlwaysOnMode) {
                if ( ['DISP_ON_DEMAND', 'ODD_FLEXI'].includes(feedbackConfig) && isDisplayON() || feedbackConfig === 'AOD_SCROLL' )
                    controllerEvent = 'WORKING_TEXT_PREV'
                else if ( feedbackConfig === 'ODD_FLEXI' ) {
                    if ( accKeyPresses >= MIN_KEY_PRESSES_FOR_READ_FROM_START )
                            controllerEvent = 'READ_FROM_BEGINNING'
                    else    controllerEvent = 'READ_PREV'
                }
                else {
                    if ( interruptIndex == 0 && !tts.getTTSReadStartedFlag() || accKeyPresses >= MIN_KEY_PRESSES_FOR_READ_FROM_START )
                            controllerEvent = 'READ_FROM_BEGINNING'
                    else    controllerEvent = 'READ_PREV'
                }
            }
            else    
                controllerEvent = 'CONTEXT_PREV'
            break;

        case RIGHT_KEY_CODE:
            if (!isDispAlwaysOnMode) {
                if ( ['DISP_ON_DEMAND', 'ODD_FLEXI'].includes(feedbackConfig) && isDisplayON() || feedbackConfig === 'AOD_SCROLL' )
                    controllerEvent = 'WORKING_TEXT_NEXT'
                else if ( feedbackConfig === 'ODD_FLEXI' )
                    controllerEvent = 'READ_NEXT'
                else {
                    if ( interruptIndex == 0 && !tts.getTTSReadStartedFlag() )
                            controllerEvent = 'READ_FROM_BEGINNING'
                    else    controllerEvent = 'READ_NEXT'
                }
            }
            else    
                controllerEvent = 'CONTEXT_NEXT'
            break;

        case UNDO_KEY_CODE_1:
        case UNDO_KEY_CODE_2:
            if (feedbackConfig === 'ODD_FLEXI') {
                switch (keyPressEventStatus[lastKeyPressCode]) {
                    case KEY_PRESS_EVENT_TYPES.short:
                        controllerEvent = 'TOGGLE_READ_STATE'
                        break;
                    case KEY_PRESS_EVENT_TYPES.longPressed:
                        controllerEvent = 'UNDO'
                        break;
                }
            }
            else if ( !isDispAlwaysOnMode )
                controllerEvent = 'UNDO'
            else if ( accKeyPresses > SCROLL_INITIATION ) {
                if ( !hasFiredScrollEvent ) {
                    hasFiredScrollEvent = true
                    nextScrollThreshold = SCROLL_INITIATION + SCROLL_GRANULARITY
                    controllerEvent = 'SCROLL_UP'
                } else if ( accKeyPresses % nextScrollThreshold == 0 ) {
                    nextScrollThreshold = nextScrollThreshold + SCROLL_GRANULARITY
                    controllerEvent = 'SCROLL_UP'
                }
            }
            break;

        case REDO_KEY_CODE:
            if ( !quill.hasFocus() ) {
                if ( ['AOD_SCROLL', 'EYES_FREE'].includes(feedbackConfig) )
                    controllerEvent = 'REDO'
                else if ( ['DISP_ON_DEMAND', 'ODD_FLEXI'].includes(feedbackConfig) )
                    switch ( keyPressEventStatus[REDO_KEY_CODE] ) {
                        case KEY_PRESS_EVENT_TYPES.short:
                            controllerEvent = (isDispOnDemandMode) ? 'REDO' : 'TOGGLE_DISPLAY_STATE'
                            break;
                        case KEY_PRESS_EVENT_TYPES.longPressed:
                            controllerEvent = (isDispOnDemandMode) ? 'PUSH_TO_TALK_ENGAGED' : 'REDO'
                            break;
                        case KEY_PRESS_EVENT_TYPES.longReleased:
                            controllerEvent = 'PUSH_TO_TALK_RELEASED'
                            break;
                    }
                else if ( accKeyPresses > SCROLL_INITIATION ) {     // isDispAlwaysOnMode
                    if ( !hasFiredScrollEvent ) {
                        hasFiredScrollEvent = true
                        nextScrollThreshold = SCROLL_INITIATION + SCROLL_GRANULARITY
                        controllerEvent = 'SCROLL_DOWN'
                    } else if ( accKeyPresses % nextScrollThreshold == 0 ) {
                        nextScrollThreshold = nextScrollThreshold + SCROLL_GRANULARITY
                        controllerEvent = 'SCROLL_DOWN'
                    }
                }
            }
            break;
    }

    console.log('controllerEvent', controllerEvent)
    return controllerEvent;
}

const handleControllerEvent = (event) => {
    switch(event) {
        case 'READ_FROM_BEGINNING':
            readFromStart()
            break;

        case 'READ_PREV':
            readPrevSentence()
            break;

        case 'READ_NEXT':
            readNextSentence()
            break;
        
        case 'STOP_TTS_READ':
            stopReading()
            break;
        
        case 'UNDO':
            handleCommand('undo');
            break;

        case 'REDO':
            handleCommand('redo', null, null, true);
            break;

        case 'CONTEXT_PREV':    // both context_prev and context_next are only for always-on display
            navigateContext('PREV')
            currentContext = getCurrentContext()
            if ( currentContext - lastSavedContext == -AUTOSCROLL_CHUNK_SIZE ) {
                sendScrollEvent('UP')
                lastSavedContext = currentContext
            }
            break;

        case 'CONTEXT_NEXT':
            navigateContext('NEXT');
            currentContext = getCurrentContext()
            if ( currentContext - lastSavedContext == AUTOSCROLL_CHUNK_SIZE ) {
                sendScrollEvent('DOWN')
                lastSavedContext = currentContext
            }
            break;

        case 'WORKING_TEXT_PREV':
            navigateWorkingText('PREV')
            break;

        case 'WORKING_TEXT_NEXT':
            navigateWorkingText('NEXT')
            break;

        case 'PUSH_TO_TALK_ENGAGED':
            feedbackOnPushToTalk()
            break;

        case 'PUSH_TO_TALK_RELEASED':
            feedbackOnPushToTalk()
            break;

        case 'MIC_SWITCH_TOGGLE':
            mic.click()
            if (mic.checked) speakFeedback ('Mic On.')
                else         speakFeedback('Mic Off.')

            if (wasTTSReading)
                resumeReadAfterGeneralInterrupt()
            break;
        
        case 'SCROLL_UP':
            // console.log('SCROLL_UP Event Fired.')
            sendScrollEvent('UP')
            break;
        
        case 'SCROLL_DOWN':
            // console.log('SCROLL_DOWN Event Fired.')
            sendScrollEvent('DOWN')
            break;

        case 'TOGGLE_READ_STATE':
            if ( isDisplayON() )
                fireDisplayOffRoutine(true)
            if ( !wasTTSReading )
                readFromIndex( getCurrentWorkingText().startIndex )
            break;

        case 'TOGGLE_DISPLAY_STATE':
            feedbackOnToggleDisplayState()
            break;

        default:
            break;
    }
}