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
    get workingText()       { return this._workingText; }
    get hasTextChanged()    { return this._hasTextChanged; }
    get changedText()       { return this._changedText; }

    set feedbackModality(_feedbackModality) { this._feedbackModality = _feedbackModality; }
    set feedbackState(_feedbackState)       { this._feedbackState = _feedbackState; }
    set inputModality(_inputModality)       { this._inputModality = _inputModality; }
    set isEditMode(_isEditMode)             { this._isEditMode = _isEditMode; }
    set input(_input)                       { this._input = _input; }
    set sentenceIndex(_sentenceIndex)       { this._sentenceIndex = _sentenceIndex; }
    set workingText(_workingText)           { this._workingText = _workingText; }
    set hasTextChanged(_hasTextChanged)     { this._hasTextChanged = _hasTextChanged; }
    set changedText(_changedText)           { this._changedText = _changedText; }
}

let log;

export const createlog = (eventType, timestamp) => {
    log = new Log(eventType, timestamp);
}

export const getlog = () => log;