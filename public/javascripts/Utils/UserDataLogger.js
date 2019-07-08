import { getTimeInSeconds, getTaskTimerValue, isTaskTimerRunning } from "../Services/tasktimer.js";
import { getCurrentWorkingTextSentenceIndex, getCurrentWorkingText } from "../Engines/FeedbackHandler.js";
import { getSocket } from "../Services/socket.js";
import { getLogStringForFeedbackModality, stringifyState, stripCommaBeforeLogging } from "./loggerStringUtil.js";
import { getFeedbackModality, getFeedbackState, getControllerMode } from "../Drivers/RingControllerDriver.js";
import { getSentenceBeforeUpdate } from "../Engines/TextEditor.js";

let socket = getSocket();

const pushlog = (log) => {
    let logstring = Object.values(log).join(',')
    socket.emit('log', `${logstring}\n`)
}

class Log {
    constructor(_eventType, _timeStamp) {
        this._eventType = _eventType;
        this._timeStamp = _timeStamp;
    }
    
    get userInput()         { return this._userInput; }
    get inputModality()     { return this._inputModality; }
    get isEditMode()        { return this._isEditMode; }
    get feedbackModality()  { return this._feedbackModality; }
    get feedbackState()     { return this._feedbackState; }
    get sentenceIndex()     { return this._sentenceIndex; }
    get inputSentence()     { return this._inputSentence; }
    get outputSentence()    { return this._outputSentence; }

    set userInput(_userInput)               { this._userInput = _userInput; }
    set inputModality(_inputModality)       { this._inputModality = _inputModality; }
    set isEditMode(_isEditMode)             { this._isEditMode = _isEditMode; }
    set feedbackModality(_feedbackModality) { this._feedbackModality = _feedbackModality; }
    set feedbackState(_feedbackState)       { this._feedbackState = _feedbackState; }
    set sentenceIndex(_sentenceIndex)       { this._sentenceIndex = _sentenceIndex; }
    set inputSentence(_inputSentence)       { this._inputSentence = stripCommaBeforeLogging(_inputSentence); }
    set outputSentence(_outputSentence)     { this._outputSentence = stripCommaBeforeLogging(_outputSentence); }
}

export const logInit = () => {
    let log = new Log('INIT', 0)

    log.userInput = undefined
    log.inputModality = undefined
    log.isEditMode = 'NO'
    log.feedbackModality = 'VISUAL'
    log.feedbackState = 'ON'
    log.sentenceIndex = 0
    log.inputSentence = getCurrentWorkingText().text
    log.outputSentence = undefined

    pushlog(log);
}

export const logAlternation = (isControllerInput) => {
    if (!isTaskTimerRunning())
        return;

    let log = new Log('Alternation', getTimeInSeconds(getTaskTimerValue()))
    
    log.userInput = undefined
    log.inputModality = (isControllerInput) ? 'CONTROLLER' : 'VOICE'
    log.isEditMode = 'NO'
    log.feedbackModality = getLogStringForFeedbackModality(getFeedbackModality())
    log.feedbackState = stringifyState(getFeedbackState())
    log.sentenceIndex = getCurrentWorkingTextSentenceIndex()
    log.inputSentence = getCurrentWorkingText().text
    log.outputSentence = undefined

    pushlog(log);
}

export const logUserInput = (userInput, isControllerInput) => {
    if (!isTaskTimerRunning())
        return;

    let log = new Log('UserInput', getTimeInSeconds(getTaskTimerValue()))

    log.userInput = userInput;
    log.inputModality = (isControllerInput) ? 'CONTROLLER' : 'VOICE'
    log.isEditMode = ( getControllerMode() === 'EDIT' ) ? 'YES' : 'NO'
    log.feedbackModality = getLogStringForFeedbackModality(getFeedbackModality())
    log.feedbackState = stringifyState(getFeedbackState())
    log.sentenceIndex = getCurrentWorkingTextSentenceIndex()
    log.inputSentence = undefined
    log.outputSentence = undefined
    
    pushlog(log);
}

export const logTextChange = () => {
    if (!isTaskTimerRunning())
        return;

    let log = new Log('TextChange', getTimeInSeconds(getTaskTimerValue()))
    
    log.userInput = undefined
    log.inputModality = undefined
    log.isEditMode = undefined
    log.feedbackModality = undefined
    log.feedbackState = undefined
    log.sentenceIndex = getCurrentWorkingTextSentenceIndex()
    log.inputSentence = getSentenceBeforeUpdate()
    log.outputSentence = getCurrentWorkingText().text

    pushlog(log);
}

