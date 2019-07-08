import * as tts from '../Services/tts.js'
import { quill } from '../Services/quill.js'
import * as fuzzy from '../Utils/fuzzymatcher.js'
import { handleCommand, handleCommandPrioritizedWorkingText } from './EditInstructionHandler/Commanding.js'
import { getIndexOfNextSpace, getSentenceIndices, getSentenceSnippetBetweenIndices, generateSentencesList, generateSentenceDelimiterIndicesList, getSentenceGivenSentenceIndex, getSentenceCharIndicesGivenSentenceIndex, getSentenceIndexGivenCharIndexPosition } from '../Utils/stringutils.js'
import { handleRedictation } from './EditInstructionHandler/Redictation.js';
import { feedbackOnUserUtterance, feedbackOfWorkingTextOnUserUtterance, getCurrentWorkingText, getCurrentWorkingTextSentenceIndex, isDisplayON, feedbackOnTextUpdateInEditMode } from './FeedbackHandler.js';
import { getFeedbackConfiguration } from '../main.js'
import { handleError } from './ErrorHandler.js'
import { getPTTStatus, getIsInsertMode } from '../Drivers/RingControllerDriver.js';
import { getTTSReadStates, getTTSReadState, setTTSReadState } from '../Services/speechrecognizer.js';
import { getControllerMode } from '../Drivers/RingControllerDriver.js';
import { getSelectionRangeAbsCharIndices, getInsertionObject } from './WordEditHandler.js';
import { insertText, deleteText, replaceText, refreshText } from './TextEditor.js';
import { logUserInput } from '../Utils/UserDataLogger.js';
import { getLogStringForKeyword } from '../Utils/loggerStringUtil.js';

const MAX_REACTION_TEXT_WINDOW_SIZE = 20 // in chars
const cropSelectionToBargeinIndex = false // either crop or full sentence.
const constrainWorkingTextToSingleSentence = true   // if false, working sent. can be two sentences

let quillSnapshotBeforeUpdate
let TTSReadStateBeforeUtterance
let TTSReadStates
let workingText
let validKeywords

export const getBargeinIndex = () => ( tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex() ) || 0;
export const getQuillSnapshotBeforeUpdate = () => quillSnapshotBeforeUpdate;
export const getWorkingTextFromReadIndex = () => extractWorkingText(getBargeinIndex());
export const getWasTTSReadingBeforeUtterance = () => ( TTSReadStateBeforeUtterance === TTSReadStates.READING ) ? true : false;

export const handleUtterance = (utterance) => {
    if (getControllerMode() === 'EDIT') {
        logUserInput(utterance)
        handleUtteranceInEditMode(utterance)
        return;
    }

    TTSReadStateBeforeUtterance = getTTSReadState()
    TTSReadStates = getTTSReadStates()
    setTTSReadState( TTSReadStates.NOT_SET )
    
    validKeywords = getListOfSupportedKeywords()

    switch ( getFeedbackConfiguration() ) {
        case 'DEFAULT':
        case 'EYES_FREE':
            parseUtterance(utterance, getWorkingTextFromReadIndex())
            break;
        
        case 'DISP_ON_DEMAND':
            if (getPTTStatus() === 'PTT_ON') {
                workingText = getCurrentWorkingText()
                parseUtterance(utterance, workingText)
            }
            else {
                if ( getWasTTSReadingBeforeUtterance() ) {
                    workingText = getWorkingTextFromReadIndex()
                    feedbackOfWorkingTextOnUserUtterance(utterance, workingText)
                    parseUtterance(utterance, workingText)
                } 
                else {
                    workingText = getCurrentWorkingText()
                    if (!isDisplayON())
                        feedbackOfWorkingTextOnUserUtterance(utterance, workingText)
                    parseUtterance(utterance, workingText)
                }
            }
            break;
        
        case 'DISP_ALWAYS_ON':
            callManagerForAlwaysOnDisplay(utterance)
            break;

        case 'AOD_SCROLL':
            let workingTextSentenceIndex = getCurrentWorkingTextSentenceIndex()
            workingText = {
                text: getSentenceGivenSentenceIndex(quill.getText(), workingTextSentenceIndex),
                startIndex: getSentenceCharIndicesGivenSentenceIndex(quill.getText(), workingTextSentenceIndex).start
            }
            parseUtterance(utterance, workingText)
            break;

        case 'ODD_FLEXI':
            if (getWasTTSReadingBeforeUtterance())
                parseUtterance(utterance, getWorkingTextFromReadIndex())
            else
                parseUtterance(utterance, getCurrentWorkingText())
            break;
    }
}

export const extractWorkingText = (index) => {
    let sentenceIndices = getSentenceIndices(quill.getText(), index)
    let endIndex = getIndexOfNextSpace(quill.getText(), index);

    let extractedTextSnippet
    if (cropSelectionToBargeinIndex)   
        extractedTextSnippet = getSentenceSnippetBetweenIndices(quill.getText(), {start: sentenceIndices.start, end: endIndex})
    else                                
        extractedTextSnippet = getSentenceSnippetBetweenIndices(quill.getText(), sentenceIndices)

    let workingText = {
        text: extractedTextSnippet,
        startIndex: sentenceIndices.start
    }
    
    // console.log(`(extractWorkingText) endIndex:${endIndex}, sentence startIndex:${sentenceIndices.start}`)

    if ( endIndex - sentenceIndices.start < MAX_REACTION_TEXT_WINDOW_SIZE && sentenceIndices.start > 0 ) {
        let prevSentenceIndices = getSentenceIndices(quill.getText(), sentenceIndices.start-2)
        if (constrainWorkingTextToSingleSentence)
            workingText = {
                text: getSentenceSnippetBetweenIndices(quill.getText(), prevSentenceIndices),
                startIndex: prevSentenceIndices.start
            }
        else 
            workingText = {
                text: getSentenceSnippetBetweenIndices(quill.getText(), prevSentenceIndices) + ' ' + workingText.text,
                startIndex: prevSentenceIndices.start
            }
    }

    return workingText
}

export const getSentenceIndexFromBargeinIndex = () => {
    let bargeinIndex = getBargeinIndex()
    let sentenceIndices = getSentenceIndices(quill.getText(), bargeinIndex)
    let endIndex = getIndexOfNextSpace(quill.getText(), bargeinIndex)

    let sentenceIndex = getSentenceIndexGivenCharIndexPosition(quill.getText(), bargeinIndex)
    if ( sentenceIndices.start > 0 && (endIndex - sentenceIndices.start < MAX_REACTION_TEXT_WINDOW_SIZE) )
        sentenceIndex = sentenceIndex - 1

    return sentenceIndex;
}

const parseUtterance = (utterance, workingText) => {
    let [firstWord, ...restOfTheUtterance] = utterance.split(' ')
    let keyword = fuzzy.matchFuzzyForCommand(firstWord, restOfTheUtterance)

    quillSnapshotBeforeUpdate = quill.getText()

    if ( keyword && validKeywords.includes(keyword) ) {
        restOfTheUtterance = restOfTheUtterance.join(' ')
        let fuzzyArgument = fuzzy.matchFuzzyForArgument(restOfTheUtterance, workingText.text)
        let passArgument = fuzzyArgument || restOfTheUtterance
        feedbackOnUserUtterance(keyword + ' ' + passArgument)
        logUserInput(`${getLogStringForKeyword(keyword)} ${passArgument}`)
        handleCommand(keyword, passArgument, workingText)
    } 
    else {
        logUserInput(utterance)
        handleRedictation(utterance, workingText)
    }
}

const callManagerForAlwaysOnDisplay = (utterance) => {
    let currentContext = getCurrentWorkingTextSentenceIndex()
    let sentenceList = generateSentencesList(quill.getText())
    let sentenceDelimiterList = generateSentenceDelimiterIndicesList(quill.getText())

    let pointerToSentenceList = sentenceList.map( (sentence, index) => index - currentContext )
    pointerToSentenceList = pointerToSentenceList.sort( (a,b) => Math.abs(a) - Math.abs(b) )

    let workingTextArray = []
    pointerToSentenceList.forEach(pointer => {
        workingTextArray.push({
            text: sentenceList[currentContext+pointer],
            startIndex: sentenceDelimiterList[currentContext+pointer -1] + 2 || 0
        })
    })

    parseUtterancePrioritizedWorkingText(utterance, workingTextArray)
}

const parseUtterancePrioritizedWorkingText = (utterance, workingTextArray) => {
    let [firstWord, ...restOfTheUtterance] = utterance.split(' ')
    let keyword = fuzzy.matchFuzzyForCommand(firstWord, restOfTheUtterance)

    quillSnapshotBeforeUpdate = quill.getText()

    if ( keyword && validKeywords.includes(keyword) ) {
        restOfTheUtterance = restOfTheUtterance.join(' ')
        let iter, fuzzyArgument, passArgument;
        let isCommandComplete;
        for (iter = 0; iter < workingTextArray.length; iter++) {
            fuzzyArgument = fuzzy.matchFuzzyForArgument(restOfTheUtterance, workingTextArray[iter].text)
            passArgument = fuzzyArgument || restOfTheUtterance
            feedbackOnUserUtterance(keyword + ' ' + passArgument)
            
            isCommandComplete = handleCommandPrioritizedWorkingText(keyword, passArgument, workingTextArray[iter])
            if (isCommandComplete)
                break;
        }
        if (!isCommandComplete)
            handleError('PHRASE_NOT_FOUND', restOfTheUtterance)
    }
    else {
        let iter, isCommandComplete;
        for (iter = 0; iter < workingTextArray.length; iter++) {
            isCommandComplete = handleRedictation(utterance, workingTextArray[iter], true)
            if (isCommandComplete)
                break;
        }
        if (!isCommandComplete)
            handleError('NO_UPDATE')
    }
}

export const handleUtteranceInEditMode = (utterance) => {
    let updateParameter;
    let isInsertMode = getIsInsertMode();

    if (isInsertMode) {
        let insertionObj = getInsertionObject()
        let insertionText

        if (insertionObj.direction === 'LEFT')
            insertionText = utterance
        else if (insertionObj.direction === 'RIGHT')
            insertionText = ' ' + utterance
        
        updateParameter = {
            startIndex: insertionObj.index,
            length: 0,
            updateText: insertionText
        }

        insertText(updateParameter)
        .then(refreshText(quill.getText()));
    }

    else {
        let rangeObject = getSelectionRangeAbsCharIndices();

        if (utterance === 'delete') {
            updateParameter = {
                startIndex: rangeObject.startIndex,
                length: rangeObject.endIndex - rangeObject.startIndex
            }

            deleteText(updateParameter)
            .then(refreshText(quill.getText()));
        }
        else {
            updateParameter = {
                startIndex: rangeObject.startIndex,
                length: rangeObject.endIndex - rangeObject.startIndex,
                updateText: utterance
            }

            replaceText(updateParameter)
            .then(refreshText(quill.getText()));
        }
    }

    feedbackOnTextUpdateInEditMode(utterance, isInsertMode);
}

const getListOfSupportedKeywords = () => {
    switch (getFeedbackConfiguration()) {
        case 'EYES_FREE':
            return ['delete', 'previous', 'next', 'repeat', 'stop', 'read']
        case 'ODD_FLEXI':
        case 'DISP_ON_DEMAND':
            if (isDisplayON())
                return ['delete', 'previous', 'next', 'read', 'hide']
            else
                return ['delete', 'previous', 'next', 'repeat', 'show', 'stop', 'read']
        case 'AOD_SCROLL':
        case 'DISP_ALWAYS_ON':
            return ['delete', 'previous', 'next']
    }
}