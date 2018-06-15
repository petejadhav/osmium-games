//spatially partitioned screen area for collision detection
// 16 partitions - 
// x, y are coordinates for centre of rectangle
function SpatialPartitions(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    //Should always be a square
    this.totalPartitions = 16;

    this.partHeight = this.height/Math.sqrt(this.totalPartitions);
    this.partWidth = this.width/Math.sqrt(this.totalPartitions);
    this.rowCount = this.columnCount = Math.sqrt(this.totalPartitions);
    //this.objects = [];
    this.nodes = [];

    var self = this;

    //create master list of 16 partitions (nodes)
    //this.init = function() {
        for(i=0;i<this.totalPartitions;i++){
            self.nodes.push([]);
        }
    //}

    this.addObj = function(obj) {
        var partPosList = this.getPartition(obj);
        partPosList.forEach(function(v,k){
            if(v>0 && v<=self.totalPartitions){
                /*console.log(v);
                console.log(obj.active);*/
                self.nodes[v-1].push(obj);
            }
        });
    };

    this.getPartition = function(obj) {
        var objRoughCol = obj.x/this.partWidth;
        var objRoughRow = obj.y/this.partHeight;
        var objRows = [Math.ceil(objRoughRow)];
        var objCols = [Math.ceil(objRoughCol)];
        
        // Check if obj exceeds the corners of the grid
        // clockwise from top-left ->0,1,2,3 -> if cornerFlags[0] == 1 - then add requisite row,col  (top-left row,col)
        var cornerFlags = [-1,-1,-1,-1];

        if(obj.x - obj.halfWidth < (objCols[0] - 1)*this.partWidth){
            objCols.push(objCols[0] - 1);
            objRows.push(objRows[0]);
            cornerFlags[0]+=1;
            cornerFlags[3]+=1;
        }
        if(obj.x + obj.halfWidth > (objCols[0])*this.partWidth){
            objCols.push(objCols[0] + 1);
            objRows.push(objRows[0]);
            cornerFlags[1]+=1;
            cornerFlags[2]+=1;
        }

        if(obj.y - obj.halfHeight < (objRows[0] - 1)*this.partHeight){
            objRows.push(objRows[0] - 1);
            objCols.push(objCols[0]);
            cornerFlags[1]+=1;
            cornerFlags[0]+=1;
        }
        if(obj.y + obj.halfHeight > (objRows[0])*this.partHeight){
            objRows.push(objRows[0] + 1);
            objCols.push(objCols[0]);
            cornerFlags[3]+=1;
            cornerFlags[2]+=1;
        }
        
        if(cornerFlags[0]==1){
            objRows.push(objRows[0] - 1);
            objCols.push(objCols[0] - 1);
        }
        if(cornerFlags[1]==1){
            objRows.push(objRows[0] - 1);
            objCols.push(objCols[0] + 1);
        }
        if(cornerFlags[2]==1){
            objRows.push(objRows[0] + 1);
            objCols.push(objCols[0] + 1);
        }
        if(cornerFlags[3]==1){
            objRows.push(objRows[0] + 1);
            objCols.push(objCols[0] - 1);
        }

        var parts = []
        for(i=0;i<objRows.length;i++){
            parts.push(this.columnCount * (objRows[i] - 1) + objCols[i]);
        }

        return parts;
    };

    
    this.checkObjectPairs = function(checkFn) {
        this.nodes.forEach(function(node,nodeIndex){
            node.forEach(function(obj,index){
                for(i=index+1;i<node.length;i++){
                    checkFn(obj,node[i]);
                }
            });
        });

        /*for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].getAllObjects(returnedObjects);
        }
        for (var i = 0, len = this.objects.length; i < len; i++) {
            returnedObjects.push(this.objects[i]);
        }
        return returnedObjects;*/
    };


    // Return all objects that the object could collide with
    /*this.findObjects = function(returnedObjects, obj) {
        var index = this.getQuadrant(obj);
        if (index != -1 && this.nodes.length) {
            this.nodes[index].findObjects(returnedObjects, obj);
        }
        for (var i = 0, len = this.objects.length; i < len; i++) {
            returnedObjects.push(objects[i]);
        }
        return returnedObjects;
    };*/

    this.clear = function() {
        for (var i = 0; i < this.nodes.length; i++) {
            self.nodes[i]=[];
        }
    };
};