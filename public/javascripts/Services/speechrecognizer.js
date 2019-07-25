import * as tts from './tts.js'
import * as parser from '../Engines/UtteranceParser.js'
import { feedbackOnUserUtterance, clearUserUtterance } from '../Engines/FeedbackHandler.js'
import { forceNumberToWords, splitHyphenatedWords, expandContractions } from '../Utils/stringutils.js';

/* Speech recognizer setup */
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;

export const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = true;
recognition.maxAlternatives = 1;

const USER_UTTERANCE_DISPLAY_TIMEOUT = 4000     // 4000ms

let userUtteranceDisplayTimer
let TTSReadStates = {
    'NOT_SET': -1,
    'READING': 1,
    'NOT_READING': 0
}
Object.freeze(TTSReadStates)

let TTSReadState = TTSReadStates.NOT_SET

export const getTTSReadState = () => TTSReadState;
export const setTTSReadState = (readState) => { TTSReadState = readState }
export const getTTSReadStates = () => TTSReadStates;

const preprocessHypothesis = (hypo) => {
    hypo = forceNumberToWords(hypo)
    hypo = splitHyphenatedWords(hypo)
    hypo = expandContractions(hypo)
    return hypo;
}

/* Recognition Events */
recognition.onresult = function(event) {
    var last = event.results.length - 1;
    var hypothesis = event.results[last][0].transcript.trim();

    transcript.innerHTML = hypothesis
    feedbackOnUserUtterance(hypothesis)

    if (TTSReadState === TTSReadStates.NOT_SET)
        if (tts.isReading())
                    TTSReadState = TTSReadStates.READING
            else    TTSReadState = TTSReadStates.NOT_READING

    tts.pause()

    if (event.results[last].isFinal) {
        clearTimeout(userUtteranceDisplayTimer)

        hypothesis = preprocessHypothesis(hypothesis)
        feedbackOnUserUtterance(hypothesis)

        userUtteranceDisplayTimer = setTimeout(clearUserUtterance, USER_UTTERANCE_DISPLAY_TIMEOUT)
        console.log('hypothesis: ' + hypothesis);

        parser.handleUtterance(hypothesis)
    }
}

recognition.onstart = function() {
    // console.log('Audio recognition started.');
}

recognition.onend = function() {
    if (mic.checked) {
        // console.log('Audio recognition restarted.');
        recognition.start()
    }
    else {
        recognition.stop()
        // console.log('Audio recognition stopped.');
    }
}