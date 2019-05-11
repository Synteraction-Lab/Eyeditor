import { quill, Delta } from '../Services/quill.js'
import * as tts from '../Services/tts.js'
import { formatText } from '../Utils/stringutils.js';
import { feedbackOnTextLoad } from './FeedbackHandler.js';

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
    if (quill.history.stack.undo.length > 1) {
        let lastUndoStackEntryDelta = quill.history.stack.undo[quill.history.stack.undo.length-1].undo.ops[0]
        let indexOfUndo
        
        if (lastUndoStackEntryDelta)
            indexOfUndo = lastUndoStackEntryDelta.retain || 0
        
        quill.enable()
        quill.history.undo()
        quill.disable()
        
        return indexOfUndo;
    }
}

export const redo = () => {
    if (quill.history.stack.redo.length > 0) {
        let lastRedoStackEntryDelta = quill.history.stack.redo[quill.history.stack.redo.length-1].undo.ops[0]
        let indexOfRedo

        if (lastRedoStackEntryDelta)
            indexOfRedo = lastRedoStackEntryDelta.retain || 0

        quill.enable()
        quill.history.redo()
        quill.disable()
        
        return indexOfRedo;
    }
}