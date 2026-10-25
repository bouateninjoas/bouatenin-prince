console.log("Hello World" )
alert("bonjour tout le monde comment vous allez ? ");
alert("je suis content de vous voir");
var visitorName = prompt("What's your name : " );
console.log(visitorName)
var accord = confirm("est ce que vous êtes cool avec ça ?" )
console.log(accord)
// NaN
console.log(0 / 0) ;
console.log('Some random string' * 2) ;

// Infini
console.log(1 / 0) ;
console.log(Infinity * Infinity) ;
console.log(1e+309) ;
var num = 0 ;
console.log(num)
num ++
console.log(num)
num --
console.log(num)
// Example 1: (Classic Function Declaration)
function cube(n){    
return n*n*n; 
}
// Example 2: (Function Expression)
var cube = function(n){    
return n*n*n; 
}
console.log(cube(3)) // 27

var add = function(a, b) {
    return a + b;
}
console.log(add(5, 3)); // 8
console.log(add(10, 20)); // 30
