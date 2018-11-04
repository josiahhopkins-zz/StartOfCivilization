var graphCtx = null;

function defaultFunction(value){
    var bit = randomInt(2);
    toReturn = value + Math.pow(-1, bit) * Math.random() * 0.1;
    return makeSureValueBetweenZeroAndOne(toReturn);
}

var settings = {    
                boardSize: 100,
                drawingWidth: 8,
                floodDistance: 11,
                maxWater: 20,
                wheat: {
                    maxAge: 50,
                    maxDropDistance: 6,
                    baseReproductionAge: 15,
                    wheatColors: ["Black", "Grey", "Yellow"]
                }
            };

function getGameControl(game){
    var toReturn = game.gameController;
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
    this.gene = new Genetics();
    if(agent){
        for(var key in agent.gene.valueMap){
            var parentValue = agent.gene.valueMap[key];
            this.gene.addProperty(key, parentValue.myFunction(parentValue.value), parentValue.myFunction)
        }
    } else {
        this.gene.addProperty("seedWeight", .5, defaultFunction);
    }
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

    this.dropDistance = this.calcDropDistance();
    this.numOfSeeds = this.calcSeedDrop();
    this.reproductionAge = this.calcReproductionAge();
    this.maxAge = settings.wheat.MaxAge;

    Entity.call(this, game, x, y);
}
Animal.prototype.mutate = function(animal) {
    return animal.genome;
}
function Animal(game, x, y, animal){
    this.gene = new Genetics();
    if(animal){
        for(var key in animal.gene.valueMap){
            var parentValue = animal.gene.valueMap[key];
            if(typeof parentValue.myFunction !== 'function'){
                console.log("Not a function");
            }
            this.gene.addProperty(key, parentValue.myFunction(parentValue.value), parentValue.myFunction)
        }
    } else {
        this.gene.addProperty("unexpressedGene", .5, defaultFunction);
    }
    this.color = "Magenta";
    this.age = 0;
    //this.genome = mutate(animal.genome)
    this.hydration = 1;
    this.fullness = 1;
    this.x = x;
    this.y = y;
    this.dead = false;

    Entity.call(this, game, x, y);
}

Animal.prototype = new Entity();

var Herbivore = function(game, x, y, Herbivore){
    Animal.call(this, game, x, y);
    this.color = "Purple";
    this.calories = 4000;
}   

Herbivore.prototype.update = function(){
    this.game.board.board[this.x][this.y].animalPopulation.herbivores.add(this);
    var newLocation = this.chooseMove();
    this.nextX = newLocation.x;
    this.nextY = newLocation.y;
    this.calories = Math.min(4000, this.calories - 400);
    this.dead = this.dead || this.calories < 0;
    if(this.dead){
        this.game.board.board[this.x][this.y].wheat.delete(this);
    }
}

Herbivore.prototype.move = function(){
    this.x = this.nextX;
    this.y = this.nextY;
}

Herbivore.prototype.chooseMove = function(){
    var changeX = randomInt(3) - 1;
    var changeY = randomInt(3) - 1;
    var toReturn = {};
    toReturn.x = this.x + changeX;
    toReturn.y = this.y + changeY;
    if(toReturn.x < 0 || toReturn.x >= settings.boardSize){
        toReturn.x = this.x;
    }
    if(toReturn.y < 0 || toReturn.y >= settings.boardSize){
        toReturn.y = this.y;
    } 
    return toReturn;
}




Agent.prototype = new Entity();
Agent.prototype.constructor = Agent;

Agent.prototype.calcDropDistance = function(){
    return Math.floor(this.seedWeight * settings.wheat.maxDropDistance) + 1;
}

Agent.prototype.calcSeedDrop = function(){
    return 2;
}

Agent.prototype.calcReproductionAge = function(){
    return settings.wheat.baseReproductionAge * this.seedWeight;
}

Agent.prototype.update = function () {
    var cell = this.game.board.board[this.x][this.y];
    var seedHardiness = this.seedWeight * this.seedWeight;

    if(this.isSeed){
        if(cell.water > 0 && (Math.random() > 0.02 * cell.population * cell.population)){
            this.isSeed = false;
            cell.population++;
            cell.water -= 1;
            this.game.board.board[this.x][this.y].wheat.add(this);
            this.game.statistics.wheatTypeCount[this.geneticType]++;
        }
        else if(Math.random() < seedHardiness){
            this.dead = true;
        }
    } else{
        this.age++;
        cell.water -= 1;
        // did I die?
        if (Math.random() < 0.02 * cell.population * cell.population && this.age > this.reproductionAge) {
            this.dead = true;
            cell.population -= 1;
            for(var i = 0; i < this.numOfSeeds; i++){
                var newX = Math.floor((this.x + randomInt(this.dropDistance) - (this.dropDistance / 2) + this.game.board.dimension) % this.game.board.dimension);
                var newY = Math.floor((this.y + randomInt(this.dropDistance) - (this.dropDistance / 2) + this.game.board.dimension) % this.game.board.dimension);
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
    if(!this.isSeed && this.dead){
        this.game.board.board[this.x][this.y].wheat.delete(this);
    }
}

function Cell(game,x,y) {
    this.x = x;
    this.y = y;
    this.scent = {};
    this.game = game;
    this.isRiver = false;
    this.water = 0;
    this.waterDistance=-1;
    this.seedCount = 0;

    this.population = 0;
    this.wheat = new Set();
    this.animalPopulation = {};
    this.animalPopulation.herbivores = new Set();
    

    this.color = "Grey";
}

Cell.prototype = new Entity();
Cell.prototype.constructor = Cell;

Cell.prototype.update = function () {

    maxWater = settings.maxWater; 
    /*
    This should replenish or deplete resources as necessary on each turn update. Resource determining factors will all be under gameControll object
    */
   if(this.waterDistance > 0 && this.water < maxWater){
        var waterDistance = settings.floodDistance;
        if(this.game.gameController.floodSeason){
            //Replenish during flood season. Should double water and have water table extend to a further range as determined by a cells 
            //riverdistance
            if(this.waterDistance < waterDistance){
                this.water += (waterDistance - this.waterDistance);
                this.water = Math.min(this.water, maxWater);
            }
        } else {
            //Standard replenishment. Note that the rate of flooding is determined in the gameengine update function.
            waterDistance = Math.floor(waterDistance / 2);
            if(this.waterDistance < waterDistance){
                this.water += (waterDistance - this.waterDistance);
                this.water = Math.min(this.water, maxWater);
            }
        }
    }

    //updateScent(this.scent);
}

/*
Binary search is better but when the array is of length 3 this works. As we add more genetic factors and try to speciate more we will
Have to implement better solutions. We will pull this code out into the genetics class.
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
    this.animalPopulationSize = 50;
    this.agents = [];
    game.babies = [];
    this.animals =[];
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
            for(var addingWater = 1; addingWater < settings.floodDistance; addingWater++){
                var left = this.board[currentRiverTilesInRow[placement] - addingWater][i]
                var right = this.board[currentRiverTilesInRow[placement] + addingWater][i]
                if(left && !left.isRiver){
                    if(addingWater < settings.floodDistance){
                        left.water += settings.floodDistance - addingWater;
                    } 
                    left.waterDistance = Math.min(addingWater, addingWater);
                }
                if(right && !right.isRiver){
                    if(addingWater < settings.floodDistance){
                        right.water += settings.floodDistance - addingWater;
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

        if(!this.board[x][y].isRiver){
            var agent = new Agent(game, x, y);
            this.agents.push(agent);
            this.board[x][y].population += 1;
        }
    }

    // add agents
    while (this.animals.length < this.animalPopulationSize) {
        var x = randomInt(this.dimension);
        var y = randomInt(this.dimension);

        var animal = new Herbivore(game, x, y);
        this.animals.push(animal);
    }
    

    Entity.call(this, game, 0, 0);
};

Automata.prototype = new Entity();
Automata.prototype.constructor = Automata;

Automata.prototype.update = function () {
    for (var i = 0; i < this.animals.length; i++) {
        this.animals[i].update();
    }
    for (var i = this.animals.length - 1; i >= 0; i--) {
        this.animals[i].move();
        if(this.animals[i].dead){
            this.animals.splice(i, 1);
        }
    }

    for (var i = this.agents.length - 1; i >= 0; i--) {
        this.agents[i].update();
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
    width = settings.drawingWidth;
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
    var size = settings.drawingWidth;
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

    
    for (var i = 0; i < this.animals.length; i++) {
        ctx.fillStyle = this.animals[i].color;
        ctx.beginPath();
        ctx.arc((this.animals[i].x * size) + (size / 2), (this.animals[i].y * size) + (size / 2), (size / 2), 0, 2 * Math.PI, false);
        ctx.fill();
    }
    


    var wheatProportions = [0, 0, 0];
    for( var i = 0; i < this.agents.length; i++){
        wheatProportions[this.agents[i].geneticType]++;
    }
    this.draw_graph(graphCtx, 0, 0, wheatProportions, settings.wheat.wheatColors);
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