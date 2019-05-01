import { data } from './data.js'
import * as tts from './tts.js'
import { recognition } from './SpeechRecognizer.js';
import * as editor from './TextEditor.js'
import { generateFuzzySetForCommands } from './createFuzzySet.js';

var outputConfiguration; //1: d+a ('da'), 2: d(adhoc)+a ('d-a'), 3: d ('d')

/* configure TTS */
tts.setup()

/* create the fuzzy set for command keywords */
generateFuzzySetForCommands()

/* Task Button Handlers */
btn1.addEventListener('click', function(e) {
    outputConfiguration = 'da'
    editor.refreshText(data[0].trig)
})

btn2.addEventListener('click', function(e) {
    outputConfiguration = 'd-a'
    editor.refreshText(data[1].trig)
})

btn3.addEventListener('click', function(e) {
    outputConfiguration = 'd'
    editor.refreshText(data[2].trig)
})

mic.addEventListener('click', (e) => {
    if (mic.checked) {
        recognition.start()
    }
    else {
        recognition.stop()
    }
})

stopTTS.addEventListener('click', function(e) {
    tts.pause()
})

export const getOutputConfig = () => outputConfiguration