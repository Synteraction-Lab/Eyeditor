// global variables
var voice;
var rate = 0.7;
var utterThis = new SpeechSynthesisUtterance('');
let synth = window.speechSynthesis;
// var voiceSelect = document.querySelector('select');

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

    // function populateVoiceList() {
    //     voices = synth.getVoices();
        
    //     for(i = 0; i < voices.length ; i++) {
    //         var option = document.createElement('option');
    //         option.textContent = voices[i].name + ' (' + voices[i].lang + ')';
            
    //         if(voices[i].default) {
    //             option.textContent += ' -- DEFAULT';
    //         }
            
    //         option.setAttribute('data-lang', voices[i].lang);
    //         option.setAttribute('data-name', voices[i].name);
    //         voiceSelect.appendChild(option);
    //     }
    // }

    // if (speechSynthesis.onvoiceschanged !== undefined) {
    //     speechSynthesis.onvoiceschanged = populateVoiceList;
    // }

    

    let s = setSpeech();
    // s.then((voices) => console.log(voices));  
    s.then((voices) => {
        // voice = voices.filter(x => x.default)[0]
        voice = voices.filter(x => x.name === 'Google US English')[0]
        // voice = voices[5]
        console.log(voice)
    });  
}

export function speak(text) {
    // utterThis = new SpeechSynthesisUtterance('');
    // var selectedOption = voiceSelect.selectedOptions[0].getAttribute('data-name');
    // for(i = 0; i < voices.length ; i++) {
    //     if(voices[i].name === selectedOption) {
    //         utterThis.voice = voices[i];
    //     }
    // }
    
    utterThis.voice = voice;
    utterThis.rate = rate;
    utterThis.text = text;

    synth.speak(utterThis);
}

export function isPaused() {
    return synth.paused
}

export function isSpeaking() {
    return synth.speaking
}

export function pause() {
    synth.cancel()
}

utterThis.onerror = function(event) {
    console.log('An error has occurred with the speech synthesis: ' + event.error);
}