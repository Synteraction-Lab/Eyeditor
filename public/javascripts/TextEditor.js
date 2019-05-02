import { quill, Delta } from './quill.js'
import * as tts from './tts.js'
import { formatText } from './stringutils.js';
import { pushTextToBlade } from './VuzixBladeDriver.js'
import { speakFeedback } from './feedback.js'

var clickedAt;

editor.addEventListener('click', (e) => {
    // if (tts.isSpeaking()) tts.pause();
    tts.pause()

    clickedAt = quill.getSelection().index
    console.log('clicked on text editor at index', clickedAt)

    if (e.metaKey) {
        var startOfWord = quill.getText().lastIndexOf(' ', clickedAt) +1
        tts.read(startOfWord)
    }
});

editor.addEventListener('dblclick', (e) => {
    clickedAt = quill.getSelection().index
    tts.read(clickedAt)
})

export const refreshText = (text) => {
    quill.setText( formatText(text) )
    pushTextToBlade(quill.getText())
}

const updateCompleted = () => {
    return new Promise(function(resolve) {
        resolve();
    })
}

export const deleteText = (updateParam) => {
    quill.focus()
    return new Promise(function(resolve) {
        quill.updateContents(new Delta()
            .retain(updateParam.startIndex)
            .delete(updateParam.length)
            .retain(quill.getSelection().index));

        Promise.all([updateCompleted()]).then(function() {
            resolve();
        })
    })
}

export const replaceText = (updateParam) => {
    quill.focus()
    return new Promise(function(resolve) {
        quill.updateContents(new Delta()
            .retain(updateParam.startIndex)
            .delete(updateParam.length)
            .insert(updateParam.updateText)
            .retain(quill.getSelection().index));

        Promise.all([updateCompleted()]).then(function() {
            resolve();
        })
    })
}

export const insertText = (updateParam) => {
    quill.focus()
    return new Promise(function(resolve) {
        quill.updateContents(new Delta()
            .retain(updateParam.startIndex)
            .insert(updateParam.updateText + ' ')
            .retain(quill.getSelection().index));

        Promise.all([updateCompleted()]).then(function() {
            resolve();
        })
    })
}

export const undo = () => {
    quill.focus()
    // quill.enable()
    return new Promise(function(resolve) {
        if (quill.history.stack.undo.length == 1) {
            speakFeedback('There is nothing more to undo.', 'ERROR')
            resolve()
        } else {
            quill.history.undo();

            Promise.all([updateCompleted()]).then(function() {
                // quill.disable();
                resolve();
            })
        }
    })
}

export const redo = () => {
    quill.focus()
    // quill.enable()
    return new Promise(function(resolve) {
        if (quill.history.stack.redo.length == 0) {
            speakFeedback('There is nothing more to redo.', 'ERROR')
            resolve()
        } else {
            quill.history.redo();

            Promise.all([updateCompleted()]).then(function() {
                // quill.disable();
                resolve();
            })
        }
    })
}