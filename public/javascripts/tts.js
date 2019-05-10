import { quill } from './quill.js'

// global variables
var voice;
const RATE = 0.6;
var synthUtterance = new SpeechSynthesisUtterance('');
let synth = window.speechSynthesis;
var timeoutResumeInfinity
var TTSRelativeReadIndex
var TTSAbsoluteReadIndex

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
    synthUtterance.rate = rate || RATE;
    synthUtterance.text = text;
    
    synth.speak(synthUtterance);
}

export function isPaused() {
    return synth.paused
}

export function isSpeaking() {
    return synth.speaking
}

export function pause() {
    console.log('TTS has stopped reading.')
    synth.cancel()
}

function resumeInfinity() {
    synth.resume();
    timeoutResumeInfinity = setTimeout(resumeInfinity, 1000);
}

/* utterance event handlers */
synthUtterance.onstart = function(event) {
    resumeInfinity();
};

synthUtterance.onend = function(event) {
    clearTimeout(timeoutResumeInfinity);
};

synthUtterance.onboundary = function(event) {
    TTSRelativeReadIndex = event.charIndex
};

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
    TTSAbsoluteReadIndex = index
    speak(quill.getText(index))
}
