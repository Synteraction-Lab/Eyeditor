const colorMap = {
    'background': {
        'insert': '#B3E7B7',
        'delete': '#EEBBBB',
        'highlight': '#F9BB56'
    },

    'font': {
        'delete': '#ADACAC',
        'insert': '#F7E511',
        'highlight': '#F9BB56'
    }
}

export const flattenHTML = (htmlString) => {
    console.log('coming here')
    let fontColorDelete = '#5E5E5E'
    let fontColorInsert = '#F7E511'
    let fontColorHighlight = '#F9BB56'

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
    `<span style="background-color:${colorMap.background.insert}; color:black">${text}</span>`


