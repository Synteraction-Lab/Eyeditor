export const stripPunctuations = (text) => {
    text = text.replace(/[^\w\s]/g, '')
    return text
}

export const removeLeadingNonWordChars = (text) => {
    text = text.replace(/^[^\w]+/g, '')
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
    return text
}

export const removeFormatting = (text) => {
    text = stripPunctuations(text)
    text = forceMonoSpacing(text)
    return text
}

// export const countPunctuations = (text) => {
//     let match = text.match(/[^\w\s]/g) || ''
//     return match.length
// }

// export const countSentences = (text) => {
//     let match = text.match(/[^.!?]+[.!?]+/g) || ''
//     return match.length
// }

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

export const findinText = (searchString, text) => {
    searchString = removeFormatting(searchString)
    let searchRegexString = searchString.split(' ').map(word=>`\\b${word}\\b`).join('[^\\w\\s]*\\s')   // find match irrespective of punctuations in between the words
    let searchRegex = new RegExp(searchRegexString, 'gi')
    
    let match = text.match(searchRegex)

    if(!match) return null
    else {
        let len = match.length
        return {
            startIndex: text.lastIndexOf( match[len -1] ), 
            length: match[len -1].length
        }
    }
}

export const getIndexOfNextSpace = (text, index) => {
    let indexOfNextSpace = text.indexOf(' ', index)
    if (indexOfNextSpace == -1)    indexOfNextSpace = text.length
    
    return indexOfNextSpace
}

export const getSentenceIndices = (text, index) => {    // absolute indices
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

export const findLeftContext = (text, queryString) => {    
    if (queryString.length == 0) {
        return {matchText: "", matchIndex: -1}
    }

    let regex = new RegExp('\\b' + queryString.trim() + '\\b', 'gi');
    let index = -1, match;

    while ((match = regex.exec(text)) !== null)
        index = match.index
    
    if (index >= 0) {
        return {
            matchText: queryString.trim(),
            matchIndex: index
        }
    }
    
    return findLeftContext(text, queryString.substring(0, queryString.lastIndexOf(' ')));
}

export const findRightContext = (text, queryString) => {
    let regex = new RegExp('\\b' + queryString.trim() + '\\b', 'gi');
    let index = -1, match;

    while ((match = regex.exec(text)) !== null)
        index = match.index
    
    if (index >= 0) {
        return {
            matchText: queryString.trim(),
            matchIndex: index
        }
    }

    if (queryString.indexOf(' ') == -1)
        return {matchText: "", matchIndex: -1}
    
    return findRightContext(text, queryString.substring(queryString.indexOf(' ')+1, queryString.length));
}

export const stripLeftContext = (queryString, leftContext) => {
    return queryString.substr(leftContext.length + 1)
}

export const stripRightContext = (queryString, rightContext) => {
    return queryString.substr(0, queryString.length - rightContext.length - 1)
}

export const generateSentencesList = (text, isHTML) => {
    let splitRegex
    if (isHTML) splitRegex = /<*\b.*?\b>*[.?!]/g
        else    splitRegex = /\b.*?\b[.!?]/g

    let sentences = text.match(splitRegex)
    return sentences;
}

export const generateSentenceDelimiterIndicesList = (text) => {
    let delimiterRegex = /[.!?]/g
    let delimiterIndicesList = []

    while (delimiterRegex.exec(text) !== null)
        delimiterIndicesList.push(delimiterRegex.lastIndex - 1)
    
    console.log('delimiterIndicesList', delimiterIndicesList)
    return delimiterIndicesList;
}

export const getSentenceIndexGivenCharIndexPosition = (text, charIndex) =>  // charIndex is absolute
    generateSentenceDelimiterIndicesList(text).filter(delimiterIndex => charIndex > delimiterIndex).length;

export const getSentenceGivenSentenceIndex = (text, sentenceIndex) =>
    generateSentencesList(text)[sentenceIndex];