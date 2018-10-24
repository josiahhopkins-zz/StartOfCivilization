function Genetics(){
    this.valueMap = [];
    this.addProperty = function(name, value, the_function){
        this.valueMap[name] = new GeneticProperty(value);
        this.valueMap[name].myFunction= the_function;
    }
}

function GeneticProperty(value, the_function){
    this.value = value;
}

function makeSureValueBetweenZeroAndOne(value){
    if (value < 0){
        return 0;
    } else if (value > 1){ 
        return 1;
    }
    return value;
}