document.addEventListener('keydown', function (e) {
    console.log(e.type)
    console.log(e.keyCode)
})
document.addEventListener('keyup', function (e) {
    console.log(e.type)
    console.log(e.keyCode)
})
// mouse events
document.addEventListener('click', function (e) {
    console.log('event fired', e.type);
    console.log('button', e.button);
    console.log('which', e.which);
    console.log('***********************');
})
document.addEventListener('dblclick', function (e) {
    console.log('event fired', e.type);
    console.log('button', e.button);
    console.log('which', e.which);
    console.log('***********************');
})
document.addEventListener('mousedown', function (e) {
    console.log('event fired', e.type);
    console.log('button', e.button);
    console.log('which', e.which);
    console.log('***********************');
})
document.addEventListener('mouseup', function (e) {
    console.log('event fired', e.type);
    console.log('button', e.button);
    console.log('which', e.which);
    console.log('***********************');
})
document.addEventListener('mousemove', function (e) {
    // console.log('mousemove event fired.')
})
document.addEventListener('wheel', function (e) {
    console.log('wheel event fired.')
    console.log('event', e)
})
