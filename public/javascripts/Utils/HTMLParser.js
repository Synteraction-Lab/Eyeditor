const colorMap = {
    'background': {
        'insert': '#B3E7B7',
        'delete': '#774646',
        // 'delete': '#EEBBBB',
        'highlight': '#EFE02F',
        'insertLeft': '#6AC7F2',
        'insertRight': '#00FF7C',
        'statusDefaultMode': '#FAE3E3',
    },

    'font': {
        'delete': '#8F8F8F',
        // 'delete': '#ADACAC',
        // 'deleteBasic': '#5E5E5E',
        'insert': 'black',
        'highlight': 'black',
        // 'insertEditMode': '#32FA0A',
        'insertEditMode': 'black',
        'statusDefaultMode': 'black',
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

export const markupForInsertionInEditMode = (selection, dir) => {
    let insertMarkerColor = (dir === 'LEFT') ? colorMap.background.insertLeft : colorMap.background.insertRight
    return `<span style="background-color:${insertMarkerColor}; color:${colorMap.font.insertEditMode}">${selection}</span>`
}


export const markupForStatusInEditMode = (status) =>
    `<b>${status}</b>`

export const markupForStatusInDefaultMode = (status) =>
    `<span style="background-color:${colorMap.background.statusDefaultMode}; color:${colorMap.font.statusDefaultMode}"><b>${status}</b></span>`
