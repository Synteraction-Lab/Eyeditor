import { quill } from './quill.js'
import { setCurrentWorkingText, setCurrentWorkingTextSentenceIndex } from '../Engines/FeedbackHandler.js';
import { getSentenceIndexGivenCharIndexPosition } from '../Utils/stringutils.js';

// global variables
var voice;
const TEXT_READ_RATE = 0.6;
var synthUtterance = new SpeechSynthesisUtterance('');
let synth = window.speechSynthesis;
var timeoutResumeInfinity
var TTSRelativeReadIndex
var TTSAbsoluteReadIndex
var TTSReadStartedFlag = false
var TTSReadFlag

let lastSentenceIndexRead; 

/* Speech synthesizer setup */
export function setup() {
    function setSpeech() {
        return new Promise(
            function (resolve, reject) {
                let id;
                id = setInterval(() => {
                    if (synth.getVoices().length !== 0) {
                        resolve(synth.getVoices());
                        clearInterval(id);
                    }
                }, 10);
            }
        )
    }

    let s = setSpeech();
    s.then((voices) => {
        // voice = voices.filter(x => x.default)[0]
        // voice = voices.filter(x => x.name === 'Google US English')[0]
        // console.log(voices)
        // voice = voices[7]
        voice = voices[32]
    });  
}

export function speak(text, rate) { // speak() reads just passed argument at a given speaking rate. low-level method used by read().
    synthUtterance.voice = voice;
    synthUtterance.rate = rate || TEXT_READ_RATE;
    synthUtterance.text = text;
    
    synth.speak(synthUtterance);
}

export function isReading() {
    return TTSReadFlag
}

export function pause() {
    // console.log('TTS has stopped reading.')
    synth.cancel()
}

function resumeInfinity() {
    synth.resume();
    timeoutResumeInfinity = setTimeout(resumeInfinity, 1000);
}

/* utterance event handlers */
synthUtterance.onstart = function(event) {
    TTSReadFlag = true
    resumeInfinity();
};

synthUtterance.onend = function(event) {
    TTSReadFlag = false
    clearTimeout(timeoutResumeInfinity);
};

synthUtterance.onboundary = function(event) {
    if (event.target.rate.toFixed(1) == TEXT_READ_RATE) {
        let interruptIndex, currentSentenceIndexReading;

        TTSRelativeReadIndex = event.charIndex
        interruptIndex = (TTSAbsoluteReadIndex + TTSRelativeReadIndex) || 0
        currentSentenceIndexReading = getSentenceIndexGivenCharIndexPosition(quill.getText(), interruptIndex)

        if (currentSentenceIndexReading !== lastSentenceIndexRead) {
            // console.log('Current sentence index reading:', currentSentenceIndexReading)
            lastSentenceIndexRead = currentSentenceIndexReading
            setCurrentWorkingTextSentenceIndex(currentSentenceIndexReading)
            setCurrentWorkingText(currentSentenceIndexReading)
        }
    }
}

synthUtterance.onerror = function(event) {
    console.log('An error has occurred with the speech synthesis: ' + event.error);
}

export const getTTSAbsoluteReadIndex = () => {
    return TTSAbsoluteReadIndex || 0;
}

export function getTTSRelativeReadIndex() {
    return TTSRelativeReadIndex || 0;
}

export const read = (index) => {    // read() reads from the quill from a given index. high-level method, calls low-level speak()
    TTSReadStartedFlag = true
    TTSAbsoluteReadIndex = index
    speak(quill.getText(index))
}

export const getTTSReadStartedFlag = () => TTSReadStartedFlag;
export const setTTSReadStartedFlag = (flagStatus) => { TTSReadStartedFlag = flagStatus; }