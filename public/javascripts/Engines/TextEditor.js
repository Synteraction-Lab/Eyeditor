import { quill, Delta } from './Services/quill.js'
import * as tts from './Services/tts.js'
import { formatText } from './Utils/stringutils.js';
import { speakFeedback } from './AudioFeedbackHandler.js'
import { feedbackOnTextLoad, feedbackOnTextRefresh } from './FeedbackHandler.js';

var clickedAt;

editor.addEventListener('click', (e) => {
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

export const refreshText = (text, isTextLoad) => {
    quill.setText( formatText(text) )

    isTextLoad = isTextLoad || false
    if (isTextLoad) feedbackOnTextLoad()
        else feedbackOnTextRefresh()
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
    if (quill.history.stack.undo.length == 1)
        speakFeedback('There is nothing more to undo.', 'ERROR')
    else {
        quill.enable()
        quill.history.undo()
        quill.disable()
    }
}

export const redo = () => {
    if (quill.history.stack.redo.length == 0)
        speakFeedback('There is nothing more to redo.', 'ERROR')
    else {
        quill.enable()
        quill.history.redo()
        quill.disable()
    }
}