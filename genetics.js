function Genetics(){
    this.valueMap = [];
    this.addProperty = function(name, value, the_function){
        this.valueMap.name = GeneticProperty(value, the_function);
    }
}

function GeneticProperty(value, the_function){
    this.value = value;
    this.myFunction = the_function;
}

function defaultFunction(value){
    var bit = randomInt(2);
    toReturn = value + Math.pow(-1, bit) * Math.random() * 0.1;
    makeSureValueBetweenZeroAndOne(toReturn);
}

function makeSureValueBetweenZeroAndOne(value){
    if (value < 0){
        return 0;
    } else if (value > 1){ 
        return 1;
    }
    return value;
}