kbx = {};
kbx.keypress_stack = [];
kbx.keyup_stack = []
kbx.current_keyup = "";
kbx.current_keypress = "";

document.onkeypress = function(event){
    kbx.current_keypress = event.key;
    //kbx.triggerEvent("keypress",kbx.current_keypress);
    if(kbx.keypress_stack.indexOf(kbx.current_keypress) == -1){
        kbx.keypress_stack.push(event.key);
        //kbx.triggerComboEvent("keypress",kbx.keypress_stack);
    }
    kbx.keyup_stack = [];
    kbx.current_keyup = "";
}

document.onkeyup = function(event){
    kbx.current_keyup = event.key;
    kbx.keyup_stack.push(event.key);
    /*kbx.triggerEvent("keyup",kbx.current_keyup);
    kbx.triggerComboEvent("keyup",kbx.keyup_stack);*/   
    kbx.keypress_stack = [];
    kbx.current_keypress = "";
}

kbx.KBFlush = function() {
    kbx.keypress_stack = [];
    kbx.keyup_stack = []
    kbx.current_keyup = "";
    kbx.current_keypress = "";
}

kbx.triggerEvent = function(eventType, key) {
    console.log(eventType+"-"+key);
};

kbx.triggerComboEvent = function(eventType, stack) {
    console.log("Combo-"+eventType+"-"+stack);
};

kbx.getKeypress = function () {
    return kbx.current_keypress;
}

kbx.getKeypressCombo = function () {
    return kbx.keypress_stack.join(" + ");  
}

kbx.getKeyup = function () {
    return kbx.current_keyup;   
}

kbx.getKeyupCombo = function () {
    return kbx.keyup_stack.join(" + ");
}