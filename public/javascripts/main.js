import { data } from './Data/data.js'
import * as tts from './Services/tts.js'
import { recognition } from './Services/speechrecognizer.js';
import * as editor from './Engines/TextEditor.js'
import { generateFuzzySetForCommands } from './Utils/fuzzymatcher.js';
import { quill } from './Services/quill.js'
import { setFeedbackConfigVariable } from './Drivers/RingControllerDriver.js';
import { startTaskTimer, pauseTaskTimer } from './Services/tasktimer.js';
import { getSocket } from './Services/socket.js';
import uuid from './Services/uuid.js'
import { logFinalText } from './Utils/UserDataLogger.js';

let feedbackConfiguration = 'DEFAULT';
let loadedText;
let pushToBladeLock = false;    // if true => locked => push to blade.

let socket = getSocket();

export const getFeedbackConfiguration = () => feedbackConfiguration
export const getLoadedText = () => loadedText
export const getPushToBladeLockStatus = () => pushToBladeLock

/* create the fuzzy set for command keywords */
generateFuzzySetForCommands()

const initLoad = (text) => {
    mic.checked = false
    editor.refreshText(text, true)
    loadedText = quill.getText()
    tts.setTTSReadStartedFlag(false)
    allocateLogFile();
}

const initMode = (data, config) => {
    feedbackConfiguration = config
    setFeedbackConfigVariable(config)
    initLoad(data.textToCorrect)
}

const initRead = (data, config) => {
    feedbackConfiguration = config
    initLoad(data)
}

/* Task Button Handlers */
/* Iteration 1 */
mode_EF.addEventListener('click', (e) => { initMode(data.task[0], 'EYES_FREE') })
mode_AO.addEventListener('click', (e) => { initMode(data.task[1], 'DISP_ALWAYS_ON') })
mode_AO_Audio.addEventListener('click', (e) => { initMode(data.task[2], 'DEFAULT') })

/* Iteration 2 */
mode_OD.addEventListener('click', (e) => { initMode(data.task[1], 'DISP_ON_DEMAND') })
mode_AOS.addEventListener('click', (e) => { initMode(data.task[2], 'AOD_SCROLL') })

/* Iteration 3 */
mode_Flexi.addEventListener('click', (e) => { initMode(data.task[2], 'ODD_FLEXI') })

/* Training */
train1.addEventListener('click', (e) => { initMode(data.training[0], 'ODD_FLEXI') })
train2.addEventListener('click', (e) => { initMode(data.training[1], 'ODD_FLEXI') })

/* Reading */
read1.addEventListener('click', (e) => { initRead(data.reading[0], 'DISP_ALWAYS_ON') })
read2.addEventListener('click', (e) => { initRead(data.reading[0], 'DISP_ALWAYS_ON') })

$("#mic").click(function () {
    if ($(this).hasClass('fa-microphone-slash')) {
        $(this).removeClass('fa-microphone-slash')
        $(this).addClass('fa-microphone')
        console.log('Mic On.');
        recognition.start();
        startTaskTimer();
    }
    else {
        $(this).removeClass('fa-microphone')
        $(this).addClass('fa-microphone-slash')
        console.log('Mic Off.');
        recognition.stop();
        logFinalText();
        pauseTaskTimer();
        socket.emit('patch-file');
    }
});

if (!pushToBladeLock)
    $("#lock").toggleClass('fa-unlock');

$("#lock").click(function () {
    $(this).toggleClass('fa-unlock');
    pushToBladeLock = !pushToBladeLock
});

const allocateLogFile = () => {
    const logfileBase = `user_${uuid()}.csv`
    socket.emit('createlog', logfileBase)
}