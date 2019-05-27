import * as tts from '../Services/tts.js'
import { quill } from '../Services/quill.js'
import * as fuzzy from '../Utils/fuzzymatcher.js'
import { handleCommand, handleCommandPrioritizedWorkingText } from './EditInstructionHandler/Commanding.js'
import { getIndexOfNextSpace, getSentenceIndices, getSentenceSnippetBetweenIndices, generateSentencesList, generateSentenceDelimiterIndicesList } from '../Utils/stringutils.js'
import { handleRedictation } from './EditInstructionHandler/Redictation.js';
import { feedbackOnUserUtterance, feedbackOfWorkingTextOnUserUtterance, getCurrentWorkingText, getCurrentContext, isDisplayON } from './FeedbackHandler.js';
import { getFeedbackConfiguration } from '../main.js'
import { handleError } from './ErrorHandler.js'
import { getPTTStatus } from '../Drivers/HandControllerDriver.js';
import { getTTSReadStates, getTTSReadState, setTTSReadState } from '../Services/speechrecognizer.js';

const MAX_REACTION_TEXT_WINDOW_SIZE = 20 // in chars
const cropSelectionToBargeinIndex = false // either crop or full sentence.
const constrainWorkingTextToSingleSentence = true   // if false, working sent. can be two sentences

let quillSnapshotBeforeUpdate
let TTSReadStateBeforeUtterance
let TTSReadStates

export const getBargeinIndex = () => ( tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex() ) || 0;
export const getQuillSnapshotBeforeUpdate = () => quillSnapshotBeforeUpdate;
export const getWorkingTextFromReadIndex = () => extractWorkingText(getBargeinIndex());
export const getWasTTSReadingBeforeUtterance = () => ( TTSReadStateBeforeUtterance === TTSReadStates.READING ) ? true : false;

export const handleUtterance = (utterance) => {
    TTSReadStateBeforeUtterance = getTTSReadState()
    TTSReadStates = getTTSReadStates()
    setTTSReadState( TTSReadStates.NOT_SET )

    switch ( getFeedbackConfiguration() ) {
        case 'DEFAULT':
            parseUtterance(utterance, getWorkingTextFromReadIndex())
            break;
        
        case 'DISP_ON_DEMAND':
            let workingText
            if (getPTTStatus() === 'PTT_ON') {
                workingText = getCurrentWorkingText() || getWorkingTextFromReadIndex()
                parseUtterance(utterance, workingText)
            }
            else {
                if ( TTSReadStateBeforeUtterance === TTSReadStates.READING ) {
                    workingText = getWorkingTextFromReadIndex()
                    feedbackOfWorkingTextOnUserUtterance(workingText)
                    parseUtterance(utterance, workingText)
                } 
                else {
                    workingText = getCurrentWorkingText() || getWorkingTextFromReadIndex()
                    feedbackOfWorkingTextOnUserUtterance(workingText)
                    parseUtterance(utterance, workingText)
                }
            }
            break;
        
        case 'DISP_ALWAYS_ON':
            callManagerForAlwaysOnDisplay(utterance)
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

const parseUtterance = (utterance, workingText) => {
    let [firstWord, ...restOfTheUtterance] = utterance.split(' ')
    let keyword = fuzzy.matchFuzzyForCommand(firstWord, restOfTheUtterance)
    
    quillSnapshotBeforeUpdate = quill.getText()

    if (keyword) {
        restOfTheUtterance = restOfTheUtterance.join(' ')
        let fuzzyArgument = fuzzy.matchFuzzyForArgument(restOfTheUtterance, workingText.text)
        let passArgument = fuzzyArgument || restOfTheUtterance
        feedbackOnUserUtterance(keyword + ' ' + passArgument)

        handleCommand(keyword, passArgument, workingText)
    } 
    else
        handleRedictation(utterance, workingText)
}

const callManagerForAlwaysOnDisplay = (utterance) => {
    let currentContext = getCurrentContext()
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
    let suppressedFunctions = ['repeat', 'cancel', 'show', 'stop']
    if ( keyword && !suppressedFunctions.includes(keyword) ) {
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