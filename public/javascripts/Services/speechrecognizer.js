import * as tts from './tts.js'
import * as parser from '../Engines/UtteranceParser.js'
import { feedbackOnUserUtterance, clearUserUtterance } from '../Engines/FeedbackHandler.js'
import { forceNumberToWords } from '../Utils/stringutils.js';

/* Speech recognizer setup */
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;

export const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = true;
recognition.maxAlternatives = 1;

const USER_UTTERANCE_DISPLAY_TIMEOUT = 4000     // 4000ms
let userUtteranceDisplayTimer

/* Recognition Events */
recognition.onresult = function(event) {
    var last = event.results.length - 1;
    var hypothesis = event.results[last][0].transcript.trim();

    currentTranscript.innerHTML = hypothesis
    feedbackOnUserUtterance(hypothesis)

    tts.pause()

    if (event.results[last].isFinal) {
        clearTimeout(userUtteranceDisplayTimer)

        hypothesis = forceNumberToWords(hypothesis)
        feedbackOnUserUtterance(hypothesis)

        userUtteranceDisplayTimer = setTimeout(clearUserUtterance, USER_UTTERANCE_DISPLAY_TIMEOUT)
        console.log('hypothesis: ' + hypothesis);

        parser.handleUtterance(hypothesis)
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