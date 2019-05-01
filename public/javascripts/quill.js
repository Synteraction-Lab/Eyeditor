/* Quill setup */
var toolbarOptions = [
    ['bold', 'italic', 'underline'],                // toggled buttons
    [{ 'color': [] }], 
    ['clean']                                         // remove formatting button
];

var options = {
    theme: 'snow',
    modules: {
        toolbar: toolbarOptions,
        history: {
            delay: 1500,
            maxStack: 100,
        }
    }
};

export var quill = new Quill('#editor',options);
export var Delta = Quill.import('delta');
