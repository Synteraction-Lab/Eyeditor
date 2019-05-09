import { renderBladeDisplay } from './VuzixBladeDriver.js'
import { extractWorkingText, getBargeinIndex } from './utteranceparser.js'
import { getFeedbackConfiguration } from './main.js'

export const handleFeedback = () => {
    switch(getFeedbackConfiguration()) {
        case 'DEFAULT':
        case 'DISP_ALWAYS_ON':
            break;

        case 'DISP_ON_DEMAND':
            renderBladeDisplay(extractWorkingText(getBargeinIndex()).text)
            break;
    }
}