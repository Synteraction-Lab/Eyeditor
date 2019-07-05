let taskTimer = new Timer();

taskTimer.addEventListener('secondTenthsUpdated', function (e) {
    // console.log('taskTimer ::', taskTimer.getTimeValues().toString(['hours', 'minutes', 'seconds', 'secondTenths']));
});

export const getTaskTimerValue = () => taskTimer.getTimeValues().toString(['hours', 'minutes', 'seconds', 'secondTenths']);
export const startTaskTimer = () => { taskTimer.start({ precision: 'secondTenths' }); }
export const stopTaskTimer = () => { taskTimer.stop(); }
export const pauseTaskTimer = () => { taskTimer.pause(); }
export const isTaskTimerRunning = () => taskTimer.isRunning();

export const getTimeInSeconds = (time) => {
    var split_ = time.split(':')
    let seconds = parseInt(split_[0]) * 3600 + parseInt(split_[1]) * 60 + parseInt(split_[2])
    if (parseInt(split_[3]) >= 5)
        seconds += 1;

    return seconds;
}


