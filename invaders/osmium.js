/*
Initialize master tree first -> master tree object initializes other drawable objects

TODO -- story boarding
     -- tile based bg
     -- audio additions
     -- add direction based movement to ship controls
     -- intelligent enemy
     -- render background using JSON file
     -- python script for sprite gen & anim
     -- improve collision detection and movement restriction for static bg objects
     -- pause scr, controls, menu scr

GAMES TBD -- Tetris -- FreeRunner -- Snooker -- Pacman -- Platformer -- Strategy
*/
function GameMaster(width, height) {
    this.el = null;
    this.canvas = null;
    this.engine = null;
    this.prevTimestamp = 0;
    this.maxFPS = 30;
    this.delta = 1000 / this.maxFPS;
    this.params = {
        width: width,
        height: height
    };

    // %age difficulty
    this.difficulty = 10;
    this.lastEnemySpawnedTime = 0;

    this.isPaused = false;
    this.isRunning = false;
    this.gameOver = false;

    var self = this;

    // All control keys
    this.inputBindings = ['a', 'w', 's', 'd', 'q', 'e', 'f', 'p'];
    this.keypress = null;
    this.keyrelease = null;

    //List of Movable Drawable Objects present on screen
    this.objects = [];
    // Background Layer -> Contains only non-collidable image objects
    this.backgroundLayer = null;
    
    // Data Struct for Spatial Partitioning Collision detection
    //this.gameQuad = new QuadTree(width / 2, height / 2, width, height);
    this.gameQuad = new SpatialPartitions(width / 2, height / 2, width, height)

    //Current Player
    this.player = null;

    //Mem-Optimization Pools - used to store inactive objects for re-initing later
    this.bulletPool = [];
    this.shipPool = [];

    // All active GuiFrames
    this.GUILayer = new GuiLayer(this.params.width, this.params.height);
    
    this.init = function() {
        this.el = document.getElementById('game');

        var canvasEl = document.createElement('canvas');
        canvasEl.id = "osmium";
        canvasEl.width = this.params.width;
        canvasEl.height = this.params.height;
        canvasEl.style.zIndex = 3;
        canvasEl.style.position = "absolute";
        canvasEl.style.border = "1px solid";
        this.el.appendChild(canvasEl);


        this.engine = fabric;
        this.canvas = new this.engine.StaticCanvas(canvasEl.id);

        this.inputBindings.forEach(function(key) {
            keyboardJS.bind(key, function(e) {
                self.keypress = key;
                self.keyrelease = null;
            }, function(e) {
                self.keyrelease = key;
                self.keypress = null;
            })
        });

        this.backgroundLayer = new BackgroundLayer(1, [document.getElementById('nightsky')], 0, 10);
        this.renderBackground();
        
        this.player = new PlayerShip(this.params.width/2, this.params.height-30);
        this.addObject(this.player);
        this.isRunning = true;

        this.GUILayer.addFrame(new GuiFrame(70, 555, 100, 40, "grey-panel", "Health: ", "health", this.player));
        this.GUILayer.addFrame(new GuiFrame(200, 555, 100, 40, "grey-panel", "Lives: ", "lives", this.player));
        this.GUILayer.addFrame(new GuiFrame(480, 555, 100, 40, "grey-panel", "Kills: ", "score", this.player));
        this.canvas.renderAll();
    };

    // Called every time new object is instantiated
    this.newObject = function(type, parent, x, y) {
        if (type == 'bullet') {
            if (this.bulletPool.length) {
                obj = this.bulletPool.pop();
                obj.active = true;
                obj.reinit(parent);
                obj.addToScene();
                //console.log("new bullet from pool");
            } else {
                //console.log("new bullet instance");
                this.addObject(new Bullet(parent));
            }
        } else if (type == 'ship') {
            //console.log("ship pool length "+this.shipPool.length);
            if (this.shipPool.length) {
                obj = this.shipPool.pop();
                obj.reinit(x, y);
                obj.addToScene();
                //console.log("ship from pool - length "+this.shipPool.length);
            } else {
                //console.log("new ship");
                this.addObject(new EnemyShip(x, y));
            }
        }
    };

    this.addObject = function(gameObject) {
        this.objects.push(gameObject);
    };

    this.update = function(realDelta) {
        self.backgroundLayer.update(realDelta);
        self.gameQuad.clear();
        self.objects.forEach(function(object) {
            if (self.isOutside(object) && object.active) {
                self.addToPool(object);
            }
            if (object.active) {
                object.update(realDelta, self.keypress, self.keyrelease);
                self.gameQuad.addObj(object);
            }
        });
        self.checkCollisions();

        self.GUILayer.update();
        if(self.keypress == 'p'){
            self.keypress = '';
            self.pauseGame();
        }
    };

    this.gameLoop = function(timestamp) {
        if(self.isPaused){
            if(self.keypress == 'p'){
                self.resumeGame();
                self.keypress = '';
            }
            requestAnimationFrame(self.gameLoop);
            return;
        }

        if (timestamp - self.prevTimestamp <= self.delta) {
            requestAnimationFrame(self.gameLoop);
            return;
        }

        if (timestamp - self.lastEnemySpawnedTime > (100 - self.difficulty) * 25) {
            self.spawnEnemy();
            self.lastEnemySpawnedTime = timestamp;
        }
        realDelta = timestamp - self.prevTimestamp;
        while (realDelta > this.delta) {
            self.update(self.delta);
            realDelta -= self.delta;
        };

        if (timestamp - self.lastEnemySpawnedTime > (100 - self.difficulty) * 50) {
            self.spawnEnemy();
            self.lastEnemySpawnedTime = timestamp;
        }
        self.update(realDelta);
        self.canvas.renderAll();
        self.GUILayer.renderAll();
        self.prevTimestamp = timestamp;
        
        requestAnimationFrame(self.gameLoop);
    };

    this.startGame = function() {
        requestAnimationFrame(window.game.gameLoop);
    };

    this.pauseGame = function() {
        self.isPaused = true;
        self.isRunning = false;
        //store prevTimestamp, put condition in gameloop checking pause flag
    };

    this.resumeGame = function() {
        self.isPaused = false;
        self.isRunning = true;
        self.gameOver = false;
        self.prevTimestamp = window.performance.now();
        requestAnimationFrame(window.game.gameLoop);
        //call gameloop - passing realDelta and prevTimestamp
    };

    this.destroyObject = function(gameObj) {
        gameObj = null;
        delete gameObj;
    };

    // Check if gameObj is outside the canvas
    this.isOutside = function(gameObj) {
        return (gameObj.x - gameObj.halfWidth) > this.params.width || (gameObj.x + gameObj.halfWidth) < 0 || (gameObj.y - gameObj.halfHeight) > this.params.height || (gameObj.y + gameObj.halfHeight) < 0
    };

    this.spawnEnemy = function() {
        var x = Math.random() * (this.params.width - 200);
        var y = 50;
        this.newObject('ship', null, x, y);
    };

    //Initialize static background objects
    this.renderBackground = function() {
        var wallWidth = 10;
        var wallHeight = this.params.height;
        this.addObject(new StaticBGObject(wallWidth / 2, wallHeight / 8,   wallWidth, wallHeight/4));
        this.addObject(new StaticBGObject(wallWidth / 2, 3*wallHeight / 8, wallWidth, wallHeight/4));
        this.addObject(new StaticBGObject(wallWidth / 2, 5*wallHeight / 8, wallWidth, wallHeight/4));
        this.addObject(new StaticBGObject(wallWidth / 2, 7*wallHeight / 8, wallWidth, wallHeight/4));

        this.addObject(new StaticBGObject(this.params.width - wallWidth / 2, wallHeight / 8, wallWidth, wallHeight/4));
        this.addObject(new StaticBGObject(this.params.width - wallWidth / 2, 3*wallHeight / 8, wallWidth, wallHeight/4));
        this.addObject(new StaticBGObject(this.params.width - wallWidth / 2, 5*wallHeight / 8, wallWidth, wallHeight/4));
        this.addObject(new StaticBGObject(this.params.width - wallWidth / 2, 7*wallHeight / 8, wallWidth, wallHeight/4));
    };

    // Iterate though gameQuad - all nodes
    this.checkCollisions = function() {
        /*objects = [];
        this.gameQuad.getAllObjects(objects);
        for (var x = 0, len = objects.length; x < len; x++) {
            this.gameQuad.findObjects(obj = [], objects[x]);
            for (y = 0, length = obj.length; y < length; y++) {
                if (this.isColliding(objects[x], obj[y])) {
                    objects[x].onCollide(obj[y]);
                    obj[y].onCollide(objects[x]);
                }
            }
        }*/
        this.gameQuad.checkObjectPairs(this.isColliding);
    };

    // True if the 2 objects are colliding
    this.isColliding = function(obj1, obj2) {
        r = (2 * Math.abs(obj1.x - obj2.x) < obj1.width + obj2.width) && (2 * Math.abs(obj1.y - obj2.y) < obj1.height + obj2.height) && (obj1.isFriendly != obj2.isFriendly);
        if(r){
            obj1.onCollide(obj2);
            obj2.onCollide(obj1);
        };
    };

    this.addToPool = function(obj) {
        obj.active = false;
        obj.removeFromScene();
        if (obj.type == 'bullet') {
            this.bulletPool.push(obj);
            //console.log("added bullet to pool - new length -" + this.bulletPool.length);
        } else if (obj.type == 'ship') {
            this.shipPool.push(obj);
        }
    };

};

function PlayerShip(x, y) {
    this.type = "player";
    this.isFriendly = true;

    this.x = x;
    this.y = y;
    this.height = 50;
    this.width = 50;
    this.halfHeight = this.height / 2;
    this.halfWidth = this.width / 2;
    this.radius = 10;
    this.velocity = 80;
    this.angularVelocity = 40;

    this.active = true;

    // 1 second / no. of bullets fired per second
    this.firingRate = 1000 / 4;
    this.lastFired = 0;

    // Player Stats
    this.health = 100;
    this.lives = 3;
    this.score = 1;

    //constructor - called by master
    this.obj = new window.game.engine.Image(document.getElementById('playership1'), {
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        width: this.width,
        height: this.height,
        angle: 0
    });
    this.movementDirection = this.obj.get('angle');
    window.game.canvas.add(this.obj);

    // update function to include angular movement 
    this.update = function(realDelta, kbInput, kbRelease) {
        var distance = this.velocity * realDelta / 1000;
        var angle = this.angularVelocity * realDelta / 1000;
        switch (kbInput) {
            case 'a':
                this.movementDirection = this.obj.get('angle') - 90;
                this.x -= distance;
                this.obj.set({
                    'left': this.x,
                    'top': this.y
                });
                break;
            case 'w':
                this.movementDirection = this.obj.get('angle');
                this.y -= distance;
                this.obj.set({
                    'left': this.x,
                    'top': this.y
                });
                break;
            case 's':
                this.movementDirection = this.obj.get('angle') + 180;
                this.y += distance;
                this.obj.set({
                    'left': this.x,
                    'top': this.y
                });
                break;
            case 'd':
                this.movementDirection = this.obj.get('angle') + 90;
                this.x += distance;
                this.obj.set({
                    'left': this.x,
                    'top': this.y
                });
                break;
            case 'q':
                this.obj.set({
                    'angle': this.obj.get('angle') - angle
                });
                break;
            case 'e':
                this.obj.set({
                    'angle': this.obj.get('angle') + angle
                });
                break;
            case 'f':
                this.fireBullet();
                break;
        }
    };

    this.fireBullet = function() {
        now = window.performance.now();
        if (now - this.lastFired > this.firingRate) {
            this.lastFired = now;
            window.game.newObject('bullet', parent = this);
        }
    };

    this.removeFromScene = function() {
        window.game.canvas.remove(this.obj);
    };

    this.addToScene = function() {
        window.game.canvas.add(this.obj);
    };

    this.onCollide = function(obj) {
        if (obj.type == 'bgobject') {
            console.log("player collided with wall");
        } else if (obj.type == 'bullet') {
            //console.log("player hit by bullet");
            this.health -= 1;
            if (this.health <= 0) {
                this.lives -= 1;
                this.health = 100 - this.health;
            }
        }
    };
};

function EnemyShip(x, y) {
    this.type = "ship";
    this.isFriendly = false;

    this.x = x;
    this.y = y;
    this.height = 50;
    this.width = 50;
    this.halfHeight = this.height / 2;
    this.halfWidth = this.width / 2;
    this.radius = 10;

    this.velocity = 80;
    this.angularVelocity = 2;

    this.obj = null;
    this.active = true;

    // 1 second / no. of bullets fired per second
    this.firingRate = 1000 / 2;
    this.lastFired = 0;

    //Ship Stats
    var maxHealth = 5;
    this.health = maxHealth;

    this.obj = new window.game.engine.Image(document.getElementById('enemyship1'), {
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        width: this.width,
        height: this.height,
        angle: 0
    });
    
    // ship faces downwards
    this.obj.set({
        'angle': 180
    });
    // angle or direction of movement
    this.movementDirection = this.obj.get('angle');
    window.game.canvas.add(this.obj);

    this.reinit = function(x, y) {
        this.health = maxHealth;
        this.x = x;
        this.y = y;
        this.active = true;
        this.obj.set({
            left: this.x,
            top: this.y
        });
    }

    this.update = function(realDelta) {
        if (this.health <= 0) {
            if(this.active){
                console.log("incrementing player score");
                window.game.player.score += 1;
            }
            window.game.addToPool(this);
        }
        var distance = this.velocity * realDelta / 1000;
        //var angle = this.angularVelocity * realDelta / 1000;
        this.y += distance;
        this.obj.set({
            'left': this.x,
            'top': this.y
        });
        this.fireBullet();
    };

    this.fireBullet = function() {
        now = window.performance.now();
        if (now - this.lastFired > this.firingRate) {
            this.lastFired = now;
            window.game.newObject('bullet', parent = this);
        }
    };

    this.removeFromScene = function() {
        this.active = false;
        window.game.canvas.remove(this.obj);
    };

    this.addToScene = function() {
        this.active = true;
        window.game.canvas.add(this.obj);
    };

    this.onCollide = function(obj) {
        if (obj.type == 'bullet') {
            //console.log("enemy hit by bullet");
            this.health -= 5;
        }
    };
};

function Bullet(parentObject) {
    this.parent = parentObject;

    this.type = "bullet";
    this.isFriendly = this.parent.isFriendly;
    this.obj = null;
    this.x = this.parent.x;
    this.y = this.parent.y;
    this.width = 5;
    this.height = 5;
    this.halfHeight = this.height / 2;
    this.halfWidth = this.width / 2;
    this.radius = 1;
    this.velocity = 150;
    this.active = true;
    this.direction = this.parent.obj.get('angle');

    this.obj = new window.game.engine.Rect({
        left: this.x,
        top: this.y,
        fill: 'yellow',
        originX: 'center',
        originY: 'center',
        width: this.width,
        height: this.height
    });
    window.game.canvas.add(this.obj);

    this.reinit = function(parent) {
        this.active = true;
        this.parent = parent;
        this.x = parent.x;
        this.y = parent.y;
        this.direction = parent.obj.get('angle');
        this.isFriendly = parent.isFriendly;
        this.obj.set({
            left: this.x,
            top: this.y
        });
    };

    this.update = function(realDelta) {
        var distance = this.velocity * realDelta / 1000;
        this.y -= distance * Math.cos(this.direction * 0.01745);
        this.x += distance * Math.sin(this.direction * 0.01745);
        this.obj.set({
            'left': this.x,
            'top': this.y
        });
    };

    this.removeFromScene = function() {
        window.game.canvas.remove(this.obj);
    };

    this.addToScene = function() {
        window.game.canvas.add(this.obj);
    };

    this.onCollide = function(obj) {
        // stop rendering bullet
        if (this.active) {
            window.game.addToPool(this);
        }
    };
};

//Rectangular Rigid Background Objects
function StaticBGObject(x, y, width, height) {
    this.type = "bgobject";

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.halfHeight = this.height / 2;
    this.halfWidth = this.width / 2;
    this.active = true;

    this.obj = new window.game.engine.Rect({
        left: x,
        top: y,
        fill: 'gray',
        originX: 'center',
        originY: 'center',
        width: this.width,
        height: this.height
    });
    window.game.canvas.add(this.obj);

    this.update = function() {
        return;
    };

    this.removeFromScene = function() {
        window.game.canvas.remove(this.obj);
    };

    this.addToScene = function() {
        window.game.canvas.add(this.obj);
    };

    this.onCollide = function(obj) {
        console.log("collided with wall");
        // Rebound
        var angle = -obj.movementDirection;
        var distance = 5;
        obj.y -= distance * Math.cos(angle);
        obj.x += distance * Math.sin(angle);
        obj.obj.set({
            left: obj.x,
            top: obj.y
        });
    };
};


// Basic HUD or Info Menus
// textVal = passed object's property to be displayed
function GuiFrame(x, y, width, height, imgId, label, textVal, obj) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.halfHeight = this.height / 2;
    this.halfWidth = this.width / 2;

    /*var canvas = window.game.GUILayer.canvas;
    var engine = window.game.GUILayer.engine;*/

    this.type = "screen";
    this.active = true;

    this.obj = new window.game.GUILayer.engine.Image(document.getElementById(imgId), {
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        width: this.width,
        height: this.height,
        angle: 0
    });
    this.obj.scaleToWidth(this.width);
    window.game.GUILayer.canvas.add(this.obj);
    this.label = label;

    this.text = (obj != null) ? (this.label + obj[textVal]) : textVal;
    this.txtObj = new window.game.GUILayer.engine.Text(this.text, {
        left: x,
        top: y,
        fontSize: 20,
        originY: 'center',
        originX: 'center'
    });
    window.game.GUILayer.canvas.add(this.txtObj);

    
    this.update = function() {
        this.text = (obj != null) ? (this.label + obj[textVal]) : textVal;
        this.txtObj.set({text: this.text});
    };

    this.removeFromScene = function() {
        window.game.GUILayer.canvas.remove(this.txtObj);
        window.game.GUILayer.canvas.remove(this.obj);
    };

    this.addToScene = function() {
        window.game.GUILayer.canvas.add(this.obj);
        window.game.GUILayer.canvas.add(this.txtObj);
    };
};

function BackgroundLayer(numLayers, imgEls, xVelocity, yVelocity) {
    // yVelocity/xVelocity = tan(angle Of Movement Of Background)
    if (numLayers != imgEls.length) {
        alert("layers & images do not match");
        return;
    }

    this.numLayers = numLayers;
    this.imageEls = imgEls;
    this.direction = 0;

    // pixels per second
    this.xVelocity = xVelocity / 1000;
    this.yVelocity = yVelocity / 1000;
    //this.velocity = 10 / 1000;

    this.bgobjects = []

    var self = this;

    // point of movement for images is set to top left corner
    this.imageEls.forEach(function(el) {
        var o1 = new window.game.engine.Image(el, {
            left: 0,
            top: 0,
        });
        self.bgobjects.push(o1);
        window.game.canvas.add(o1);
        var o2 = new window.game.engine.Image(el, {
            left: 0,
            top: -800,
        });
        self.bgobjects.push(o2);
        window.game.canvas.add(o2);
    });

    // wrap 2 images back-to-back cylindrically
    this.update = function(realDelta) {
        var xDistance = realDelta * self.xVelocity;
        var yDistance = realDelta * self.yVelocity;
        self.bgobjects.forEach(function(obj) {
            if(obj.get('top')>window.game.params.height || obj.get('left')>window.game.params.width){
                obj.set({
                    left:0,
                    top: -obj.get('height') + obj.get('top') - window.game.params.height
                });
            } else {
                obj.set({
                    left: obj.get('left') + xDistance,
                    top: obj.get('top') + yDistance
                });
            }
        });
    };
};

function GuiLayer(width, height){
    this.width = width;
    this.height = height;

    this.el = document.getElementById('game');

    var canvasEl = document.createElement('canvas');
    canvasEl.id = "osmium-gui";
    canvasEl.width = this.width;
    canvasEl.height = this.height;
    canvasEl.style.zIndex = 5;
    canvasEl.style.position = "absolute";
    canvasEl.style.border = "1px solid";
    //canvasEl.style.left = 0;
    //canvasEl.style.top = 0;
    this.el.appendChild(canvasEl);


    this.engine = fabric;
    this.canvas = new this.engine.StaticCanvas(canvasEl.id);

    this.pausedBigFrames = 0;

    this.frames = [];
    this.addFrame = function(frame){
        this.frames.push(frame);
    };

    this.update = function(){
        this.frames.forEach(function(frame){
            if(frame.active)
                frame.update();
        });
    };

    this.renderAll = function(){
        this.canvas.renderAll();
    };

    this.addStoryPanel = function(x,y,w,h,storyString) {
        this.addFrame(new GuiFrame(x, y, w, h, "big-panel", null, storyString, null));
        this.pausedBigFrames += 1;
    };

    this.removeStoryPanel = function() {
        if(this.pausedBigFrames <= 0)
            return;
        this.frames[this.frames.length-1].removeFromScene()
        this.frames.splice(0,this.frames.length-1);
        this.pausedBigFrames -= 1;
    };

    //WIP
    this.removeAllStoryPanels = function() {
        if(this.pausedBigFrames <= 0)
            return;
        this.frames.splice(0, this.frames.length - this.pausedBigFrames);
        this.pausedBigFrames = 0;  
    };
};

//quad tree for collision detection
//  _3_|_0_ 
//   2 | 1
// x, y are coordinates for centre of rectangle
function QuadTree(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.maxObjPerNode = 10;
    this.maxHeight = 10;


    this.objects = [];
    this.nodes = [];

    var self = this;

    this.addObj = function(obj) {
        var quad = this.getQuadrant(obj);
        if (this.nodes.length && quad > -1) {
            this.nodes[quad].addObj(obj);
            return;
        } else {
            if (this.objects.length > this.maxObjPerNode) {
                this.split();
                this.addObj(obj);
                return;
            }
            this.objects.push(obj);
            return;
        }
    };

    this.getQuadrant = function(obj) {
        var quad = -1;
        var top = (obj.y + obj.halfHeight < this.y);
        var bottom = (obj.y - obj.halfHeight > this.y);
        var right = (obj.x - obj.halfWidth > this.x);
        var left = (obj.x + obj.halfWidth < this.x);

        if (top) {
            if (left) {
                quad = 3;
            } else if (right) {
                quad = 0;
            }
        } else if (bottom) {
            if (left) {
                quad = 2;
            } else if (right) {
                quad = 1;
            }
        }
        return quad;
    };

    this.split = function() {
        var subwidth = this.width / 2;
        var subheight = this.height / 2;

        this.nodes[0] = new QuadTree(this.x + subwidth / 2, this.y - subheight / 2, subwidth, subheight);
        this.nodes[1] = new QuadTree(this.x + subwidth / 2, this.y + subheight / 2, subwidth, subheight);
        this.nodes[2] = new QuadTree(this.x - subwidth / 2, this.y + subheight / 2, subwidth, subheight);
        this.nodes[3] = new QuadTree(this.x - subwidth / 2, this.y - subheight / 2, subwidth, subheight);
        var primeObjs = [];
        this.objects.forEach(function(object) {
            var index = self.getQuadrant(object)
            if (index > -1) {
                self.nodes[index].addObj(object);
            } else {
                primeObjs.push(object);
            }
        });
        this.objects = primeObjs;
    };

    this.getAllObjects = function(returnedObjects) {
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].getAllObjects(returnedObjects);
        }
        for (var i = 0, len = this.objects.length; i < len; i++) {
            returnedObjects.push(this.objects[i]);
        }
        return returnedObjects;
    };


    // Return all objects that the object could collide with
    this.findObjects = function(returnedObjects, obj) {
        var index = this.getQuadrant(obj);
        if (index != -1 && this.nodes.length) {
            this.nodes[index].findObjects(returnedObjects, obj);
        }
        for (var i = 0, len = this.objects.length; i < len; i++) {
            returnedObjects.push(objects[i]);
        }
        return returnedObjects;
    };

    this.clear = function() {
        this.objects = [];
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clear();
        }
        this.nodes = [];
    };
};

// Main Implementation
function runGame() {
    window.game = new GameMaster(600, 600);
    window.game.init();
    window.game.startGame();
};