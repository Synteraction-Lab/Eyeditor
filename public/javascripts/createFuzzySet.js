const options = 
            {
                keyword: {
                    threshold: 0.4,     // the lower, the stricter
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

const keywords = ['delete', 'undo', 'redo']

var keywordsFuzzySet = [];
var argumentFuzzySet = [];

const keywordsFuse = new Fuse(keywordsFuzzySet, options.keyword)
const argumentFuse = new Fuse(argumentFuzzySet, options.argument)


export const generateFuzzySetForCommands = () => {
    keywords.forEach(keyword => addToFuzzySet(keywordsFuzzySet, keyword))
}

const addToFuzzySet = (fuzzySet, addString) => {
    fuzzySet.push( {id: addString} )
}

export const matchFuzzyForCommand = (firstWord, restOfTheUtterance) => {
    console.log('rest of the utternace', restOfTheUtterance)
    let match = keywordsFuse.search(firstWord)

    if (match.length > 0)   {
        let keyword = match[0].id

        console.log('keyword matched ', keyword)

        if ( (keyword === 'undo' || keyword === 'redo') && restOfTheUtterance.length > 0 )
            return null
        else return keyword
    }
    else return null
}

export const matchFuzzyForArgument = (argumentText, workingText) => {
    generateFuzzySetForArgument(workingText)

    let match = argumentFuse.search(argumentText)
    
    if (match.length > 0)   return match[0].id
    else return null
}

const generateFuzzySetForArgument = (workingText) => {
    let regex = /\b\w+\b/g

    // add individual words to the fuzzy set
    let words = workingText.match(regex)
    words.forEach(word => addToFuzzySet(argumentFuzzySet, word))

    // add word combinations to the fuzzy set
    let combinations = generateWordCombinations(words)
    combinations.forEach(combination => addToFuzzySet(argumentFuzzySet, combination.join(' ')))
}

const generateWordCombinations = (words) => {
    var combinations = [], count = 0;
    for(var i=2; i <= words.length; i++) {
        for (var j=0; j < words.length-(i-1); j++) {
            combinations[count] = []
            for (var k=0; k < i; k++)
                combinations[count].push(words[j+k])
            count++;
        }
    }
    
    return combinations
};