import * as tts from '../Services/tts.js'
import { handleCommand, getHistoryObject } from '../Engines/EditInstructionHandler/Commanding.js';
import { feedbackOnPushToTalk, isDisplayON, navigateWorkingText, navigateContext, feedbackOnToggleDisplayState, feedbackOnToggleReadState, feedbackOfWorkingTextAfterExitFromEditMode, feedbackOnUndoRedoInEditMode, fireDisplayOffRoutine, toggleReadToDisp, stopDisplayTimer, getCurrentWorkingTextSentenceIndex, renderTimedStatusOnBladeDisplay } from '../Engines/FeedbackHandler.js'
import { readPrevSentence, readNextSentence, readFromStart, toggleReadEyesFree } from '../Engines/AudioFeedbackHandler.js';
import { handleUtteranceInEditMode } from '../Engines/UtteranceParser.js';
import { sendScrollEvent } from './VuzixBladeDriver.js';
import { initEditMode, moveWordCursor, alterSelection, initRange, clearRange, insertInEditMode, exitInsertMode } from '../Engines/WordEditHandler.js';
import { markupForStatusInEditMode, markupForStatusInDefaultMode } from '../Utils/HTMLParser.js';
import { getSocket } from '../Services/socket.js';
import { getTaskTimerValue } from '../Utils/createLog.js';

const UP_KEY_CODE = 33
const DOWN_KEY_CODE = 34
const RIGHT_KEY_CODE = 190
const CENTER_KEY_CODE = 116

const LONG_PRESS_TRIGGER_DELAY = 3 // 0.3 seconds = 300ms
const MIN_KEY_PRESSES_FOR_READ_FROM_START = 4

const AUTOSCROLL_CHUNK_SIZE = 2     // scroll up/down if navigating backward/forward by 2 sentences.

const keyStatus = {}    // on or off
const keyPressEventStatus = {}    // short/long_pressed/long_released
const keysThatSupportLongPressEvent = [RIGHT_KEY_CODE, CENTER_KEY_CODE]
const keysThatAcknowledgeKeyUpEvent = [CENTER_KEY_CODE]

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

let socket = getSocket()
let longPressTimer = new Timer()
let lastKeyPressCode
let wasTTSReading
let accKeyPresses = 0
let currentContext;
let lastSavedContext = 0;
let feedbackConfig;
let controllerMode = 'DEFAULT';
let feedbackModality = 'DISP';     // 'DISP', 'AUDIO'
let rangeSelectionMode = false;
let isInsertMode = false;

export const getPTTStatus = () => {
    if (feedbackConfig !== 'DISP_ON_DEMAND')
        return null;
    if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
        return 'PTT_ON'
    else if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longReleased )
        return 'PTT_OFF'
}

export const setFeedbackConfigVariable = (config) => { feedbackConfig = config };
export const getWasTTSReading = () => wasTTSReading;

export const getControllerMode = () => controllerMode;
export const toggleControllerMode = () => {
    controllerMode = (controllerMode === 'DEFAULT') ? 'EDIT' : 'DEFAULT'
    console.log('Controller Mode Changed ::', controllerMode)

    if (controllerMode === 'EDIT') {
        initEditMode();
        renderTimedStatusOnBladeDisplay(markupForStatusInEditMode('EDIT'))

        if (rangeSelectionMode)
            rangeSelectionMode = !rangeSelectionMode

        if (feedbackConfig === 'DISP_ON_DEMAND')
            stopDisplayTimer();
    }
    else {
        renderTimedStatusOnBladeDisplay(markupForStatusInDefaultMode('DEFAULT'))
        switch (feedbackConfig) {
            case 'ODD_FLEXI':
            case 'DISP_ON_DEMAND':
            case 'AOD_SCROLL':
            case 'DISP_ALWAYS_ON':
                feedbackOfWorkingTextAfterExitFromEditMode();
                break;
        }
    }
}

export const getFeedbackModality = () => feedbackModality;
export const setFeedbackModality = (modality) => { feedbackModality = modality; }

const toggleFeedbackModality = () => { 
    feedbackModality = (feedbackModality === 'DISP') ? 'AUDIO' : 'DISP' 
    toggleFeedbackState();
}

const toggleFeedbackState = () => {
    if (feedbackModality === 'DISP')
        feedbackOnToggleDisplayState();
    else if (feedbackModality === 'AUDIO')
        feedbackOnToggleReadState();
}

const toggleRangeSelectionMode = () => { 
    rangeSelectionMode = !rangeSelectionMode
    if (rangeSelectionMode)
        initRange();
    else
        clearRange();
}

export const setRangeSelectionMode = (state) => { rangeSelectionMode = state; }

export const getIsInsertMode = () => isInsertMode;
export const setInsertMode = (state) => { isInsertMode = state; }

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
            
            handleControllerEvent(classifyControllerEvent())
            break;

        case 'DISP_ON_DEMAND':
            wasTTSReading = tts.isReading()
            tts.pause()

            initKeysThatSupportLongPressEvent()

            if ( keysThatSupportLongPressEvent.includes(e.keyCode) )
                longPressTimer.start({ precision: 'secondTenths', countdown: true, startValues: { secondTenths: LONG_PRESS_TRIGGER_DELAY } });
            else
                handleControllerEvent(classifyControllerEvent())
            break;

        case 'DISP_ALWAYS_ON':
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

    if ( keysThatAcknowledgeKeyUpEvent.includes(e.keyCode) && feedbackConfig === 'DISP_ON_DEMAND' 
        && keyPressEventStatus[e.keyCode] === KEY_PRESS_EVENT_TYPES.longPressed ) {
        keyPressEventStatus[e.keyCode] = KEY_PRESS_EVENT_TYPES.longReleased
        handleControllerEvent(classifyControllerEvent())
    }

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

    // console.log(`*********** Controller Mode  :: ${controllerMode} ***********`)
    // console.log(`*********** Event Received   :: ${eventReceived} ***********`)
    // console.log(`*********** Feedback Config  :: ${feedbackConfig} ***********`)

    switch(controllerMode) {
        case 'DEFAULT':
            switch (feedbackConfig) {
                case 'ODD_FLEXI':
                    switch (eventReceived) {
                        case 'TRACK_LEFT':
                            wasTTSReading = tts.isReading()
                            tts.pause()
                            if (feedbackModality === 'DISP') {
                                if (isDisplayON())
                                    controllerEvent = 'WORKING_TEXT_PREV'
                                else
                                    controllerEvent = 'TOGGLE_FEEDBACK_STATE'
                            }
                            else if (feedbackModality === 'AUDIO')
                                controllerEvent = 'READ_PREV'
                            break;

                        case 'TRACK_RIGHT':
                            wasTTSReading = tts.isReading()
                            tts.pause()
                            if (feedbackModality === 'DISP') {
                                if (isDisplayON())
                                    controllerEvent = 'WORKING_TEXT_NEXT'
                                else
                                    controllerEvent = 'TOGGLE_FEEDBACK_STATE'
                            }
                            else if (feedbackModality === 'AUDIO')
                                controllerEvent = 'READ_NEXT'
                            break;

                        case UP_KEY_CODE:
                            if (feedbackModality === 'DISP') {
                                if (isDisplayON())
                                    controllerEvent = 'WORKING_TEXT_PREV'
                                else
                                    controllerEvent = 'TOGGLE_FEEDBACK_STATE'
                            }
                            else if (feedbackModality === 'AUDIO') {
                                if (accKeyPresses >= MIN_KEY_PRESSES_FOR_READ_FROM_START)
                                    controllerEvent = 'READ_FROM_BEGINNING'
                                else 
                                    controllerEvent = 'READ_PREV'
                            }
                            break;
                        
                        case DOWN_KEY_CODE:
                            if (feedbackModality === 'DISP') {
                                if (isDisplayON())
                                    controllerEvent = 'WORKING_TEXT_NEXT'
                                else
                                    controllerEvent = 'TOGGLE_FEEDBACK_STATE'
                            }
                            else if (feedbackModality === 'AUDIO')
                                controllerEvent = 'READ_NEXT'
                            break;

                        case RIGHT_KEY_CODE:
                            if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                                controllerEvent = 'UNDO'
                            else if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                                controllerEvent = 'REDO'
                            break;

                        case CENTER_KEY_CODE:
                            if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                                controllerEvent = 'TOGGLE_FEEDBACK_STATE'
                            else if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                                controllerEvent = 'TOGGLE_FEEDBACK_MODALITY'
                    }
                    break;

                case 'DISP_ON_DEMAND':
                    switch (eventReceived) {
                        case 'TRACK_LEFT':
                            wasTTSReading = tts.isReading()
                            tts.pause()

                            controllerEvent = (isDisplayON()) ? 'WORKING_TEXT_PREV' : ( (!tts.getTTSReadStartedFlag()) ? 'READ_FROM_BEGINNING' : 'READ_PREV' )
                            break;
                        
                        case 'TRACK_RIGHT':
                            wasTTSReading = tts.isReading()
                            tts.pause()

                            controllerEvent = (isDisplayON()) ? 'WORKING_TEXT_NEXT' : ( (!tts.getTTSReadStartedFlag()) ? 'READ_FROM_BEGINNING' : 'READ_NEXT' )
                            break;
                        
                        case UP_KEY_CODE:
                            if (isDisplayON())
                                controllerEvent = 'WORKING_TEXT_PREV'
                            else if ( !tts.getTTSReadStartedFlag() || accKeyPresses >= MIN_KEY_PRESSES_FOR_READ_FROM_START )
                                controllerEvent = 'READ_FROM_BEGINNING'
                            else
                                controllerEvent = 'READ_PREV'
                            break;
                        
                        case DOWN_KEY_CODE:
                            controllerEvent = (isDisplayON()) ? 'WORKING_TEXT_NEXT' : ( (!tts.getTTSReadStartedFlag()) ? 'READ_FROM_BEGINNING' : 'READ_NEXT' )
                            break;
                        
                        case RIGHT_KEY_CODE:
                            if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                                controllerEvent = 'UNDO'
                            else if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                                controllerEvent = 'REDO'
                            break;

                        case CENTER_KEY_CODE:
                            if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short && isDisplayON())
                                controllerEvent = 'QUICK_DISMISS'
                            else if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                                controllerEvent = 'TOGGLE_READ_TO_DISP'
                            else if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                                controllerEvent = 'PUSH_TO_TALK_ENGAGED'
                            else if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longReleased )
                                controllerEvent = 'PUSH_TO_TALK_RELEASED'
                            break;
                    }
                    break;

                case 'AOD_SCROLL':
                    switch (eventReceived) {
                        case 'TRACK_LEFT':
                        case UP_KEY_CODE:
                            controllerEvent = 'WORKING_TEXT_PREV'
                            break;

                        case 'TRACK_RIGHT':
                        case DOWN_KEY_CODE:
                            controllerEvent = 'WORKING_TEXT_NEXT'
                            break;

                        case RIGHT_KEY_CODE:
                            if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                                controllerEvent = 'UNDO'
                            else if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                                controllerEvent = 'REDO'
                            break;

                        case CENTER_KEY_CODE:
                            break;
                    }
                    break;
                
                case 'DISP_ALWAYS_ON':
                    switch (eventReceived) {
                        case 'TRACK_LEFT':
                            controllerEvent = 'SCROLL_UP'
                            break;

                        case 'TRACK_RIGHT':
                            controllerEvent = 'SCROLL_DOWN'
                            break;
                        
                        case UP_KEY_CODE:
                            controllerEvent = 'CONTEXT_PREV'
                            break;
                        
                        case DOWN_KEY_CODE:
                            controllerEvent = 'CONTEXT_NEXT'
                            break;

                        case RIGHT_KEY_CODE:
                            if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                                controllerEvent = 'UNDO'
                            else if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                                controllerEvent = 'REDO'
                            break;

                        case CENTER_KEY_CODE:
                            break;
                    }
                    break;

                case 'EYES_FREE':
                    switch (eventReceived) {
                        case 'TRACK_LEFT':
                            wasTTSReading = tts.isReading()
                            tts.pause()
                            controllerEvent = (!tts.getTTSReadStartedFlag()) ? 'READ_FROM_BEGINNING' : 'READ_PREV'
                            break;

                        case 'TRACK_RIGHT':
                            wasTTSReading = tts.isReading()
                            tts.pause()
                            controllerEvent = (!tts.getTTSReadStartedFlag()) ? 'READ_FROM_BEGINNING' : 'READ_NEXT'
                            break;

                        case UP_KEY_CODE:
                            controllerEvent = (!tts.getTTSReadStartedFlag() || accKeyPresses >= MIN_KEY_PRESSES_FOR_READ_FROM_START) ? 'READ_FROM_BEGINNING' : 'READ_PREV'
                            break;
                        
                        case DOWN_KEY_CODE:
                            controllerEvent = (!tts.getTTSReadStartedFlag()) ? 'READ_FROM_BEGINNING' : 'READ_NEXT'
                            break;

                        case RIGHT_KEY_CODE:
                            if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                                controllerEvent = 'UNDO'
                            else if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                                controllerEvent = 'REDO'
                            break;

                        case CENTER_KEY_CODE:
                            controllerEvent = 'TOGGLE_READ_EYES_FREE'
                            break;
                    }
                    break;
                    
            }
            break;
        
        case 'EDIT':
            switch (eventReceived) {
                case 'TRACK_LEFT':
                    controllerEvent = (rangeSelectionMode) ? 'ALTER_SELECTION_LEFT' : 'MOVE_WORD_CURSOR_LEFT'
                    break;

                case 'TRACK_RIGHT':
                    controllerEvent = (rangeSelectionMode) ? 'ALTER_SELECTION_RIGHT' : 'MOVE_WORD_CURSOR_RIGHT'
                    break;

                case UP_KEY_CODE:
                    controllerEvent = (!isInsertMode) ? 'INSERT_LEFT' : 'CONT_INSERT_LEFT'
                    break;

                case DOWN_KEY_CODE:
                    controllerEvent = (!isInsertMode) ? 'INSERT_RIGHT' : 'CONT_INSERT_RIGHT'
                    break;

                case RIGHT_KEY_CODE:
                    if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                        controllerEvent = 'UNDO'
                    else if ( keyPressEventStatus[RIGHT_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                        controllerEvent = 'REDO'
                    break;

                case CENTER_KEY_CODE:
                    if (!isInsertMode) {
                        if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.short )
                            controllerEvent = 'TOGGLE_RANGE_SELECTION_MODE'
                        else if ( keyPressEventStatus[CENTER_KEY_CODE] === KEY_PRESS_EVENT_TYPES.longPressed )
                            controllerEvent = 'REMOVE_SELECTED_TEXT'
                    }
                    else
                        controllerEvent = 'EXIT_INSERT_MODE'
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
        
        // case 'TOGGLE_READ':
        //     toggleRead()
        //     break;
        
        case 'TOGGLE_READ_EYES_FREE':
            toggleReadEyesFree()
            break;
        
        case 'TOGGLE_READ_TO_DISP':
            toggleReadToDisp()
            break;
        
        case 'UNDO':
            handleCommand('undo', null, null, true);
            if (controllerMode === 'EDIT')
                feedbackOnUndoRedoInEditMode(isInsertMode, getHistoryObject())
            break;

        case 'REDO':
            handleCommand('redo', null, null, true);
            if (controllerMode === 'EDIT')
                feedbackOnUndoRedoInEditMode(isInsertMode, getHistoryObject())
            break;

        case 'CONTEXT_PREV':    // both context_prev and context_next are only for always-on display
            navigateContext('PREV')
            currentContext = getCurrentWorkingTextSentenceIndex()
            if ( currentContext - lastSavedContext == -AUTOSCROLL_CHUNK_SIZE ) {
                sendScrollEvent('UP')
                lastSavedContext = currentContext
            }
            break;

        case 'CONTEXT_NEXT':
            navigateContext('NEXT');
            currentContext = getCurrentWorkingTextSentenceIndex()
            if ( currentContext - lastSavedContext == AUTOSCROLL_CHUNK_SIZE ) {
                sendScrollEvent('DOWN')
                lastSavedContext = currentContext
            }
            break;

        case 'WORKING_TEXT_PREV':
            navigateWorkingText('PREV')
            socket.emit('log', `PREV, ${getTaskTimerValue()}\n`)
            break;

        case 'WORKING_TEXT_NEXT':
            navigateWorkingText('NEXT')
            socket.emit('log', `NEXT, ${getTaskTimerValue()}\n`)
            break;

        case 'QUICK_DISMISS':
            fireDisplayOffRoutine();
            break;

        case 'PUSH_TO_TALK_ENGAGED':
            feedbackOnPushToTalk()
            break;

        case 'PUSH_TO_TALK_RELEASED':
            feedbackOnPushToTalk()
            break;

        // case 'MIC_SWITCH_TOGGLE':
        //     mic.click()
        //     if (mic.checked) speakFeedback ('Mic On.')
        //         else         speakFeedback('Mic Off.')

        //     if (wasTTSReading)
        //         resumeReadAfterGeneralInterrupt()
        //     break;
        
        case 'SCROLL_UP':
            sendScrollEvent('UP')
            break;
        
        case 'SCROLL_DOWN':
            sendScrollEvent('DOWN')
            break;

        case 'TOGGLE_FEEDBACK_MODALITY':
            toggleFeedbackModality();
            break;

        case 'TOGGLE_FEEDBACK_STATE':
            toggleFeedbackState();
            break;

        case 'TOGGLE_RANGE_SELECTION_MODE':
            toggleRangeSelectionMode();
            break;

        case 'MOVE_WORD_CURSOR_LEFT':
            setInsertMode(false);
            moveWordCursor('LEFT');
            break;
        
        case 'MOVE_WORD_CURSOR_RIGHT':
            setInsertMode(false);
            moveWordCursor('RIGHT');
            break;

        case 'ALTER_SELECTION_LEFT':
            alterSelection('LEFT');
            break;

        case 'ALTER_SELECTION_RIGHT':
            alterSelection('RIGHT');
            break;

        case 'INSERT_LEFT':
            setInsertMode(true);
            insertInEditMode('LEFT');
            break;

        case 'INSERT_RIGHT':
            setInsertMode(true);
            insertInEditMode('RIGHT');
            break;
        
        case 'CONT_INSERT_LEFT':
            insertInEditMode('LEFT', true)
            break;
        
        case 'CONT_INSERT_RIGHT':
            insertInEditMode('RIGHT', true)
            break;

        case 'REMOVE_SELECTED_TEXT':
            handleUtteranceInEditMode('delete')
            break;

        case 'EXIT_INSERT_MODE':
            exitInsertMode();

        default:
            break;
    }
}

export const isEditModeSupported = () => {
    switch(feedbackConfig) {
        case 'ODD_FLEXI':
        case 'DISP_ON_DEMAND':
            if (!isDisplayON())
                return false;
            return true;
        case 'AOD_SCROLL':
        case 'DISP_ALWAYS_ON':
            return true;
        case 'EYES_FREE':
            return false;
        default:
            return true;
    }
}