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
let pushToBladeLock = true;    // if true => locked => push to blade.

let socket = getSocket();

const PARTICIPANT_ID = 'P1';

export const getFeedbackConfiguration = () => feedbackConfiguration
export const getLoadedText = () => loadedText
export const getPushToBladeLockStatus = () => pushToBladeLock

/* create the fuzzy set for command keywords */
generateFuzzySetForCommands()

const allocateLogFile = (studyTaskConfigLabel) => {
    // const logfileBase = `user_${uuid()}.csv`
    const logfileBase = `${PARTICIPANT_ID}_${studyTaskConfigLabel}_${uuid()}.csv`
    socket.emit('createlog', logfileBase)
}

const initLoad = (text, studyTaskConfigLabel) => {
    mic.checked = false
    editor.refreshText(text, true)
    loadedText = quill.getText()
    tts.setTTSReadStartedFlag(false)

    studyTaskConfigLabel = studyTaskConfigLabel || 'Training'
    TaskConfig.textContent = studyTaskConfigLabel

    allocateLogFile(studyTaskConfigLabel);
}

const initMode = (data, config, studyTaskConfigLabel) => {
    feedbackConfiguration = config
    setFeedbackConfigVariable(config)
    initLoad(data, studyTaskConfigLabel)
}

const initRead = (data, config) => {
    feedbackConfiguration = config
    initLoad(data)
}

/* Task Button Handlers */
/* Iteration 1 */
mode_EF.addEventListener('click', (e) => { initMode(data.task[0].textToCorrect, 'EYES_FREE') })
mode_AO.addEventListener('click', (e) => { initMode(data.task[1].textToCorrect, 'DISP_ALWAYS_ON') })
mode_AO_Audio.addEventListener('click', (e) => { initMode(data.task[2].textToCorrect, 'DEFAULT') })

/* Iteration 2 */
mode_OD.addEventListener('click', (e) => { initMode(data.task[1].textToCorrect, 'DISP_ON_DEMAND') })
mode_AOS.addEventListener('click', (e) => { initMode(data.task[2].textToCorrect, 'AOD_SCROLL') })

/* Iteration 3 */
mode_Flexi.addEventListener('click', (e) => { initMode(data.task[2].textToCorrect, 'ODD_FLEXI') })

/* Training */
train1.addEventListener('click', (e) => { initMode(data.training[0].textToCorrect, 'ODD_FLEXI') })
train2.addEventListener('click', (e) => { initMode(data.training[1].textToCorrect, 'ODD_FLEXI') })

/* Reading */
read1.addEventListener('click', (e) => { initRead(data.reading[0], 'DISP_ALWAYS_ON') })
read2.addEventListener('click', (e) => { initRead(data.reading[0], 'DISP_ALWAYS_ON') })

/* Final Study — AREDITalk vs Smartphone */
T1P1C1.addEventListener('click', (e) => { initMode(data.study.t1.path_easy.task_easy, 'ODD_FLEXI', 'T1P1C1') })
T1P1C2.addEventListener('click', (e) => { initMode(data.study.t1.path_easy.task_medi, 'ODD_FLEXI', 'T1P1C2') })
T1P1C3.addEventListener('click', (e) => { initMode(data.study.t1.path_easy.task_hard, 'ODD_FLEXI', 'T1P1C3') })

T1P2C1.addEventListener('click', (e) => { initMode(data.study.t1.path_medi.task_easy, 'ODD_FLEXI', 'T1P2C1') })
T1P2C2.addEventListener('click', (e) => { initMode(data.study.t1.path_medi.task_medi, 'ODD_FLEXI', 'T1P2C2') })
T1P2C3.addEventListener('click', (e) => { initMode(data.study.t1.path_medi.task_hard, 'ODD_FLEXI', 'T1P2C3') })

T1P3C1.addEventListener('click', (e) => { initMode(data.study.t1.path_hard.task_easy, 'ODD_FLEXI', 'T1P3C1') })
T1P3C2.addEventListener('click', (e) => { initMode(data.study.t1.path_hard.task_medi, 'ODD_FLEXI', 'T1P3C2') })
T1P3C3.addEventListener('click', (e) => { initMode(data.study.t1.path_hard.task_hard, 'ODD_FLEXI', 'T1P3C3') })

T2P1C1.addEventListener('click', (e) => { initMode(data.study.t2.path_easy.task_easy, 'ODD_FLEXI', 'T2P1C1') })
T2P1C2.addEventListener('click', (e) => { initMode(data.study.t2.path_easy.task_medi, 'ODD_FLEXI', 'T2P1C2') })
T2P1C3.addEventListener('click', (e) => { initMode(data.study.t2.path_easy.task_hard, 'ODD_FLEXI', 'T2P1C3') })

T2P2C1.addEventListener('click', (e) => { initMode(data.study.t2.path_medi.task_easy, 'ODD_FLEXI', 'T2P2C1') })
T2P2C2.addEventListener('click', (e) => { initMode(data.study.t2.path_medi.task_medi, 'ODD_FLEXI', 'T2P2C2') })
T2P2C3.addEventListener('click', (e) => { initMode(data.study.t2.path_medi.task_hard, 'ODD_FLEXI', 'T2P2C3') })

T2P3C1.addEventListener('click', (e) => { initMode(data.study.t2.path_hard.task_easy, 'ODD_FLEXI', 'T2P3C1') })
T2P3C2.addEventListener('click', (e) => { initMode(data.study.t2.path_hard.task_medi, 'ODD_FLEXI', 'T2P3C2') })
T2P3C3.addEventListener('click', (e) => { initMode(data.study.t2.path_hard.task_hard, 'ODD_FLEXI', 'T2P3C3') })

/* interface button eventlisteners */
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