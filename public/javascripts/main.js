import { data } from './data.js'
import * as tts from './Services/tts.js'
import { recognition } from './Services/speechrecognizer.js';
import * as editor from './Engines/TextEditor.js'
import { generateFuzzySetForCommands } from './Utils/fuzzymatcher.js';
import { quill } from './Services/quill.js'

var feedbackConfiguration = 'DEFAULT';
var loadedText;

/* configure TTS */
tts.setup()

/* create the fuzzy set for command keywords */
generateFuzzySetForCommands()

const initLoad = (text) => {
    let isLoading = true
    mic.checked = false
    editor.refreshText(text, isLoading)
    loadedText = quill.getText()
    tts.setTTSReadStartedFlag(false)
}

export const getLoadedText = () => loadedText;

/* Task Button Handlers */
btn1.addEventListener('click', function(e) {
    feedbackConfiguration = 'DEFAULT'
    initLoad(data[0].trig)
})

btn2.addEventListener('click', function(e) {
    feedbackConfiguration = 'DISP_ON_DEMAND'
    initLoad(data[1].trig)
})

btn3.addEventListener('click', function(e) {
    feedbackConfiguration = 'DISP_ALWAYS_ON'
    initLoad(data[2].trig)
})

mic.addEventListener('click', (e) => {
    if (mic.checked) {
        recognition.start()
    }
    else {
        recognition.stop()
    }
})

// stopTTS.addEventListener('click', function(e) {
//     tts.pause()
// })

export const getFeedbackConfiguration = () => feedbackConfiguration

