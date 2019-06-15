import { splitIntoWords, getWordFromWordIndex } from "../Utils/stringutils.js";
import { markupForSelection } from "../Utils/HTMLParser.js";
import { feedbackOnTextSelection, getCurrentWorkingText } from "./FeedbackHandler.js";

let wordCursorPosition;
let workingText;
let wordCount;
let rangeEndIndex;

export const initRange = () => { rangeEndIndex = wordCursorPosition }
export const clearRange = () => {
    if (rangeEndIndex != null)
        wordCursorPosition = rangeEndIndex;
    selectRange()
}

export const initEditMode = () => {
    wordCursorPosition = 0;
    workingText = getCurrentWorkingText().text
    wordCount = splitIntoWords(workingText).length
    selectRange()
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

    selectionEndWordIndex = (selectionEndWordIndex != null) ? selectionEndWordIndex : null;

    let selectionStartWordIndex = wordCursorPosition;

    console.log('START index', selectionStartWordIndex)
    console.log('END index', selectionEndWordIndex)

    if (selectionEndWordIndex != null && selectionEndWordIndex < selectionStartWordIndex)
        [selectionStartWordIndex, selectionEndWordIndex] = [selectionEndWordIndex, selectionStartWordIndex]
    
    let selectionStart = getWordFromWordIndex(workingText, selectionStartWordIndex)
    let selectionEnd = (selectionEndWordIndex) ? getWordFromWordIndex(workingText, selectionEndWordIndex) : selectionStart
    let sentenceRenderHTML =  workingText.substr(0, selectionStart.charIndex)
                            + markupForSelection( workingText.substring(selectionStart.charIndex, selectionEnd.charIndex + selectionEnd.charLength) )
                            + workingText.substr(selectionEnd.charIndex + selectionEnd.charLength)

    // console.log('sentenceRenderHTML', sentenceRenderHTML)
    feedbackOnTextSelection(sentenceRenderHTML)
}

export const alterSelection = (dir) => {
    if ( dir === 'RIGHT' && rangeEndIndex < wordCount-1 )
        rangeEndIndex = rangeEndIndex + 1;
    else if ( dir === 'LEFT' && rangeEndIndex > 0 )
        rangeEndIndex = rangeEndIndex - 1;

    selectRange(rangeEndIndex)
}


