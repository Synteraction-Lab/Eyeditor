const colorMap = {
    'background': {
        'insert': '#B3E7B7',
        'delete': '#774646',
        // 'delete': '#EEBBBB',
        'highlight': '#B3E7B7'
    },

    'font': {
        'delete': '#8F8F8F',
        // 'delete': '#ADACAC',
        // 'deleteBasic': '#5E5E5E',
        'insert': 'black',
        'highlight': 'black'
    }
}

export const flattenHTML = (htmlString) => {
    let regexDeleteString = `(<font color=${colorMap.font.delete}>.*?<\/font>)`
    let regexInsertString = `(<font color=${colorMap.font.insert}>.*?<\/font>)`

    let regexDelete = new RegExp(regexDeleteString, 'gi')
    let regexInsert = new RegExp(regexInsertString, 'gi')


    htmlString = htmlString.replace(/<span>/g, '')
    htmlString = htmlString.replace(/<\/span>/g, '')
    htmlString = htmlString.replace(regexDelete, `</font>$1<font color=${colorMap.font.highlight}>`)
    htmlString = htmlString.replace(regexInsert, `</font>$1<font color=${colorMap.font.highlight}>`)

    console.log('htmlString', htmlString)
    return htmlString
}

export const markupForDeletion = (text) =>
    `<span style="background-color:${colorMap.background.delete}; color:${colorMap.font.delete}"><strike>${text}</strike></span>`

export const markupForInsertion = (text) =>
    `<span style="background-color:${colorMap.background.insert}; color:${colorMap.font.insert}">${text}</span>`

// export const markupForDeletionBasic = (text) =>
//     `<span style="color:${colorMap.font.deleteBasic}">${text}</span>`

// export const markupForInsertionBasic = (text) =>
//     `<span style="color:${colorMap.font.insert}">${text}</span>`

export const markupForPrioritizedSentence = (sentence) =>
    `<b><u>${sentence}</u></b>`

export const markupForSelection = (selection) =>
    `<span style="background-color:${colorMap.background.highlight}; color:${colorMap.font.highlight}">${selection}</span>`