import { refreshText } from './TextEditor.js'

const E_KEY_CODE = 69

/* Quill setup */
var toolbarOptions = [
    ['bold', 'italic', 'underline'],                // toggled buttons
    [{ 'color': [] }], 
    ['clean']                                         // remove formatting button
];

var options = {
    theme: 'snow',
    modules: {
        toolbar: toolbarOptions,
        history: {
            delay: 1500,
            maxStack: 100,
        }
    }
};

export var quill = new Quill('#editor',options);
export var Delta = Quill.import('delta');

quill.disable()

document.addEventListener('keydown', (e) => {
    if (e.metaKey && e.keyCode === E_KEY_CODE)
        quill.enable()
})

document.addEventListener('click', (e) => {
    if (e.shiftKey) {
        refreshText(quill.getText())
        quill.disable()
    }
})