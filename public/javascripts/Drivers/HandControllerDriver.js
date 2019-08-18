import { recognition } from '../Services/speechrecognizer.js'
import { startTaskTimer, pauseTaskTimer } from '../Services/tasktimer.js';
import { logFinalText } from '../Utils/UserDataLogger.js';
import { getSocket } from '../Services/socket.js';

const MIC_TOGGLE_KEY_CODE = 66

let socket = getSocket();

document.addEventListener('keydown', function(e) {
    if (e.keyCode === MIC_TOGGLE_KEY_CODE) {
        if ($("#mic").hasClass('fa-microphone-slash')) {
            $("#mic").removeClass('fa-microphone-slash')
            $("#mic").addClass('fa-microphone')
            console.log('Mic On.');
            recognition.start();
            startTaskTimer();
        }
        else {
            $("#mic").removeClass('fa-microphone')
            $("#mic").addClass('fa-microphone-slash')
            console.log('Mic Off.');
            recognition.stop();
            logFinalText();
            pauseTaskTimer();
            socket.emit('patch-file');
        }
    }
})
