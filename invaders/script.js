var elem = document.getElementById('game');
var params = {
    width: 500,
    height: 500
};
var two = new Two(params).appendTo(elem);
var prevTimestamp = 0;
var FPS = 30;
var delta = 1000 / FPS;
var maxTimeStep = 50;

//px per second
var playerVelocity = 80;
var playerRotationVelocity = 2;

var x_pos = 72,
    y_pos = 10;
//var gameObj = two.makeCircle(x_pos, y_pos, 10);
var gameObj = two.makeRoundedRectangle(x_pos, y_pos, 50, 50, 3);


//var rect = two.makeRectangle(213, 100, 100, 100);

var kbInput = 0;
var kbEvent = 'p';

//Bind all input keys
input_bindings = ['a', 'w', 's', 'd', 'q', 'e', 'f'];
input_bindings.forEach(function(ch) {
    keyboardJS.bind(ch, function(e) {
        //console.log(ch+" pressed");
        kbInput = ch;
        kbEvent = 'p';
    }, function(e) {
        //console.log(ch+" released");
        kbEvent = 'r';
        kbInput = 0;
    })
});


function loop(timestamp) {
    /*if (kbInput == 'q') {
        return;
    }*/
    if (timestamp - prevTimestamp <= delta) {
        requestAnimationFrame(loop);
        return;
    }
    realDelta = timestamp - prevTimestamp;
    while (realDelta > maxTimeStep) {
        objUpdate(maxTimeStep);
        realDelta -= maxTimeStep;
        //console.log("while loop");
    }
    objUpdate(realDelta);
    two.update();
    prevTimestamp = timestamp;
    requestAnimationFrame(loop);
    //console.log('in loop');
}

function objUpdate(realDelta) {
    var distance = playerVelocity * realDelta / 1000;
    var angle = playerRotationVelocity * realDelta / 1000;
    switch (kbInput) {
        case 'a':
            x_pos -= distance;
            gameObj.translation.set(x_pos, y_pos);
            break;
        case 'w':
            y_pos -= distance;
            gameObj.translation.set(x_pos, y_pos);
            break;
        case 's':
            y_pos += distance;
            gameObj.translation.set(x_pos, y_pos);
            break;
        case 'd':
            x_pos += distance;
            gameObj.translation.set(x_pos, y_pos);
            break;
        case 'q':
            gameObj.rotation -= angle;
            break;
        case 'e':
            gameObj.rotation += angle;
            break;
        case 'f':
            fireBullet();
            break;
    }
}

function fireBullet(){
    
}

requestAnimationFrame(loop);