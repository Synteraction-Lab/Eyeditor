import { splitIntoWords, getWordAtWordIndex, getWordIndexFromCharIndex, getWhichWordBoudary, getCharIndexOfWordBoundary, getNextWordCharIndex } from "../Utils/stringutils.js";
import { markupForSelection, markupForInsertionInEditMode } from "../Utils/HTMLParser.js";
import { feedbackOnTextSelection, getCurrentWorkingText } from "./FeedbackHandler.js";
import { setRangeSelectionMode, setInsertMode } from "../Drivers/RingControllerDriver.js";

let wordCursorPosition;
let workingText;
let wordCount;
let rangeStartWordIndex, rangeEndWordIndex;     // relative to workingText
let rangeStartCharIndex, rangeEndCharIndex;     // relative to workingText
let workingEndWordIndex;

let insertionObject = {     // all indices are char indices relative to workingText
    markerIndex: undefined,
    insertionIndex: undefined,
    nextInsertionBaseIndex: undefined,
    direction: undefined
};

export const initRange = () => { workingEndWordIndex = wordCursorPosition }
export const clearRange = () => {
    if (workingEndWordIndex != null)
        wordCursorPosition = workingEndWordIndex;
    selectRange()
}

export const initEditMode = () => {
    wordCursorPosition = 0;
    setWorkingText();
    selectRange();
}

const initInsertInEditMode = (dir) => {
    setRangeSelectionMode(false);

    if (dir === 'LEFT') {
        setInsertionParameters(rangeStartCharIndex, dir)
        wordCursorPosition = getWordIndexFromCharIndex(workingText.text, rangeStartCharIndex)
    }
    else if (dir === 'RIGHT') {
        setInsertionParameters(rangeEndCharIndex - 1, dir)
        wordCursorPosition = getWordIndexFromCharIndex(workingText.text, rangeEndCharIndex)
    }
}

const getInsertionParametersForContinuedInsertion = (dir) => {
    let currentMarkerIndex = insertionObject.markerIndex
    let currentText = workingText.text
    let wordBoundaryDir = getWhichWordBoudary(currentText, currentMarkerIndex)
    if (dir === 'LEFT') {
        if (wordBoundaryDir === 'LEFT' && wordCursorPosition > 0) {
            wordCursorPosition = wordCursorPosition - 1
            currentMarkerIndex = currentMarkerIndex - 1
        }
        currentMarkerIndex = getCharIndexOfWordBoundary(currentText, currentMarkerIndex, dir)
    }
    else if (dir === 'RIGHT') {
        if ( (wordBoundaryDir === 'RIGHT' || getWordAtWordIndex(currentText, wordCursorPosition).charLength === 1) && wordCursorPosition < wordCount - 1 ) {
            wordCursorPosition = wordCursorPosition + 1
            currentMarkerIndex = getNextWordCharIndex(currentText, currentMarkerIndex + 1)
        }
        currentMarkerIndex = getCharIndexOfWordBoundary(currentText, currentMarkerIndex, dir)
    }
    setInsertionParameters(currentMarkerIndex, dir)
}

// const toggleDirection = (dir) => (dir === 'LEFT') ? 'RIGHT' : 'LEFT';

export const exitInsertMode = () => { 
    setInsertMode(false);
    selectRange(); 
}

const setWorkingText = () => {
    workingText = getCurrentWorkingText()
    wordCount = splitIntoWords(workingText.text).length
}

export const moveWordCursor = (dir) => {
    if ( dir === 'RIGHT' && wordCursorPosition < wordCount-1 )
        wordCursorPosition = wordCursorPosition + 1;
    else if ( dir === 'LEFT' && wordCursorPosition > 0 )
        wordCursorPosition = wordCursorPosition - 1;

    selectRange()
}

const selectRange = (selectionEndWordIndex) => {
    let selectionStartWordIndex = wordCursorPosition;
    selectionEndWordIndex = (selectionEndWordIndex != null) ? selectionEndWordIndex : null;

    // console.log('START index', selectionStartWordIndex)
    // console.log('END index', selectionEndWordIndex)

    if (selectionEndWordIndex != null && selectionEndWordIndex < selectionStartWordIndex)
        [selectionStartWordIndex, selectionEndWordIndex] = [selectionEndWordIndex, selectionStartWordIndex]
    
    let selectionStart = getWordAtWordIndex(workingText.text, selectionStartWordIndex)
    let selectionEnd = (selectionEndWordIndex != null) ? getWordAtWordIndex(workingText.text, selectionEndWordIndex) : selectionStart
    let sentenceRenderHTML =  workingText.text.substr(0, selectionStart.charIndex)
                            + markupForSelection( workingText.text.substring(selectionStart.charIndex, selectionEnd.charIndex + selectionEnd.charLength) )
                            + workingText.text.substr(selectionEnd.charIndex + selectionEnd.charLength)

    setSelectionRangeWordIndices(selectionStartWordIndex, selectionEndWordIndex);
    setSelectionRangeCharIndices(selectionStart.charIndex, selectionEnd.charIndex + selectionEnd.charLength);

    // console.log('set rangeStartWordIndex', rangeStartWordIndex )
    // console.log('set rangeEndWordIndex', rangeEndWordIndex )

    feedbackOnTextSelection(sentenceRenderHTML)
}

const setSelectionRangeWordIndices = (startIndex, endIndex) => { [rangeStartWordIndex, rangeEndWordIndex] = [startIndex, endIndex] };
const setSelectionRangeCharIndices = (startIndex, endIndex) => { [rangeStartCharIndex, rangeEndCharIndex] = [startIndex, endIndex] };
export const getSelectionRangeAbsCharIndices = () => (
    { 
        startIndex: workingText.startIndex + rangeStartCharIndex, 
        endIndex: workingText.startIndex + rangeEndCharIndex
    }
);

export const alterSelection = (dir) => {
    if ( dir === 'RIGHT' && workingEndWordIndex < wordCount-1 )
        workingEndWordIndex = workingEndWordIndex + 1;
    else if ( dir === 'LEFT' && workingEndWordIndex > 0 )
        workingEndWordIndex = workingEndWordIndex - 1;

    selectRange(workingEndWordIndex)
}

export const insertInEditMode = (dir, isContinuedInsertion) => {
    if (!isContinuedInsertion)
        initInsertInEditMode(dir);
    else
        getInsertionParametersForContinuedInsertion(dir)
    renderTextWithInsertionMarker(dir);
}

export const getInsertionObject = () => (
    {
        'index': workingText.startIndex + insertionObject.insertionIndex,
        'direction': insertionObject.direction
    }
)

const setInsertionParameters = (markerIndex, dir) => {
    insertionObject.markerIndex = markerIndex
    insertionObject.direction = dir

    if (dir === 'LEFT') {
        insertionObject.insertionIndex = insertionObject.markerIndex
        insertionObject.nextInsertionBaseIndex = insertionObject.insertionIndex
    }
    else if (dir === 'RIGHT') {
        insertionObject.insertionIndex = insertionObject.markerIndex + 1
        insertionObject.nextInsertionBaseIndex = insertionObject.insertionIndex + 1
    }
}

const renderTextWithInsertionMarker = (dir) => {
    let sentenceRenderHTML =  workingText.text.substr(0, insertionObject.markerIndex)
                            + markupForInsertionInEditMode(workingText.text.substr(insertionObject.markerIndex, 1), dir)
                            + workingText.text.substr(insertionObject.markerIndex + 1)

    feedbackOnTextSelection(sentenceRenderHTML)
}

export const renderTextPostUpdate = (utterance, suppressRangeSelect) => {
    setWorkingText();
    wordCursorPosition = (rangeStartWordIndex < wordCount) ? rangeStartWordIndex : rangeStartWordIndex - 1;
    
    if (suppressRangeSelect)
        selectRange()
    else
        selectRange(wordCursorPosition + splitIntoWords(utterance).length - 1);

    setRangeSelectionMode(false);
}

export const renderTextPostInsertion = (utterance) => {
    setWorkingText();
    setInsertionParameters(insertionObject.nextInsertionBaseIndex + utterance.length - 1, 'RIGHT');
    renderTextWithInsertionMarker('RIGHT');
    wordCursorPosition = getWordIndexFromCharIndex(workingText.text, insertionObject.insertionIndex)
}

export const renderTextOnUndoRedoInEditInsertMode = () => {
    setWorkingText();
    wordCursorPosition = getWordIndexFromCharIndex(workingText.text, rangeStartCharIndex);
    exitInsertMode();
}