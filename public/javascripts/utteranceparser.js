import * as tts from './tts.js'
import { quill } from './quill.js'
import * as fuzzy from './createFuzzySet.js'
import { handleCommand } from './execCommand.js'
import { pushTextToBlade } from './VuzixBladeDriver.js';
import { getIndexOfNextSpace, getSentenceIndices, getSentence } from './stringutils.js'
import { handleRedictation } from './execRedictation.js';

const MAX_REACTION_TEXT_WINDOW_SIZE = 30 // in chars
const cropSelectionToBargeinIndex = true // either crop or full sentence.
var bargeinIndex;

export const handleUtterance = (utterance) => {
    bargeinIndex = tts.getTTSAbsoluteReadIndex() + tts.getTTSRelativeReadIndex();
    let workingText = extractWorkingText(bargeinIndex);

    parseUtterance(utterance, workingText)
}

export const getBargeinIndex = () => {
    return bargeinIndex
}

const extractWorkingText = (index) => {
    let sentenceIndices = getSentenceIndices(quill.getText(), index)
    let endIndex;
    
    if (cropSelectionToBargeinIndex)    endIndex = getIndexOfNextSpace(quill.getText(), index)
    else                                endIndex = sentenceIndices.end

    let workingText = {
        text: getSentence(quill.getText(), sentenceIndices),
        startIndex: sentenceIndices.start
    }

    if ( endIndex - sentenceIndices.start < MAX_REACTION_TEXT_WINDOW_SIZE && sentenceIndices.start > 0 ) {
        let prevSentenceIndices = getSentenceIndices(quill.getText(), sentenceIndices.start-2)
        workingText = {
            text: getSentence(quill.getText(), prevSentenceIndices) + ' ' + workingText.text,
            startIndex: prevSentenceIndices.start
        }

    }

    return workingText
}

const parseUtterance = (utterance, workingText) => {
    pushTextToBlade(null, utterance)
    
    let [firstWord, ...restOfTheUtterance] = utterance.split(' ')
    let keyword = fuzzy.matchFuzzyForCommand(firstWord, restOfTheUtterance)
    if (keyword) {
        restOfTheUtterance = restOfTheUtterance.join(' ')

        let fuzzyArgument = fuzzy.matchFuzzyForArgument(restOfTheUtterance, workingText.text)
        let passArgument = fuzzyArgument || restOfTheUtterance

        pushTextToBlade(null, keyword + ' ' + passArgument)
        handleCommand(keyword, passArgument, workingText)
    } 
    
    else
        handleRedictation(utterance, workingText)
}