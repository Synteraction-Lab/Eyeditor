import { getTimeInSeconds, getTaskTimerValue, isTaskTimerRunning } from "../Services/tasktimer.js";
import { getCurrentWorkingTextSentenceIndex, getCurrentWorkingText } from "../Engines/FeedbackHandler.js";
import { getSocket } from "../Services/socket.js";

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

    get feedbackModality()  { return this._feedbackModality; }
    get feedbackState()     { return this._feedbackState; }
    get inputModality()     { return this._inputModality; }
    get isEditMode()        { return this._isEditMode; }
    get input()             { return this._input; }
    get sentenceIndex()     { return this._sentenceIndex; }
    get sentence()          { return this._sentence; }
    get hasTextChanged()    { return this._hasTextChanged; }
    get changedText()       { return this._changedText; }

    set feedbackModality(_feedbackModality) { this._feedbackModality = _feedbackModality; }
    set feedbackState(_feedbackState)       { this._feedbackState = _feedbackState; }
    set inputModality(_inputModality)       { this._inputModality = _inputModality; }
    set isEditMode(_isEditMode)             { this._isEditMode = _isEditMode; }
    set input(_input)                       { this._input = _input; }
    set sentenceIndex(_sentenceIndex)       { this._sentenceIndex = _sentenceIndex; }
    set sentence(_sentence)                 { this._sentence = _sentence; }
    set hasTextChanged(_hasTextChanged)     { this._hasTextChanged = _hasTextChanged; }
    set changedText(_changedText)           { this._changedText = _changedText; }
}

export const logAlternation = (modality, state, isControllerInput) => {
    if (!isTaskTimerRunning())
        return;

    let log = new Log('Alternation', getTimeInSeconds(getTaskTimerValue()))
    
    log.feedbackModality = modality
    log.feedbackState = state
    log.inputModality = (isControllerInput) ? 'CONTROLLER' : 'VOICE'
    log.sentenceIndex = getCurrentWorkingTextSentenceIndex()
    log.sentence = getCurrentWorkingText().text

    pushlog(log);
}