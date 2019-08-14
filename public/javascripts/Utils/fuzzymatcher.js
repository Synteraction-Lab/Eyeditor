const options = 
            {
                keyword: {
                    threshold: 0.3,     // the lower, the stricter
                    keys: [
                        {
                            name: 'id',
                            weight: 1
                        }
                    ]
                },
                argument: {
                    threshold: 0.4,     // the lower, the stricter
                    keys: [
                        {
                            name: 'id',
                            weight: 1
                        }
                    ]
                }
            }

const keywordsParameterized = ['delete']
// const keywordsNonParameterized = ['previous', 'next', 'repeat', 'show', 'stop', 'read']
const keywordsNonParameterized = ['previous', 'next']
const keywords = [...keywordsParameterized, ...keywordsNonParameterized]

var keywordsFuzzySet = [];
var argumentFuzzySet;

const keywordsFuse = new Fuse(keywordsFuzzySet, options.keyword);
var argumentFuse;

const addToFuzzySet = (fuzzySet, addString) => {
    fuzzySet.push( {id: addString} )
}

export const generateFuzzySetForCommands = () => {
    keywords.forEach(keyword => addToFuzzySet(keywordsFuzzySet, keyword))
}

export const matchFuzzyForCommand = (firstWord, restOfTheUtterance) => {
    // console.log('rest of the utternace', restOfTheUtterance)
    let match = keywordsFuse.search(firstWord)

    if (match.length > 0)   {
        let keyword = match[0].id

        console.log('keyword matched', keyword)

        if ( keywordsNonParameterized.includes(keyword) && restOfTheUtterance.length > 0 )
            return null
        else return keyword
    }
    else return null
}

const initArgumentFuzzySet = () => {
    argumentFuzzySet = []
    argumentFuse = new Fuse(argumentFuzzySet, options.argument)
}

export const matchFuzzyForArgument = (argumentText, workingText) => {
    initArgumentFuzzySet()
    generateFuzzySetForArgument(workingText)
    // console.log('argumentFuzzySet', argumentFuzzySet)

    let match = argumentFuse.search(argumentText)
    // console.log('(matchFuzzyForArgument) match', match)
    
    if (match.length > 0)   return match[0].id
        else                return null
}

const generateFuzzySetForArgument = (workingText) => {
    let regex = /\b\w+\b/g
    let words = workingText.match(regex)
    
    // add word combinations to the fuzzy set
    let combinations = generateWordCombinations(words)
    combinations.forEach( allCombinationsOfNWords => allCombinationsOfNWords.forEach( combination => addToFuzzySet(argumentFuzzySet, combination.join(' ')) ) )
}

const generateWordCombinations = (words) => {
    var combinations = [], count = 0;
    for(var i=1; i <= words.length; i++) {
        combinations[count] = []
        for (var j=0; j < words.length-(i-1); j++) {
            combinations[count][j] = []
            for (var k=0; k < i; k++)
                combinations[count][j].push(words[j+k])
        }
        combinations[count].reverse()           // for multiple possible matches, the last match is selected as is the case with the rest of the word selection operations (e.g., for deletion)
        // console.log(combinations[count])
        count++;
    }

    return combinations
};

export const searchFuzzyMatchInText = (queryString, workingText) => matchFuzzyForArgument(queryString, workingText);