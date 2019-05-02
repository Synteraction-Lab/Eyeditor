import * as tts from './tts.js'
import { getSentenceIndices } from './stringutils.js';
import { quill } from './quill.js';

const LEFT_KEY_CODE = 33
const RIGHT_KEY_CODE = 34
const READ_FROM_BEGINNING_KEY_CODE_1 = 16
const READ_FROM_BEGINNING_KEY_CODE_2 = 27
const READ_RESTART_INDEX = 0
const prevSentenceRequestDelta = 12 // if LEFT is clicked within first 10 chars of current sent., TTS reads the prev. sentence.

document.addEventListener('keydown', function(e) {
    if ( e.keyCode === READ_FROM_BEGINNING_KEY_CODE_1 || e.keyCode === READ_FROM_BEGINNING_KEY_CODE_2 ) {
        tts.pause()
        tts.read(READ_RESTART_INDEX)
    }
    
    else {
        let interruptIndex = tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex()

        if ( tts.isPaused() && (e.keyCode === LEFT_KEY_CODE || e.keyCode === RIGHT_KEY_CODE) )
            tts.read( getSentenceIndices(quill.getText(), interruptIndex).start )

        else if (e.keyCode == LEFT_KEY_CODE) {
            tts.pause()
            let currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)

            if (interruptIndex - currentSentenceIndices.start < prevSentenceRequestDelta)
                currentSentenceIndices = getSentenceIndices(quill.getText(), currentSentenceIndices.start - 2)
            
            tts.read(currentSentenceIndices.start)
        }

        else if (e.keyCode == RIGHT_KEY_CODE) {
            let currentSentenceIndices = getSentenceIndices(quill.getText(), interruptIndex)
            
            let nextSentenceIndices
            if (currentSentenceIndices.end < quill.getText().length - 1)
                nextSentenceIndices = getSentenceIndices( quill.getText(), currentSentenceIndices.end + 2 )
            
            if (nextSentenceIndices) {
                tts.pause()
                tts.read(nextSentenceIndices.start)
            }
        }
    }
})