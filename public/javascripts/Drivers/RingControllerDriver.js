import * as tts from '../Services/tts.js'
import { quill } from '../Services/quill.js';
import { handleCommand } from '../Engines/EditInstructionHandler/Commanding.js';
import { getFeedbackConfiguration } from '../main.js'
import { feedbackOnPushToTalk, isDisplayON, navigateWorkingText, navigateContext, getCurrentContext, feedbackOnToggleDisplayState, feedbackOnToggleReadState } from '../Engines/FeedbackHandler.js'
import { readPrevSentence, readNextSentence, speakFeedback, readFromStart, resumeReadAfterGeneralInterrupt, stopReading } from '../Engines/AudioFeedbackHandler.js';
import { getBargeinIndex } from '../Engines/UtteranceParser.js';
import { sendScrollEvent } from './VuzixBladeDriver.js';

const UP_KEY_CODE = 33
const DOWN_KEY_CODE = 34
const RIGHT_KEY_CODE = 190
const LONG_PRESS_TRIGGER_DELAY = 3 // 0.3 seconds = 300ms
const MIN_KEY_PRESSES_FOR_READ_FROM_START = 4
const keyStatus = {}    // on or off
const keyPressEventStatus = {}    // short/long_pressed/long_released
const keysThatSupportLongPressEvent = [RIGHT_KEY_CODE]
const SCROLL_INITIATION = 3         // measured in no. of keypresses
const SCROLL_GRANULARITY = 7       // measured in no. of keypresses
const AUTOSCROLL_CHUNK_SIZE = 2     // scroll up/down if navigating backward/forward by 2 sentences.

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
let wasTTSReading
let accKeyPresses = 0
let hasFiredScrollEvent = false
let nextScrollThreshold;
let currentContext;
let lastSavedContext = 0;
let feedbackConfig;
let controllerMode = 'DEFAULT';

// export const getPTTStatus = () => {
//     if ( keyPressEventStatus[REDO_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
//         return 'PTT_ON'
//     else if ( keyPressEventStatus[REDO_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longReleased )
//         return 'PTT_OFF'
// }

export const getWasTTSReading = () => wasTTSReading;
export const toggleControllerMode = () => {
    controllerMode = (controllerMode === 'DEFAULT') ? 'EDIT' : 'DEFAULT'
    console.log('Controller Mode Changed ::', controllerMode)
}
export const getControllerMode = () => controllerMode;

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
    if ( keyStatus[e.keyCode] && keysThatSupportLongPressEvent.includes(e.keyCode) && keyStatus[e.keyCode] === SWITCH.on )
        return;

    accKeyPresses = accKeyPresses + 1
    keyStatus[e.keyCode] = SWITCH.on
    lastKeyPressCode = e.keyCode

    switch (feedbackConfig) {
        case 'DEFAULT':
        case 'EYES_FREE':
            wasTTSReading = tts.isReading()
            tts.pause()
            interruptIndex = getBargeinIndex()
            
            handleControllerEvent(classifyControllerEvent())
            break;

        case 'DISP_ON_DEMAND':
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
    
    if ( keysThatSupportLongPressEvent.includes(e.keyCode) ) {
        if ( keyPressEventStatus[e.keyCode] === KEY_PRESS_EVENT_TYPES.short )
            handleControllerEvent(classifyControllerEvent())
    }

    // else if (isDispAlwaysOnMode) {
    //     if ( undoKeyCodes.includes(e.keyCode) || e.keyCode === REDO_KEY_CODE ) {
    //         if (accKeyPresses <= 2 && !hasFiredScrollEvent)
    //             if (undoKeyCodes.includes(e.keyCode))
    //                     handleControllerEvent('SCROLL_UP')      //handleControllerEvent('UNDO')
    //             else    handleControllerEvent('SCROLL_DOWN')    //handleControllerEvent('REDO')

    //         hasFiredScrollEvent = false;
    //     }
    // } 

    accKeyPresses = 0
})

const handleLongPressEvent = () => {
    if (keyStatus[lastKeyPressCode] === SWITCH.on) {
        keyPressEventStatus[lastKeyPressCode] = KEY_PRESS_EVENT_TYPES.longPressed
        handleControllerEvent(classifyControllerEvent());
    }
}

export const classifyControllerEvent = (trackPadEvent) => {
    let controllerEvent
    let eventReceived = trackPadEvent || lastKeyPressCode

    switch(controllerMode) {
        case 'DEFAULT':
            switch (feedbackConfig) {
                case 'ODD_FLEXI':
                default:
                    switch(eventReceived) {
                        case 'TRACK_LEFT':
                            controllerEvent = (isDisplayON()) ? 'WORKING_TEXT_PREV' : 'READ_PREV'
                            break;

                        case UP_KEY_CODE:
                            controllerEvent = (isDisplayON()) ? 'WORKING_TEXT_PREV' : ( (accKeyPresses >= MIN_KEY_PRESSES_FOR_READ_FROM_START) ? 'READ_FROM_BEGINNING' : 'READ_PREV' )
                            break;
                        
                        case 'TRACK_RIGHT':
                        case DOWN_KEY_CODE:
                            controllerEvent = (isDisplayON()) ? 'WORKING_TEXT_NEXT' : 'READ_NEXT'
                            break;

                        case RIGHT_KEY_CODE:
                            if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                                controllerEvent = 'UNDO'
                            else if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                                controllerEvent = 'REDO'
                            break;
                    }
                    break;
            }
            break;
        
        case 'EDIT':
            switch (feedbackConfig) {
                case 'ODD_FLEXI':
                default:
                    switch (eventReceived) {
                        case 'TRACK_LEFT':
                            console.log('Scroll Left Event Fired.')
                            break;

                        case 'TRACK_RIGHT':
                            console.log('Scroll Right Event Fired.')
                            break;

                        case UP_KEY_CODE:
                            break;

                        case DOWN_KEY_CODE:
                            break;

                        case RIGHT_KEY_CODE:
                            break;
                    }
                    break;
            }
            break;
    }

    console.log('controllerEvent', controllerEvent)
    return controllerEvent;
}

export const handleControllerEvent = (event) => {
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
            feedbackOnToggleReadState()
            break;

        case 'TOGGLE_DISPLAY_STATE':
            feedbackOnToggleDisplayState()
            break;

        default:
            break;
    }
}