import { findLeftContext, findRightContext, stripRight, stripLeft, findInText } from '../../Utils/stringutils.js';
import { insertText, replaceText, refreshText } from '../TextEditor.js'
import { quill } from '../../Services/quill.js'
import { provideSuccessFeedback, provideFailureFeedback } from './feedback.js'
import { searchFuzzyMatchInText } from '../../Utils/fuzzymatcher.js';

class lock {
    constructor() { this.lockStatus = false; }
    lock() { this.lockStatus = true; }
    unlock() { this.lockStatus = false; }
    islocked() { return this.lockStatus; }
}
let updationLock = new lock()
let updateParameter

export const handleRedictation = (utterance, workingText, isDispAlwaysOnMode) => {
    let leftContext, rightContext;
    let leftDelta, rightDelta;
    
    [leftContext, rightContext, leftDelta, rightDelta] = getNormalizedContextandDelta(workingText.text, utterance)
    let alignmentObject = { workingText, utterance, leftContext, rightContext, leftDelta, rightDelta }
    console.log('alignmentObject', alignmentObject)

    let alignmentConfig = getAlignmentConfiguration(alignmentObject)
    let deltaAlignment = getDeltaAlignment(alignmentConfig)
    console.log('alignmentConfig', alignmentConfig)
    console.log('deltaAlignment', deltaAlignment)
    
    /* total of 9 possibilities (normalized): ∂, (range): LR, LR∂, ∂LR, ∂LR∂, (no range): L, L∂, ∂L, ∂L∂
        deltaAlignment: (INS) ∂LR, ∂LR∂, ∂L∂; (SUB) LR∂, ∂L, L∂ */

    if (!leftContext) {  // (config: ∂) no match found within the text, so utterance can be interpreted as a change instruction, normalized get method will give a left delta to work with
        let fuzzyMatch = searchFuzzyMatchInText(utterance, workingText.text)
        console.log('fuzzyMatch', fuzzyMatch)

        if (fuzzyMatch) {
            replaceFuzzyMatch(alignmentObject, fuzzyMatch)
            runPostUpdateRoutine()
            if (isDispAlwaysOnMode) return true;
        }
        else {
            if (isDispAlwaysOnMode)
                return false;
            else return;
        }
    }

    else if (leftContext.matchInText === utterance) {
        if (!isDispAlwaysOnMode)
            provideFailureFeedback('Nothing to update.')
        else return false;
    }

    else {
        if (rightDelta) {
            console.log('========== Right ∂ Present ==========')
            if (deltaAlignment === 'SUB') {
                replaceNextWord(alignmentObject);
                if (!updationLock.islocked()) {
                    console.log('SUB Not Possible. Proceeding with INS.')
                    insertRightDelta(alignmentObject);
                }
            }
            else {
                console.log('Performing Alignment INS.')
                insertRightDelta(alignmentObject);
            }
        }

        if (rightContext) {   // both L&R context are present, so a range to replace, mathc is (lazy) — finds last occurring, densest cluster of L∂R
            console.log('========== Updation: L∂R ===========')
            replaceLDR(alignmentObject);
        }

        if (leftDelta) {
            console.log('========== Left ∂ Present ==========')
            if (deltaAlignment === 'SUB') {
                replacePrevWord(alignmentObject);
                if (!updationLock.islocked()) {
                    console.log('SUB Not Possible. Proceeding with INS.')
                    insertLeftDelta(alignmentObject);
                }
            }
            else {
                console.log('Performing Alignment INS.')
                insertLeftDelta(alignmentObject);
            }
        }

        runPostUpdateRoutine();
        if (isDispAlwaysOnMode) return true;
    }
}

const runPostUpdateRoutine = () => {
    refreshText(quill.getText())
    provideSuccessFeedback('Text Updated', updateParameter)
}

const replaceFuzzyMatch = (alignmentObject, fuzzyMatch) => {
    const { workingText, utterance } = alignmentObject;
    
    let findResult = findInText(fuzzyMatch, workingText.text)
    console.log('(replaceFuzzyMatch) findResult', findResult);

    if (findResult) 
        updateParameter = {
            startIndex: workingText.startIndex + findResult.startIndex,
            length: findResult.length,
            updateText: utterance
        }

    replaceText(updateParameter);
}

const replaceLDR = (alignmentObject) => {
    const { workingText, utterance, leftContext, rightContext, leftDelta, rightDelta } = alignmentObject;
    
    updateParameter = {
        startIndex: workingText.startIndex + leftContext.matchIndex,
        length: rightContext.matchIndex + rightContext.length - leftContext.matchIndex,
        updateText: stripRight(stripLeft(utterance, leftDelta), rightDelta)
    }

    replaceText(updateParameter);
}

const replaceNextWord = (alignmentObject) => {
    const { workingText, leftContext, rightContext, rightDelta } = alignmentObject;

    let regexNextWordString
    if (!rightContext)
        regexNextWordString = `(?<=\\b${leftContext.matchInText}\\b)[;,:]*\\s(\\b\\w+\\b)`    // Regex Used:  (?<=\brecovers\b)[;,:]*\s(\b\w+\b)
    else
        regexNextWordString = `(?<=\\b${rightContext.matchInText}\\b)[;,:]*\\s(\\b\\w+\\b)`    // Regex Used:  (?<=\brecovers\b)[;,:]*\s(\b\w+\b)

    let regexNextWord = new RegExp(regexNextWordString, 'gi')

    let match, saveMatch
    while( (match = regexNextWord.exec(workingText.text)) !== null )
        saveMatch = Object.assign({}, match)
    match = Object.assign({}, saveMatch)
    console.log('(replaceNextWord) match', match)

    if (match && match[0]) {
        console.log('SUB Possible')
        updateParameter = {
            startIndex: workingText.startIndex + match.index + (match[0].length - match[1].length),
            length: match[1].length,
            updateText: rightDelta
        }

        replaceText(updateParameter);
        updationLock.lock()
    }
    else updationLock.unlock()
}

const replacePrevWord = (alignmentObject) => {
    const { workingText, leftContext, leftDelta } = alignmentObject;

    let regexPrevWordString = `(\\b\\w+\\b)(?=[;,:]*\\s\\b${leftContext.matchInText}\\b)`    // Regex Used:  (\b\w+\b)(?=[;,:]*\s\brecovers\b)
    let regexPrevWord = new RegExp(regexPrevWordString, 'gi')

    let match, saveMatch
    while ((match = regexPrevWord.exec(workingText.text)) !== null)
        saveMatch = Object.assign({}, match)
    match = Object.assign({}, saveMatch)
    console.log('(replacePrevWord) match', match)

    if (match && match[0]) {
        console.log('SUB Possible')
        updateParameter = {
            startIndex: workingText.startIndex + match.index,
            length: match[0].length,
            updateText: leftDelta
        }

        replaceText(updateParameter);
        updationLock.lock()
    }
    else updationLock.unlock()
}

const insertRightDelta = (alignmentObject) => {
    const { workingText, leftContext, rightContext, rightDelta } = alignmentObject;

    if (!rightContext)
        updateParameter = {
            startIndex: workingText.startIndex + leftContext.matchIndex + leftContext.length,
            length: 0,
            updateText: ' ' + rightDelta
        }
    else
        updateParameter = {
            startIndex: workingText.startIndex + rightContext.matchIndex + rightContext.length,
            length: 0,
            updateText: ' ' + rightDelta
        }

    insertText(updateParameter);
}

const insertLeftDelta = (alignmentObject) => {
    const { workingText, leftContext, leftDelta } = alignmentObject;
    
    updateParameter = {
        startIndex: workingText.startIndex + leftContext.matchIndex,
        length: 0,
        updateText: leftDelta
    }

    insertText(updateParameter);
}

const getNormalizedContextandDelta = (text, queryString) => {
    let queryStringWords = queryString.split(' ');
    let isLeftContextFound = false, isRightContextFound = false;
    let leftContext, rightContext;
    let leftDelta = [], rightDelta = [];
    let slideOneWordRightQueryString, slideOneWordLeftQueryString;

    for (let wordIndex = 0; wordIndex < queryStringWords.length; wordIndex++) {
        if (!isLeftContextFound)
            {
            slideOneWordRightQueryString = queryStringWords.slice(wordIndex).join(' ')
            // console.log('slideOneWordRightQueryString', slideOneWordRightQueryString)
            }

        if (!isRightContextFound)
            {
            slideOneWordLeftQueryString = queryStringWords.slice(0, queryStringWords.length - wordIndex).join(' ')
            // console.log('slideOneWordLeftQueryString', slideOneWordLeftQueryString)
            }

        if (!isLeftContextFound) {
            leftContext = findLeftContext(text, slideOneWordRightQueryString)
            // console.log('leftContext', leftContext)
            
            if (leftContext)
                isLeftContextFound = true
            else
                {
                leftDelta.push(queryStringWords[wordIndex])
                // console.log('leftDelta push::', queryStringWords[wordIndex]);
                }
        }

        if (!isRightContextFound) {
            rightContext = findRightContext(text, slideOneWordLeftQueryString)
            // console.log('rightContext', rightContext);

            if (rightContext)
                isRightContextFound = true
            else
                {
                rightDelta.push(queryStringWords[queryStringWords.length - (wordIndex + 1)])
                // console.log('rightDelta push::', queryStringWords[queryStringWords.length - (wordIndex + 1)]);
                }
        }

        // console.log(`############### END OF WORDINDEX ${wordIndex} ##################`)

        if (isLeftContextFound && isRightContextFound)
            break;
    }

    // console.log('(raw) leftContext', leftContext);
    // console.log('(raw) rightContext', rightContext);

    leftDelta = (leftDelta.length > 0) ? leftDelta.join(' ') : null
    rightDelta = (rightDelta.length > 0) ? rightDelta.reverse().join(' ') : null

    // console.log('(raw) leftDelta', leftDelta)
    // console.log('(raw) rightDelta', rightDelta)

    if (leftContext && rightContext && rightContext.matchIndex < leftContext.matchIndex) {
        rightDelta = stripLeft(stripLeft(queryString, leftDelta), leftContext.matchInQueryString)
        rightContext = null
    }
    else if (leftContext && rightContext && leftContext.matchIndex === rightContext.matchIndex)
        rightContext = null
    else if (!leftContext && leftDelta && rightDelta && leftDelta === rightDelta)
        rightDelta = null

    // console.log('(normalized) leftContext', leftContext);
    // console.log('(normalized) rightContext', rightContext);

    // console.log('(normalized) leftDelta', leftDelta)
    // console.log('(normalized) rightDelta', rightDelta)

    return [leftContext, rightContext, leftDelta, rightDelta];
}

const getAlignmentConfiguration = (alignmentObject) => {
    const { leftContext, rightContext, leftDelta, rightDelta } = alignmentObject;

    if (leftDelta && leftContext && rightContext && rightDelta)
        return '∂LR∂';
    else if (leftDelta && leftContext && rightContext && !rightDelta)
        return '∂LR';
    else if (leftDelta && leftContext && !rightContext && rightDelta)
        return '∂L∂';
    else if (leftDelta && leftContext && !rightContext && !rightDelta)
        return '∂L';
    else if (leftDelta && !leftContext && !rightContext && !rightDelta)
        return '∂';
    else if (!leftDelta && leftContext && rightContext && rightDelta)
        return 'LR∂';
    else if (!leftDelta && leftContext && rightContext && !rightDelta)
        return 'LR';
    else if (!leftDelta && leftContext && !rightContext && rightDelta)
        return 'L∂';
    else if (!leftDelta && leftContext && !rightContext && !rightDelta)
        return 'L';
}

const getDeltaAlignment = (alignmentConfig) => {
    switch (alignmentConfig) {
        case '∂LR∂':
        case '∂LR':
        case '∂L∂':
            return 'INS';
        case 'LR∂':
        case 'L∂':
        case '∂L':
            return 'SUB';
        default:
            return 'SUB';
    }
}