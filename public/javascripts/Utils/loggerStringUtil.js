export const stringifyState = (state) =>
    (state) ? 'ON' : 'OFF';

export const getLogStringForFeedbackModality = (modality) =>
    ( (modality) === 'DISP' ) ? 'VISUAL' : 'AUDIO';

export const getLogStringForKeyword = (keyword) => 
    keyword.toUpperCase();

export const stripCommaBeforeLogging = (text) => {
    if (!text)
        return;
    else {
        text = text.replace(/,/g, '');
        return text;
    }
}