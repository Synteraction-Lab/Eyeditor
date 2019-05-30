import { data } from './Data/data.js'
import * as tts from './Services/tts.js'
import { recognition } from './Services/speechrecognizer.js';
import * as editor from './Engines/TextEditor.js'
import { generateFuzzySetForCommands } from './Utils/fuzzymatcher.js';
import { quill } from './Services/quill.js'

var feedbackConfiguration = 'DEFAULT';
var loadedText;
var pushToBladeLock = true;    // if true => locked => push to blade.

export const getFeedbackConfiguration = () => feedbackConfiguration
export const getLoadedText = () => loadedText
export const getPushToBladeLockStatus = () => pushToBladeLock

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

const initMode = (data, config) => {
    feedbackConfiguration = config
    initLoad(data.textToCorrect)
}

const initRead = (data, config) => {
    feedbackConfiguration = config
    initLoad(data)
}

/* Task Button Handlers */
btn_c1.addEventListener('click', (e) => { initMode(data.task[0], 'DISP_ON_DEMAND') })
btn_c2.addEventListener('click', (e) => { initMode(data.task[1], 'DISP_ON_DEMAND') })
btn_c3.addEventListener('click', (e) => { initMode(data.task[2], 'DISP_ALWAYS_ON') })
btn_c4.addEventListener('click', (e) => { initMode(data.task[2], 'AOD_SCROLL') })
btn_c5.addEventListener('click', (e) => { initMode(data.task[2], 'EYES_FREE') })

btn_tr1.addEventListener('click', (e) => { initMode(data.training[0], 'DISP_ON_DEMAND') })
btn_tr2.addEventListener('click', (e) => { initMode(data.training[1], 'DISP_ALWAYS_ON') })

btn_test.addEventListener('click', (e) => { initMode(data.training[1], 'DEFAULT') })
btn_read.addEventListener('click', (e) => { initRead(data.reading[0], 'DISP_ALWAYS_ON') })

mic.addEventListener('click', (e) => {
    if (mic.checked)
        recognition.start()
    else
        recognition.stop()
})

if (!pushToBladeLock)
    $(".lock").toggleClass('unlocked');

$(".lock").click(function () {
    $(this).toggleClass('unlocked');
    pushToBladeLock = !pushToBladeLock
});