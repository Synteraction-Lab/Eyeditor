import { splitIntoWords, getWordFromWordIndex } from "../Utils/stringutils.js";
import { markupForSelection } from "../Utils/HTMLParser.js";
import { feedbackOnTextSelection, getCurrentWorkingText } from "./FeedbackHandler.js";
import { setRangeSelectionMode } from "../Drivers/RingControllerDriver.js";

let wordCursorPosition;
let workingText;
let wordCount;
let rangeStartWordIndex, rangeEndWordIndex;
let rangeStartCharIndex, rangeEndCharIndex;
let workingEndWordIndex;

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
    // console.log('received selectionEndWordIndex', (selectionEndWordIndex==null))
    
    let selectionStartWordIndex = wordCursorPosition;
    selectionEndWordIndex = (selectionEndWordIndex != null) ? selectionEndWordIndex : null;

    // console.log('START index', selectionStartWordIndex)
    // console.log('END index', selectionEndWordIndex)

    if (selectionEndWordIndex != null && selectionEndWordIndex < selectionStartWordIndex)
        [selectionStartWordIndex, selectionEndWordIndex] = [selectionEndWordIndex, selectionStartWordIndex]
    
    let selectionStart = getWordFromWordIndex(workingText.text, selectionStartWordIndex)
    let selectionEnd = (selectionEndWordIndex != null) ? getWordFromWordIndex(workingText.text, selectionEndWordIndex) : selectionStart
    let sentenceRenderHTML =  workingText.text.substr(0, selectionStart.charIndex)
                            + markupForSelection( workingText.text.substring(selectionStart.charIndex, selectionEnd.charIndex + selectionEnd.charLength) )
                            + workingText.text.substr(selectionEnd.charIndex + selectionEnd.charLength)

    setSelectionRangeWordIndices(selectionStartWordIndex, selectionEndWordIndex);
    setSelectionRangeCharIndices(selectionStart.charIndex, selectionEnd.charIndex + selectionEnd.charLength);

    // console.log('set rangeStartWordIndex', rangeStartWordIndex )
    // console.log('set rangeEndWordIndex', rangeEndWordIndex )

    // console.log('sentenceRenderHTML', sentenceRenderHTML)
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

export const renderTextPostUpdate = (utterance) => {
    setWorkingText();
    // console.log('(post update) rangeStartWordIndex', rangeStartWordIndex)
    wordCursorPosition = rangeStartWordIndex;
    selectRange(rangeStartWordIndex + splitIntoWords(utterance).length - 1);
    setRangeSelectionMode(false);
}
