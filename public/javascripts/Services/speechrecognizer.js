import * as tts from './tts.js'
import * as parser from '../Engines/UtteranceParser.js'
import { feedbackOnUserUtterance } from '../Engines/FeedbackHandler.js'
import { forceNumberToWords } from '../Utils/stringutils.js';

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
    feedbackOnUserUtterance(hypothesis)

    tts.pause()

    if (event.results[last].isFinal) {
        hypothesis = forceNumberToWords(hypothesis)
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