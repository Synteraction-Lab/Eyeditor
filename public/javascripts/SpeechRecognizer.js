import * as tts from './tts.js'
import * as parser from './utteranceparser.js'
import { pushTextToBlade } from './VuzixBladeDriver.js';

/* Speech recognizer setup */
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;

export const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = true;
recognition.maxAlternatives = 1;

/* Recognition Events */
recognition.onresult = function(event) {
    var last = event.results.length - 1;
    var hypothesis = event.results[last][0].transcript.trim();

    currentTranscript.innerHTML = hypothesis

    // if (tts.isSpeaking())    tts.pause();
    tts.pause()

    if (event.results[last].isFinal) {
        parser.handleUtterance(hypothesis)
        console.log('hypothesis: ' + hypothesis);
    }
}

recognition.onstart = function() {
    console.log('Audio recognition started.');
}


recognition.onend = function() {
    if (mic.checked)
        recognition.start()
    else {
        recognition.stop()
        console.log('Audio recognition stopped.');
    }
}