function escape(s) {
    var n = s;
    n = n.replace(/&/g, "&amp;");
    n = n.replace(/</g, "&lt;");
    n = n.replace(/>/g, "&gt;");
    n = n.replace(/"/g, "&quot;");

    return n;
}

function diff( o, n ) {
    var ns = new Object();
    var os = new Object();
    
    for ( var i = 0; i < n.length; i++ ) {
        if ( ns[ n[i] ] == null )
        ns[ n[i] ] = { rows: new Array(), o: null };
        ns[ n[i] ].rows.push( i );
    }
    
    for ( var i = 0; i < o.length; i++ ) {
        if ( os[ o[i] ] == null )
        os[ o[i] ] = { rows: new Array(), n: null };
        os[ o[i] ].rows.push( i );
    }
    
    for ( var i in ns ) {
        if ( ns[i].rows.length == 1 && typeof(os[i]) != "undefined" && os[i].rows.length == 1 ) {
        n[ ns[i].rows[0] ] = { text: n[ ns[i].rows[0] ], row: os[i].rows[0] };
        o[ os[i].rows[0] ] = { text: o[ os[i].rows[0] ], row: ns[i].rows[0] };
        }
    }
    
    for ( var i = 0; i < n.length - 1; i++ ) {
        if ( n[i].text != null && n[i+1].text == null && n[i].row + 1 < o.length && o[ n[i].row + 1 ].text == null && 
            n[i+1] == o[ n[i].row + 1 ] ) {
        n[i+1] = { text: n[i+1], row: n[i].row + 1 };
        o[n[i].row+1] = { text: o[n[i].row+1], row: i + 1 };
        }
    }
    
    for ( var i = n.length - 1; i > 0; i-- ) {
        if ( n[i].text != null && n[i-1].text == null && n[i].row > 0 && o[ n[i].row - 1 ].text == null && 
            n[i-1] == o[ n[i].row - 1 ] ) {
        n[i-1] = { text: n[i-1], row: n[i].row - 1 };
        o[n[i].row-1] = { text: o[n[i].row-1], row: i - 1 };
        }
    }
    
    return { o: o, n: n };
}

function diffString( o, n ) {
    o = o.replace(/\s+$/, '');
    n = n.replace(/\s+$/, '');

    var out = diff(o == "" ? [] : o.split(/\s+/), n == "" ? [] : n.split(/\s+/) );
    var str = "";

    var oSpace = o.match(/\s+/g);
    if (oSpace == null) {
        oSpace = ["\n"];
    } else {
        oSpace.push("\n");
    }
    var nSpace = n.match(/\s+/g);
    if (nSpace == null) {
        nSpace = ["\n"];
    } else {
        nSpace.push("\n");
    }

    if (out.n.length == 0) {
        for (var i = 0; i < out.o.length; i++) {
            str += '<del>' + escape(out.o[i]) + oSpace[i] + "</del>";
        }
    } else {
        if (out.n[0].text == null) {
        for (n = 0; n < out.o.length && out.o[n].text == null; n++) {
            str += '<del>' + escape(out.o[n]) + oSpace[n] + "</del>";
        }
        }

        for ( var i = 0; i < out.n.length; i++ ) {
        if (out.n[i].text == null) {
            str += '<ins>' + escape(out.n[i]) + nSpace[i] + "</ins>";
        } else {
            var pre = "";

            for (n = out.n[i].row + 1; n < out.o.length && out.o[n].text == null; n++ ) {
            pre += '<del>' + escape(out.o[n]) + oSpace[n] + "</del>";
            }
            str += " " + out.n[i].text + nSpace[i] + pre;
        }
        }
    }
    
    return str;
}


export const getColorCodedTextHTML = (originalText, changedText) => {
    let dmp = new diff_match_patch()
    // let deltaString = diffString(originalText, changedText)
    let deltaString = dmp.diff_wordMode(originalText, changedText);
    console.log('raw deltaString', deltaString)
    deltaString = dmp.diff_prettyHtml(deltaString);
    console.log('pretty deltaString', deltaString)

    let fontColorDelete = '#5E5E5E'
    // let fontColorDelete = '#ffe6e6'
    // let fontColorDelete = '#878484'
    let fontColorInsert = '#F7E511'
    // let fontColorInsert = '#e6ffe6'
    
    // /* clean deltaString */
    // deltaString = deltaString.replace(/\n/g, '')
    // deltaString = deltaString.replace(/\s\s+/g, ' ')
    // // console.log('deltaString before combination', deltaString)
    // deltaString = deltaString.replace(/(?<![.?!]\s)<\/(...)><\1>/g, '')
    // // console.log('deltaString after combination', deltaString)
    // deltaString = purgeAndAppendAnyEnclosedSentenceDelimiter(deltaString)
    // // console.log('cleaned deltaString', deltaString)

    // /* change tags of deltaString to font color tags */
    // deltaString = deltaString.replace(/<\/.*?>/g, `</font>`)
    // deltaString = deltaString.replace(/<del>/g, `<font color=${fontColorDelete}>`)
    // deltaString = deltaString.replace(/<ins>/g, `<font color=${fontColorInsert}>`)
    // // console.log('color coded deltaString', deltaString)

    /* change tags of deltaString to font color tags */
    deltaString = deltaString.replace(/<del\s.*?>/g, `<font color=${fontColorDelete}>`)
    deltaString = deltaString.replace(/<ins\s.*?>/g, `<font color=${fontColorInsert}>`)
    deltaString = deltaString.replace(/<\/...>/g, `</font>`)

    console.log('cleaned pretty html', deltaString)

    return deltaString;
}

const purgeAndAppendAnyEnclosedSentenceDelimiter = (htmlString) => {
    // console.log('html string before purge&append ::', htmlString)
    let regexPurgeAndAppend = /(<del>.*?)([.?!])(\s?)(<\/del>)(<ins>.*?)([.?!])(\s?)(<\/ins>)/g
    htmlString = htmlString.replace(regexPurgeAndAppend, '$1 $4$5$8$2')
    // console.log('html string after purge&append ::', htmlString)

    // console.log('after purge&append ::', htmlString)
    return htmlString
}
        