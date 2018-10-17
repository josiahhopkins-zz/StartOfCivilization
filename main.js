var graphCtx = null;

function getGameControl(game){
    var toReturn = game.gameController;
    toReturn.riverReach = 8;
    return toReturn;
}


// GameBoard code below

function randomInt(n) {
    return Math.floor(Math.random() * n);
}

function rgb(r, g, b) {
    return "rgb(" + r + "," + g + "," + b + ")";
}

function Agent(game, x, y, agent) {
    if (agent) {
        var bit = randomInt(2)
        this.seedWeight = agent.seedWeight + Math.pow(-1, bit) * Math.random() * 0.1;
        if (this.seedWeight < 0) this.seedWeight = 0;
        if (this.seedWeight > 1) this.seedWeight = 1;
    }
    else {
        this.seedWeight = 0.5;
    }

    var val = Math.floor(256 * this.seedWeight);
    this.isSeed = true;
    this.age = 0;
    this.color = rgb(val,val,val);
    this.geneticType = placeWheatInBucket(game, this.seedWeight);
    if( this.seedWeight < .3){
        this.color = "Orange";
    } else if (this.seedWeight > .7){
        this.color = "Purple";
    } else{
        this.color = "Yellow";
    }
    this.maxAge = 50;
    this.age = this.maxAge;

    Entity.call(this, game, x, y);
}

function Animal(game, x, y, Animal){
    this.age = 0;
    this.genome = mutate(Animal)


    Entity.call(this, game, x, y);
}

Animal.prototype = new Entity();
Animal.prototype.update = function(){

}

//Herbivore.prototype = new Animal();

Agent.prototype = new Entity();
Agent.prototype.constructor = Agent;

Agent.prototype.update = function () {
    var SEEDDROP = 2;
    var cell = this.game.board.board[this.x][this.y];
    var dropDistance = Math.floor(this.seedWeight * 6) + 1;
    var seedHardiness = this.seedWeight * this.seedWeight;
    var reproductionAge = 15 * this.seedWeight;

    if(this.isSeed){
        if(cell.water > 0 && (Math.random() > 0.02 * cell.population * cell.population)){
            this.isSeed = false;
            cell.population++;
            cell.water -= 1;
            //Log genetics
            // if(Math.random() < .0001){
            //     console.log(this.seedWeight);
            // }
            this.game.statistics.wheatTypeCount[this.geneticType]++;
        }
        else if(Math.random() < seedHardiness){
            this.dead = true;
        }
    } else{
        this.age++;
        cell.water -= 1;
        // did I die?
        if (Math.random() < 0.02 * cell.population * cell.population && this.age > reproductionAge) {
            this.dead = true;
            cell.population -= 1;
            for(var i = 0; i < SEEDDROP; i++){
                var newX = Math.floor((this.x + randomInt(dropDistance) - (dropDistance / 2) + this.game.board.dimension) % this.game.board.dimension);
                var newY = Math.floor((this.y + randomInt(dropDistance) - (dropDistance / 2) + this.game.board.dimension) % this.game.board.dimension);
                if(newX < 100 && newY < 100 && newX >= 0 && newY >= 0){
                    var newCell = this.game.board.board[newX][newY];
                    if(newCell.seedCount * newCell.seedCount * .02 < Math.random() && !newCell.isRiver){
                        var agent = new Agent(this.game, newX, newY, this);
                        this.game.babies.push(agent); 
                    }
                }
            }
            removeWheatInBucket(this.game, this.seedWeight);
        } 
        //Dying of thirst prevents reproduction
        else if (cell.water < 1){
            this.dead = true; 
            cell.population -= 1;
            removeWheatInBucket(this.game, this.seedWeight);
        }
    }
}

function Cell(game,x,y) {
    this.x = x;
    this.y = y;
    this.game = game;
    this.isRiver = false;
    this.water = 0;
    this.waterDistance=-1;
    this.seedCount = 0;

    this.population = 0;

    this.color = "Grey";
}

Cell.prototype = new Entity();
Cell.prototype.constructor = Cell;

Cell.prototype.update = function () {
    MAX_WATER = 20; //TO_DO
    /*
    This should replenish or deplete resources as necessary on each turn update. Resource determining factors will all be under gameControll object
    */
   if(this.waterDistance > 0 && this.water < MAX_WATER){
        if(this.game.gameController.floodSeason){
            //Replenish during flood season. Should double water and have water table extend to a further range as determined by a cells 
            //riverdistance
            var WATER_DISTANCE = 11//this.game.gameController.riverReach;//TODO
            if(this.waterDistance < WATER_DISTANCE){
                this.water += (WATER_DISTANCE - this.waterDistance);
                this.water = Math.min(this.water, MAX_WATER);
            }
        } else {
            //Standard replenishment. Note that the rate of flooding is determined in the gameengine update function.
            var WATER_DISTANCE = 11//this.game.gameController.riverReach; //TODO
            WATER_DISTANCE = Math.floor(WATER_DISTANCE / 2);
            if(this.waterDistance < WATER_DISTANCE){
                this.water += (WATER_DISTANCE - this.waterDistance);
                this.water = Math.min(this.water, MAX_WATER);
            }
        }
    }
}

/*
Binary search is better but when the array is of length 3 this works. As we add more genetic factors and try to speciate more we will
Have to implement better solutions.
*/
function placeWheatInBucket(game, wheatValue){
    var placement = 0;
    while(placement < game.statistics.wheatTypes.length && wheatValue > game.statistics.wheatTypes[placement]){
        placement++;
    }
    return placement;
}

function removeWheatInBucket(game, wheatValue){
    var placement = 0; 
    while(placement < game.statistics.wheatTypes.length && wheatValue > game.statistics.wheatTypes[placement]){
        placement++;
    }
    game.statistics.wheatTypeCount[placement]--;
}


function Automata(game) {
    var SPLITCHANCE = .01;
    this.dimension = 100;
    this.populationSize = 100;
    this.agents = [];
    game.babies = [];
    game.statistics = {};
    game.statistics.wheatTypes = [.3, .7, 1];
    game.statistics.wheatTypeCount = [0, 0, 0];

    // create board
    this.board = [];
    for (var i = 0; i < this.dimension; i++) {
        this.board.push([]);
        for (var j = 0; j < this.dimension; j++) {
            this.board[i].push(new Cell(game,i,j));
        }
    }
    var allRiverTiles = [];
    var currentRiverTilesInRow= [];
    var nextRiverTiles = [];
    currentRiverTilesInRow.push(Math.round(this.dimension / 3), Math.round((2 * this.dimension) / 3))
    for( var i = 0; i < this.dimension; i++){
        for(var placement = 0; placement < currentRiverTilesInRow.length; placement++){
            //Turn this tile into river
            this.board[currentRiverTilesInRow[placement]][i].isRiver = true;
            this.board[currentRiverTilesInRow[placement]][i].color = "Blue";
            allRiverTiles.push([currentRiverTilesInRow[placement], i]);
            for(var addingWater = 1; addingWater < 11; addingWater++){
                var left = this.board[currentRiverTilesInRow[placement] - addingWater][i]
                var right = this.board[currentRiverTilesInRow[placement] + addingWater][i]
                if(left && !left.isRiver){
                    if(addingWater < 11){
                        left.water += 11 - addingWater;
                    } 
                    left.waterDistance = Math.min(addingWater, addingWater);
                }
                if(right && !right.isRiver){
                    if(addingWater < 11){
                        right.water += 11 - addingWater;
                    } 

                    right.waterDistance = addingWater;
                }
            }

            if(Math.random() < SPLITCHANCE){
                //split once left and once right
                nextRiverTiles.push(currentRiverTilesInRow[placement] + 1, currentRiverTilesInRow[placement] - 1);
            } else{
                //ChooseRightLeftOrMiddle
                var riverDirection = Math.random();
                if(riverDirection < .33){
                    nextRiverTiles.push(currentRiverTilesInRow[placement] + 1);
                } else if(riverDirection < .67){
                    nextRiverTiles.push(currentRiverTilesInRow[placement] - 1);
                } else {
                    nextRiverTiles.push(currentRiverTilesInRow[placement]);
                }
            }
        }
        currentRiverTilesInRow = nextRiverTiles;
        nextRiverTiles = [];
    }

    // add agents
    
    while (this.agents.length < this.populationSize) {
        var x = randomInt(this.dimension);
        var y = randomInt(this.dimension);

        var agent = new Agent(game, x, y);
        this.agents.push(agent);
        this.board[x][y].population += 1;
    }
    

    Entity.call(this, game, 0, 0);
};

Automata.prototype = new Entity();
Automata.prototype.constructor = Automata;

Automata.prototype.update = function () {
    for (var i = 0; i < this.agents.length; i++) {
        this.agents[i].update();
    }

    for (var i = this.agents.length - 1; i >= 0; i--) {
        if (this.agents[i].dead) {
            this.agents.splice(i, 1);
        }
    }
    for (var i = this.game.babies.length - 1; i >= 0; i--){
        this.agents.push(this.game.babies.pop());
    }
    this.game.babies = [];

    //while (this.agents.length < this.populationSize) {
    //    var parent = this.agents[randomInt(this.agents.length)];
    //    var agent = new Agent(this.game, parent.x, parent.y, parent);
    //    this.agents.push(agent);
    //}

    for (var i = 0; i < this.dimension; i++) {
        for (var j = 0; j < this.dimension; j++) {
            this.board[i][j].update();
        }
    }
    console.log(this.game.gameController.floodSeason);
    console.log(this.game.statistics.wheatTypeCount);
};

Automata.prototype.draw_graph = function (ctx, baseX, baseY, proportions, proportionColors){
    var width = 8;
    ctx.fillStyle = "White";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if(proportionColors.length != proportions.length){
        console.error("You cannot draw a graph without equal length color list and to graph list");
    }

    var total = proportions.reduce(add, 0);
    var currentHeight = 0; 
    for (var i = 0; i < proportions.length; i++){
        var barHeight = proportions[i] / total * ctx.canvas.height;
        ctx.fillStyle = proportionColors[i];
        ctx.fillRect(baseX, baseY + currentHeight, width, proportions[i]);
        currentHeight += barHeight;
    }

}

Automata.prototype.draw = function (ctx) {
    var size = 8;
    for (var i = 0; i < this.dimension; i++) {
        for (var j = 0; j < this.dimension; j++) {
            var cell = this.board[i][j];
            
            color = rgb(Math.min(cell.population * 80),Math.min(cell.population * 80), 0);
            if(this.seedWeight < .25){
                color = "Orange";
            } else if( this.seedWeight > .75){
                color = "Green";
            }
            if(cell.population === 0){
                color = cell.color;
            }
            ctx.fillStyle = color;
            ctx.fillRect(i * size, j * size, size, size);
        }
    }

    /*
    for (var i = 0; i < this.agents.length; i++) {
        ctx.fillStyle = this.agents[i].color;
        ctx.beginPath();
        ctx.arc((this.agents[i].x * size) + (size / 2), (this.agents[i].y * size) + (size / 2), (size / 2), 0, 2 * Math.PI, false);
        ctx.fill();
    }
    */


    //TODO change
    var wheatProportions = [0, 0, 0];
    var wheatColors = ["Black", "Grey", "Yellow"];
    for( var i = 0; i < this.agents.length; i++){
        wheatProportions[this.agents[i].geneticType]++;
    }
    this.draw_graph(graphCtx, 0, 0, wheatProportions, wheatColors);
};

function add(a, b) {
    return a + b;
}


// the "main" code begins here

var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload("./img/960px-Blank_Go_board.png");
ASSET_MANAGER.queueDownload("./img/black.png");
ASSET_MANAGER.queueDownload("./img/white.png");

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');
    graphCtx = document.getElementById('graphWorld').getContext('2d');


    var gameEngine = new GameEngine();
    var automata = new Automata(gameEngine);
    gameEngine.addEntity(automata);
    gameEngine.board = automata;
    gameEngine.init(ctx);
    gameEngine.start();
});
