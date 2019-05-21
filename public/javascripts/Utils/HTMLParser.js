export const flattenHTML = (htmlString) => {
    console.log('coming here')
    let fontColorDelete = '#5E5E5E'
    let fontColorInsert = '#F7E511'
    let fontColorHighlight = '#F9BB56'

    let regexDeleteString = `(<font color=${fontColorDelete}>.*?<\/font>)`
    let regexInsertString = `(<font color=${fontColorInsert}>.*?<\/font>)`

    let regexDelete = new RegExp(regexDeleteString, 'gi')
    let regexInsert = new RegExp(regexInsertString, 'gi')


    htmlString = htmlString.replace(/<span>/g, '')
    htmlString = htmlString.replace(/<\/span>/g, '')
    htmlString = htmlString.replace(regexDelete, `</font>$1<font color=${fontColorHighlight}>`)
    htmlString = htmlString.replace(regexInsert, `</font>$1<font color=${fontColorHighlight}>`)

    console.log('htmlString', htmlString)
    return htmlString
}