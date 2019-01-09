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
                },
                herbivores: true,
                carnivores: true,
                humans: true
            };

var stats = {
            humans: 0,
            wheat: 0,
            herbivores: 0,
            carnivores: 0};

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
    this.calories = 2000;

    Entity.call(this, game, x, y);
}

Animal.prototype = new Entity();

var Carnivore = function(game, x, y, Carnivore){
   

    Animal.call(this, game, x, y);
    this.color = "Orange";
    this.calories = 16000;
}   


Carnivore.prototype.update = function(){
    if(!this.game.board.board[this.x][this.y].animalPopulation.carnivores.has(this)){
        this.game.board.board[this.x][this.y].animalPopulation.carnivores.add(this);
    }
    var newLocation = this.chooseMove();
    this.nextX = newLocation.x;
    this.nextY = newLocation.y;
    this.calories = Math.min(16000, this.calories - 350);
    this.dead = this.dead || this.calories < 0;
    if(this.dead){
        this.game.board.board[this.x][this.y].animalPopulation.carnivores.delete(this);
    } else {//if(this.calories == 4000) {
        if(Math.random() < 0.02){
            var theChild = new Carnivore(this.game, this.x, this.y, this);
            this.game.babyAnimals.push(theChild);
        }
    }
}

Carnivore.prototype.move = function(){
    this.game.board.board[this.x][this.y].animalPopulation.carnivores.delete(this);
    this.x = this.nextX;
    this.y = this.nextY;
    this.game.board.board[this.x][this.y].animalPopulation.carnivores.add(this);
}

Carnivore.prototype.chooseMove = function(){
    var myBoard = this.game.board.board;
    myBoard[this.x][this.y].animalPopulation.carnivores.delete(this); //SUPER HACKY
    var possibleCells = getCurrentAndAdjacent(this.x, this.y);
    var starter = randomInt(possibleCells.length);
    var best = possibleCells[starter];
    possibleCells.splice(starter, 1);
    var ties = [];
    for(var coordinateSet = 1; coordinateSet < possibleCells.length; coordinateSet++){
        if(myBoard[best.x][best.y].animalPopulation.herbivores.size < myBoard[possibleCells[coordinateSet].x][possibleCells[coordinateSet].y].animalPopulation.herbivores.size){
            best = possibleCells[coordinateSet];
            ties = [];
        } else if(myBoard[best.x][best.y].animalPopulation.herbivores.size == myBoard[possibleCells[coordinateSet].x][possibleCells[coordinateSet].y].animalPopulation.herbivores.size &&
            myBoard[best.x][best.y].animalPopulation.carnivores.size < myBoard[possibleCells[coordinateSet].x][possibleCells[coordinateSet].y].animalPopulation.carnivores.size){
                best = possibleCells[coordinateSet];
                ties = [];
        } else if (randomInt(2) == 0 && myBoard[best.x][best.y].animalPopulation.herbivores.size == myBoard[possibleCells[coordinateSet].x][possibleCells[coordinateSet].y].animalPopulation.herbivores.size &&
            myBoard[best.x][best.y].animalPopulation.carnivores.size == myBoard[possibleCells[coordinateSet].x][possibleCells[coordinateSet].y].animalPopulation.carnivores.size){
                ties.push(possibleCells[coordinateSet]);
            }
        if(ties.length > 0){
            ties.push(best);
            best = ties[randomInt(ties.length)];
        }
    }
    
    myBoard[this.x][this.y].animalPopulation.carnivores.add(this); //SUPER HACKY
    return best;
    /*
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
    */
}

Carnivore.prototype.postMoveAction = function(){
    var currentCell = this.game.board.board[this.x][this.y];
    var availableHerbivores = currentCell.animalPopulation.herbivores;
    if(availableHerbivores.size > 0){
        var toEat = availableHerbivores.values().next().value;
        availableHerbivores.delete(toEat);
        this.calories += toEat.calories;
        toEat.dead = true;
    }
}

var Human = function(game, x, y, Human){
    Carnivore.call(this, game, x, y);
    this.color = "Brown";
    this.calories = 16000;
    stats.humans++;
}   

Human.prototype.update = function(){
    if(!this.game.board.board[this.x][this.y].animalPopulation.humans.has(this)){
        this.game.board.board[this.x][this.y].animalPopulation.humans.add(this);
    }
    var newLocation = this.chooseMove();
    this.nextX = newLocation.x;
    this.nextY = newLocation.y;
    this.calories = Math.min(16000, this.calories - 750);
    this.dead = this.dead || this.calories < 0;
    if(this.dead){
        this.game.board.board[this.x][this.y].animalPopulation.humans.delete(this);
        stats.humans--;
    } else {//if(this.calories == 4000) {
        if(Math.random() < 0.02){
            var theChild = new Human(this.game, this.x, this.y, this);
            this.game.babyAnimals.push(theChild);
        }
    }
}

Human.prototype.move = function(){
    this.game.board.board[this.x][this.y].animalPopulation.humans.delete(this);
    this.x = this.nextX;
    this.y = this.nextY;
    this.game.board.board[this.x][this.y].animalPopulation.humans.add(this);
}

function humanMovePriority(wheatCount, herbivoreCount, wolfCount, humanCount, water, calories, thirst){
    if(wheatCount === 0 && herbivoreCount === 0){ 
        return -10000000;
    } else {
        return ((wheatCount + herbivoreCount) - humanCount) * (humanCount);
    }
}

Human.prototype.chooseMove = function(){
    var myBoard = this.game.board.board;
    myBoard[this.x][this.y].animalPopulation.humans.delete(this); //SUPER HACKY
    var possibleCells = getCurrentAndAdjacent(this.x, this.y);
    var starter = randomInt(possibleCells.length);
    var best = possibleCells[starter];
    var bestCell = myBoard[possibleCells[starter].x][possibleCells[starter].y];
    var bestValue = humanMovePriority(bestCell.wheat.size, bestCell.animalPopulation.herbivores.size, bestCell.animalPopulation.carnivores.size
                                        , bestCell.animalPopulation.humans.size, bestCell.water, this.calories, this.hydration);
    possibleCells.splice(starter, 1);
    var ties = [];
    for(var coordinateSet = 1; coordinateSet < possibleCells.length; coordinateSet++){
        var nextCell = myBoard[possibleCells[coordinateSet].x][possibleCells[coordinateSet].y];
        var nextValue = humanMovePriority(nextCell.wheat.size, nextCell.animalPopulation.herbivores.size, nextCell.animalPopulation.carnivores.size
            , nextCell.animalPopulation.humans.size, nextCell.water, this.calories, this.hydration);
        if(nextValue > bestValue){
            bestValue = nextValue;
            best = possibleCells[coordinateSet];
        }
    }
    
    myBoard[this.x][this.y].animalPopulation.humans.add(this); //SUPER HACKY
    return best;
    /*
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
    */
}

Human.prototype.postMoveAction = function(){
    var currentCell = this.game.board.board[this.x][this.y];
    var availableHerbivores = currentCell.animalPopulation.herbivores;
    if(availableHerbivores.size > 0){
        var toEat = availableHerbivores.values().next().value;
        availableHerbivores.delete(toEat);
        this.calories += toEat.calories;
        toEat.dead = true;
    }

    var availableWheat = currentCell.wheat;
    if(availableWheat.size > 0){
        var toEat = availableWheat.values().next().value;
        availableWheat.delete(toEat);
        this.calories += toEat.calories;
        toEat.spread();
    }
}

var Herbivore = function(game, x, y, Herbivore){
   

    Animal.call(this, game, x, y);
    this.color = "Purple";
    this.calories = 4000;
}   

Herbivore.prototype.update = function(){
    if(!this.game.board.board[this.x][this.y].animalPopulation.herbivores.has(this)){
        this.game.board.board[this.x][this.y].animalPopulation.herbivores.add(this);
    }
    var newLocation = this.chooseMove();
    this.nextX = newLocation.x;
    this.nextY = newLocation.y;
    this.calories = Math.min(4000, this.calories - 350);
    this.dead = this.dead || this.calories < 0;
    if(this.dead){
        this.game.board.board[this.x][this.y].animalPopulation.herbivores.delete(this);
    } else {//if(this.calories == 4000) {
        if(this.calories == 4000 && Math.random() < 0.5){
            var theChild = new Herbivore(this.game, this.x, this.y, this);
            this.calories = 2000;
            this.game.babyAnimals.push(theChild);
        }
    }
}

Herbivore.prototype.move = function(){
    this.game.board.board[this.x][this.y].animalPopulation.herbivores.delete(this);
    this.x = this.nextX;
    this.y = this.nextY;
    this.game.board.board[this.x][this.y].animalPopulation.herbivores.add(this);
}

Herbivore.prototype.chooseMove = function(){
    var myBoard = this.game.board.board;
    myBoard[this.x][this.y].population -= 1; //SUPER HACKY
    var possibleCells = getCurrentAndAdjacent(this.x, this.y);
    var starter = randomInt(possibleCells.length);
    var best = possibleCells[starter];
    possibleCells.splice(starter, 1);
    for(var coordinateSet = 1; coordinateSet < possibleCells.length; coordinateSet++){
        if(myBoard[best.x][best.y].wheat.size < myBoard[possibleCells[coordinateSet].x][possibleCells[coordinateSet].y].wheat.size){
            best = possibleCells[coordinateSet];
        } else if(myBoard[best.x][best.y].wheat.size == myBoard[possibleCells[coordinateSet].x][possibleCells[coordinateSet].y].wheat.size &&
            myBoard[best.x][best.y].animalPopulation.herbivores.size < myBoard[possibleCells[coordinateSet].x][possibleCells[coordinateSet].y].animalPopulation.herbivores.size){
                best = possibleCells[coordinateSet];
        }
    }
    
    myBoard[this.x][this.y].population += 1; //SUPER HACKY
    return best;
    /*
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
    */
}

Herbivore.prototype.postMoveAction = function(){
    var currentCell = this.game.board.board[this.x][this.y];
    var availableWheat = currentCell.wheat;
    if(availableWheat.size > 0){
        var toEat = availableWheat.values().next().value;
        availableWheat.delete(toEat);
        this.calories += toEat.calories;
        toEat.spread();
    }
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
    this.calories = 1000;

    this.dropDistance = this.calcDropDistance();
    this.numOfSeeds = this.calcSeedDrop();
    this.reproductionAge = this.calcReproductionAge();
    this.maxAge = settings.wheat.MaxAge;

    Entity.call(this, game, x, y);
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
        if(cell.water > 0 && (Math.random() > 0.02 * cell.wheat.size * cell.wheat.size)){
            this.isSeed = false;
            cell.water -= 1;
            this.game.board.board[this.x][this.y].wheat.add(this);
            this.game.statistics.wheatTypeCount[this.geneticType]++;
        }
        else if(Math.random() < seedHardiness){
            this.dead = true;
            this.game.board.board[this.x][this.y].wheat.delete(this);
        }
    } else{
        this.age++;
        cell.water -= 1;
        // did I die?
        if (Math.random() < 0.02 * cell.wheat.size * cell.wheat.size && this.age > this.reproductionAge) {
            this.spread();
        } 
        //Dying of thirst prevents reproduction
        else if (cell.water < 1){
            this.dead = true; 
            removeWheatInBucket(this.game, this.seedWeight);
        }
    }
    if(!this.isSeed && this.dead){
        this.game.board.board[this.x][this.y].wheat.delete(this);
    }
}

Agent.prototype.spread = function(){
    this.dead = true;
    this.game.board.board[this.x][this.y].population -= 1;
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
    this.animalPopulation.carnivores = new Set();
    this.animalPopulation.humans = new Set();
    
    this.color = "Grey";
}

Cell.prototype.addWheat = function(theWheat){

}

Cell.prototype.removeWheat = function(theWheat){

}

Cell.prototype.addAnimal = function(theAnimal){
    
}

Cell.prototype.removeAnimal = function(theAnimal){
    
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

Cell.prototype.printStats = function(){
    console.log("Water = " + this.water);
    console.log("Herbivore size  = " + this.animalPopulation.herbivores.size);
    console.log("Wheat = " + this.wheat.size);
    console.log("x = " + this.x + " y = " + this.y);
}

Cell.prototype.getContents = function(){
    var toReturn = {};
    toReturn.wheat = this.wheat;
    toReturn.herbivores = this.herbivores;
    return toReturn;
}

function getCurrentAndAdjacent (x, y){
    var toReturn = [];
    for(var i = -1; i < 2; i ++){
        var currentX = i + x;
        if(currentX >= 0 && currentX < settings.boardSize){
            for(var j = -1; j < 2; j++){
                var currentY = j + y;
                if(currentY >= 0 && currentY < settings.boardSize){
                    var toAdd = {x: currentX, y: currentY};
                    toReturn.push(toAdd);
                }
            }
        }
    }
    return toReturn;
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
    this.populationSize = 1000;
    this.animalPopulationSize = 50;
    this.agents = [];
    game.babies = [];
    this.animals =[];
    game.babyAnimals = [];
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
                var waterLevelForDistance = settings.floodDistance - addingWater;
                if(left && !left.isRiver){
                    if(addingWater < settings.floodDistance){
                        left.water += waterLevelForDistance;
                    } 
                    left.waterDistance = Math.min(addingWater, addingWater);
                    //left.color = "Orange";
                    //console.log("Added " + left.water + " To orange");
                }
                if(right && !right.isRiver){
                    if(addingWater < settings.floodDistance){
                        right.water += waterLevelForDistance;
                    } 

                    right.waterDistance = addingWater;
                    //right.color = "Green";
                    //console.log("Added " + right.water + " To green");
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
        }
    }

    // add agents
    for(var i = 0; i < this.animalPopulationSize; i++) {
        if(settings.herbivores){
            var x = randomInt(this.dimension);
            var y = randomInt(this.dimension);
            var animal = new Herbivore(game, x, y);
            this.animals.push(animal);
        }

        if(settings.carnivores){
            var x = randomInt(this.dimension);
            var y = randomInt(this.dimension);
            animal = new Carnivore(game, x, y);
            this.animals.push(animal);
        }

        if(settings.humans){
            var x = randomInt(this.dimension);
            var y = randomInt(this.dimension);
            animal = new Human(game, x, y);
            this.animals.push(animal);
        }
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
    for (var i = 0; i < this.animals.length; i++) {
        this.animals[i].postMoveAction();
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
    for (var i = this.game.babyAnimals.length - 1; i >= 0; i--){
        this.animals.push(this.game.babyAnimals.pop());
    }
    this.game.babyAnimals = [];

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
    // console.log(this.game.gameController.floodSeason);
    // console.log(this.game.statistics.wheatTypeCount);
    console.log("Human count: " + stats.humans);
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
            //console.log(cell.wheat.size);
            
            color = rgb(Math.min(cell.wheat.size * 80),Math.min(cell.wheat.size * 80), 0);
            if(cell.wheat.size === 0){
                color = cell.color;
            }
            ctx.fillStyle = color;
            ctx.fillRect(i * size, j * size, size, size);
        }
    }

    //console.log(this.animals.length);
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