import * as parser from '../Engines/UtteranceParser.js'

utteranceBox.addEventListener('keydown', function (e) {
    if (e.keyCode == 13)
        parser.handleUtterance(utteranceBox.value.trim())
})

utteranceBox.addEventListener('click', function (e) {
    let testUtterance
    testUtterance = 'are many big and small'

    if (e.metaKey) {
        utteranceBox.value = testUtterance
        parser.handleUtterance(testUtterance)
    }
})
