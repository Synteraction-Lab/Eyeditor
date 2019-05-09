import * as tts from './tts.js'
import { getSentenceIndices } from './stringutils.js';
import { quill } from './quill.js';
import { handleCommand } from './execCommand.js';

const LEFT_KEY_CODE = 33
const RIGHT_KEY_CODE = 34
const UNDO_KEY_CODE = 116
const REDO_KEY_CODE = 27
const READ_RESTART_INDEX = 0
const prevSentenceRequestDelta = 12 // if LEFT is clicked within first 10 chars of current sent., TTS reads the prev. sentence.
const CUT_KEY_INPUT_DELAY = 3 // 0.1 seconds = 100ms

var timer = new Timer()
var accControllerPresses
var lastKeyPressCode
var interruptIndex

// timer.addEventListener('secondTenthsUpdated', function (e) {
    // console.log('Timer ::', timer.getTimeValues().toString(['hours', 'minutes', 'seconds', 'secondTenths']));
// });

timer.addEventListener('targetAchieved', function (e) {
    timer.stop()
    console.log('accControllerPresses', accControllerPresses)
    
    handleControllerEvent(classifyControllerEvent())
});

document.addEventListener('keydown', function(e) {
    tts.pause()
    interruptIndex = (tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex()) || 0
    
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
            if (accControllerPresses > 3 || interruptIndex == 0) controllerEvent = 'READ_FROM_BEGINNING'
                else controllerEvent = 'READ_PREV' 
            break;
        case RIGHT_KEY_CODE:
            if (interruptIndex == 0) controllerEvent = 'READ_FROM_BEGINNING'
                else controllerEvent = 'READ_NEXT'
            break;
        case UNDO_KEY_CODE:
        case REDO_KEY_CODE:
            if (accControllerPresses > 2)   handleCommand('redo')
                else                        handleCommand('undo')
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
    }
}