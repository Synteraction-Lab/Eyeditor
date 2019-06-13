import { splitIntoWords, getWordFromWordIndex } from "../Utils/stringutils.js";
import { markupForSelection } from "../Utils/HTMLParser.js";
import { feedbackOnTextSelection, getCurrentWorkingText } from "./FeedbackHandler.js";

let wordCursorPosition = 0; // at first word

export const moveWordCursor = (dir) => {
    let workingText = getCurrentWorkingText().text
    let wordCount = splitIntoWords(workingText).length
    
    if ( dir === 'RIGHT' && wordCursorPosition < wordCount-1 ) {
        wordCursorPosition = wordCursorPosition + 1;
        selectWord(workingText, wordCursorPosition)
    }
    else if ( dir === 'LEFT' && wordCursorPosition > 0 ) {
        wordCursorPosition = wordCursorPosition - 1;
        selectWord(workingText, wordCursorPosition)
    }
}

const selectWord = (text, cursorPosition) => {
    let selection = getWordFromWordIndex(text, cursorPosition)
    let sentenceRenderHTML =  text.substr(0, selection.charIndex)
                            + markupForSelection(selection.word)
                            + text.substr(selection.charIndex + selection.length)

    console.log('sentenceRenderHTML', sentenceRenderHTML)
    feedbackOnTextSelection(sentenceRenderHTML)
}