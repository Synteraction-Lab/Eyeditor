import { quill, Delta } from '../Services/quill.js'
import * as tts from '../Services/tts.js'
import { formatText } from '../Utils/stringutils.js';
import { feedbackOnTextLoad, getCurrentWorkingText } from './FeedbackHandler.js';
import { logTextChange } from '../Utils/UserDataLogger.js';

let clickedAt;

editor.addEventListener('click', (e) => {
    tts.pause()

    clickedAt = quill.getSelection().index
    console.log('clicked on text editor at index', clickedAt)

    if (e.metaKey) {
        let startOfWord = quill.getText().lastIndexOf(' ', clickedAt) +1
        tts.read(startOfWord)
    }
});

editor.addEventListener('dblclick', (e) => {
    clickedAt = quill.getSelection().index
    tts.read(clickedAt)
})

export const refreshText = (text, isTextLoad) => {
    quill.setText(formatText(text, isTextLoad))
    if (isTextLoad) 
        feedbackOnTextLoad()
}

const updateCompleted = () => {
    return new Promise(function(resolve) {
        resolve();
    })
}

let sentenceBeforeUpdate;
export const getSentenceBeforeUpdate = () => sentenceBeforeUpdate;

export const deleteText = (updateParam) => {
    sentenceBeforeUpdate = getCurrentWorkingText().text
    quill.focus()
    return new Promise(function(resolve) {
        quill.updateContents(new Delta()
            .retain(updateParam.startIndex)
            .delete(updateParam.length)
            .retain(quill.getSelection().index));

        Promise.all([updateCompleted()]).then(function() {
            logTextChange();
            resolve();
        })
    })
}

export const replaceText = (updateParam) => {
    sentenceBeforeUpdate = getCurrentWorkingText().text
    quill.focus()
    return new Promise(function(resolve) {
        quill.updateContents(new Delta()
            .retain(updateParam.startIndex)
            .delete(updateParam.length)
            .insert(updateParam.updateText)
            .retain(quill.getSelection().index));

        Promise.all([updateCompleted()]).then(function() {
            logTextChange();
            resolve();
        })
    })
}

export const insertText = (updateParam) => {
    sentenceBeforeUpdate = getCurrentWorkingText().text
    quill.focus()
    return new Promise(function(resolve) {
        quill.updateContents(new Delta()
            .retain(updateParam.startIndex)
            .insert(updateParam.updateText + ' ')
            .retain(quill.getSelection().index));

        Promise.all([updateCompleted()]).then(function() {
            logTextChange();
            resolve();
        })
    })
}

export const undo = () => {
    sentenceBeforeUpdate = getCurrentWorkingText().text

    let historyObject = { op: 'undo', index: undefined, length: undefined };
    if ( quill.history.stack.undo.length > 1 ) {
        let lastUndoStackEntryDelta = quill.history.stack.undo[quill.history.stack.undo.length - 1].undo.ops
        if (lastUndoStackEntryDelta) {
            historyObject.index =  ("retain" in lastUndoStackEntryDelta[0]) ? lastUndoStackEntryDelta[0].retain : undefined
            historyObject.length = ("delete" in lastUndoStackEntryDelta[1]) ? lastUndoStackEntryDelta[1].delete : undefined
        }

        quill.enable()
        quill.history.undo()
        quill.disable()
    }

    return historyObject;
}

export const redo = () => {
    sentenceBeforeUpdate = getCurrentWorkingText().text

    let historyObject = { op: 'redo', index: undefined, length: undefined };
    if ( quill.history.stack.redo.length > 0 ) {
        let lastRedoStackEntryDelta = quill.history.stack.redo[quill.history.stack.redo.length - 1].undo.ops
        if (lastRedoStackEntryDelta) {
            historyObject.index =  ("retain" in lastRedoStackEntryDelta[0]) ? lastRedoStackEntryDelta[0].retain : undefined
            historyObject.length = ("delete" in lastRedoStackEntryDelta[1]) ? lastRedoStackEntryDelta[1].delete : undefined
        }

        quill.enable()
        quill.history.redo()
        quill.disable()
    }
    
    return historyObject;
}