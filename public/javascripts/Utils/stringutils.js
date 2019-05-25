export const stripPunctuations = (text) => {
    text = text.replace(/[^\w\s]/g, '')
    return text
}

export const removeLeadingNonWordChars = (text) => {
    text = text.replace(/^\W+/g, '')
    return text
}

export const removingNonWordCharsBeforeSentenceDelimiters = (text) => {
    text = text.replace(/(\W+)([.?!])/g, '$2')
    return text
}

export const forceMonoSpacing = (text) => {     // <Text.Text    text  ?> => <Text. Text text?>
    text = text.replace(/([^\w\s]\b)/g, '$1 ')
    text = text.replace(/\s(?!\b)/g, '')
    return text
}

export const appendPeriodIfMissing = (text) => {
    text = text.replace(/(\b|\s+)$/g, '.')
    return text
}

export const forceFirstCharOfSentenceToUpperCase = (text) => {
    text = text.replace(/(?<=^|[.?!]\s)(.)/g, firstCharacter => firstCharacter.toUpperCase())
    return text
}

export const formatText = (text) => {
    text = text.trim()
    text = removeLeadingNonWordChars(text)
    text = appendPeriodIfMissing(text)
    text = forceMonoSpacing(text)
    text = forceFirstCharOfSentenceToUpperCase(text)
    text = removingNonWordCharsBeforeSentenceDelimiters(text)
    return text
}

export const removeFormatting = (text) => {
    text = stripPunctuations(text)
    text = forceMonoSpacing(text)
    return text
}

export const getIndexOfLastPunctuation = (text, index) => {   // index: absolute
    let regex = /.+[.!?,;:]/g
    regex.exec(text.substr(0, index-1))

    if ( index - (regex.lastIndex-1) == 2 ) {     // if the update position (esp. delete) is just after a punc. then go back 2 more char positions, else it's difficult to get the context.
        regex = /.+[.!?,;:]/g
        regex.exec(text.substr(0, index-3))
    }

    if (regex.lastIndex == 0)   // boundary condition: first sentence when no more prior punc. is present and lastindex is 0
        return -2
    
    return regex.lastIndex - 1
}

export const findInText = (searchString, text) => {     // if multiple occurrences, finds last occurrence
    let puncInsensitiveRegex = getPunctuationInsensitiveRegex(searchString, 'findInText')
    let match = puncInsensitiveRegex.exec(text)
    // console.log('(findInText) match', match)

    if (!match) return null
    else {
        return {
            startIndex: puncInsensitiveRegex.lastIndex - match[1].length,
            length: match[1].length
        }
    }
}

export const getIndexOfNextSpace = (text, index) => {
    let indexOfNextSpace = text.indexOf(' ', index)
    if (indexOfNextSpace == -1)    indexOfNextSpace = text.length
    
    return indexOfNextSpace
}

export const getSentenceIndices = (text, index) => {    // input: abs index; output: abs indices
    let regexEnd = /[.!?]/g
    let matchEnd = regexEnd.exec(text.substr(index))
    let startIndex, endIndex;
    
    if (matchEnd)  endIndex = matchEnd.index + index +1
    
    let regexStart = /.+([.!?])/g
    let matchStart
    while (matchStart = regexStart.exec(text.substr(0, index)) !== null)
        startIndex = regexStart.lastIndex +1

    return new Object({
        start: startIndex || 0,
        end: endIndex || text.length
    })
}

export const getSentenceSnippetBetweenIndices = (text, indexObj) => {
    return text.substring(indexObj.start, indexObj.end)
}

export const findLeftContext = (text, queryString) => {     // (lazy) if multiple occurrences, matches as late as possible (last occurrence)    
    if (queryString.length == 0)
        return null;

    let regex = getPunctuationInsensitiveRegex(queryString)
    let index = -1, match;

    let matchInText
    while (( match = regex.exec(text) ) !== null) {
        matchInText = match[0]
        index = match.index
    }

    if (index >= 0)
        return {
            matchInText,
            matchIndex: index,
            length: matchInText.length,
            matchInQueryString: queryString.trim(),
        }

    return findLeftContext(text, queryString.substring(0, queryString.lastIndexOf(' ')));
}

export const findRightContext = (text, queryString) => {    // (lazy) if multiple occurrences, matches as late as possible (last occurrence)
    let regex = getPunctuationInsensitiveRegex(queryString)
    let index = -1, match;

    let matchInText
    while (( match = regex.exec(text) ) !== null) {
        matchInText = match[0]
        index = match.index
    }

    if (index >= 0)
        return {
            matchInText,
            matchIndex: index,
            length: matchInText.length,
            matchInQueryString: queryString.trim(),
        }

    if (queryString.indexOf(' ') == -1)
        return null;

    return findRightContext(text, queryString.substring(queryString.indexOf(' ') + 1, queryString.length));
}

export const stripLeft = (queryString, leftTextSnippet) => 
    (leftTextSnippet) ? queryString.substr(leftTextSnippet.length + 1) : queryString

export const stripRight = (queryString, rightTextSnippet) => 
    (rightTextSnippet) ? queryString.substr(0, queryString.length - rightTextSnippet.length - 1) : queryString

export const generateSentencesList = (text, isHTML) => {
    let splitRegex
    if (isHTML)
                splitRegex = /(?<=^|[.?!]).*?[.?!]/g
        else    splitRegex = /\b.*?\b[.?!]/g

    let sentences = text.match(splitRegex)
    // console.log('sentences', sentences)
    if (isHTML)
        sentences = sentences.map(sentence => sentence.replace(/^<\/.*?>/g, ''))
    
    return sentences;
}

export const generateSentenceDelimiterIndicesList = (text) => {
    let delimiterRegex = /[.!?]/g
    let delimiterIndicesList = []

    while (delimiterRegex.exec(text) !== null)
        delimiterIndicesList.push(delimiterRegex.lastIndex - 1)
    
    return delimiterIndicesList;
}

export const getSentenceIndexGivenCharIndexPosition = (text, charIndex) =>  // charIndex is absolute
    generateSentenceDelimiterIndicesList(text).filter(delimiterIndex => charIndex > delimiterIndex).length;

export const getSentenceGivenSentenceIndex = (text, sentenceIndex) =>
    generateSentencesList(text)[sentenceIndex];

export const getSentenceCharIndicesGivenSentenceIndex = (text, sentenceIndex) => {  // abs char indices
    let delimiterIndicesList = generateSentenceDelimiterIndicesList(text)
    return {
        start: delimiterIndicesList[sentenceIndex - 1] + 2 || 0,
        end: delimiterIndicesList[sentenceIndex] + 1
    }
}

export const forceNumberToWords = (utteranceString) => {
    let regex = /\b(\d+)\b/g;
    utteranceString = utteranceString.replace(regex, replacerFnNumbersToWords)
    return utteranceString;
}

const replacerFnNumbersToWords = (match, p1) => numberToWords.toWords(p1);

const getPunctuationInsensitiveRegex = (searchString, caller) => {
    searchString = removeFormatting(searchString)
    let searchRegexString = searchString.split(' ').map(word => `\\b${word}\\b`).join('\\W+')   // find match irrespective of punctuations in between the words
    if (caller === 'findInText')
        searchRegexString = `.*(${searchRegexString})`
    return new RegExp(searchRegexString, 'gi')
}