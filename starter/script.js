'use strict';
/*
let hasDriverslicense = false;
const passTest = true;
if (passTest) hasDriverslicense = true;
if (hasDriverslicense) console.log(' i can drive');

const interface = 'Audio';


function logger() {
  console.log('my name is Jonas');
}

logger();

function fruitProcessor(apples, oranges) {
  console.log(apples, oranges);
  const juice = `juice with ${apples} apples and ${oranges} oranges`;
  return juice;
}
const appleJuice = fruitProcessor(5, 0);
console.log(appleJuice);
const appleOrangeJuice = fruitProcessor(2, 4);
console.log(appleOrangeJuice);
console.log(fruitProcessor(5, 0));

const num = Number('23');

const calcAge3 = (birthYear) => 2037 - birthYear;
const age3 = calcAge3(1991);
console.log(age3);

//Arrow function 


const yearsUntilRetirement = (birthYear, firstName) => {
  const age = 2037 - birthYear;
  const retirement = 65 - age;
  //return retirement;
  return `${firstName} retires in ${retirement} years`;
};
console.log(yearsUntilRetirement(1991, 'Jonas'));
console.log(yearsUntilRetirement(1980, 'Jonas'));

function cutFruitPieces(fruit) {
  return fruit * 4;
}
function fruitProcessor(apple, oranges) {
  const applePieces = cutFruitPieces(apple);
  const orangePieces = cutFruitPieces(oranges);

  const juice = `Juice with ${applePieces} apples and ${orangePieces} oranges`;
  return juice;
}
console.log(fruitProcessor(2, 3));

const calcAge = function (birthYear) {
  return 2037 - birthYear;
};

const yearsUntilRetirement = function (birthYear, firstName) {
  const age = calcAge(birthYear);
  const retirement = 65 - age;

  if (retirement > 0) {
    return retirement;
  } else {
    return -1;
  }
};
yearsUntilRetirement(1991, 'Jonas');
console.log(yearsUntilRetirement(1991, 'Jonas'));
console.log(yearsUntilRetirement(1970, 'Mike'));


const calcAge = function (birthYear) {
  return 2022 - birthYear;
};

const tiyasBirthday = (birthYear, firstName) => {
  const age = calcAge(birthYear);
  if (age >= 18) {
    return `Congratulations, ${firstName} you are ${age} if you know how to count and you can Drive and do people ;)`;
  } else {
    return `Sorry ${firstName} you are too young to do aything ;)`;
  }
};
console.log(tiyasBirthday(2004, 'Tiya'));
console.log(tiyasBirthday(2005, 'Tiya'));


coding challenge 1

const calcAge1 = (score1, score2, score3) => {
  const avgDolphins = (score1 + score2 + score3) / 3;
  return avgDolphins;
};

const calcAge2 = (score1, score2, score3) => {
  const avgKoalas = (score1 + score2 + score3) / 3;
  return avgKoalas;
};
console.log(calcAge1(44, 23, 71));
console.log(calcAge2(65, 54, 49));

const checkWinner = (winner) => {
  if (calcAge1 >= 2 * calcAge2) {
    return `The winner is Dolphins`;
  } else if (calcAge2 >= 2 * calcAge1) {
    return `the koalas are the winners`;
  } else {
    return `There is no winner!`;
  }
};
console.log(checkWinner);


answer

const calcAverage = (a, b, c) => (a + b + c) / 3;
console.log(calcAverage(3, 4, 5));

const scoreDolphins = calcAverage(44, 23, 71);
const scoreKoalas = calcAverage(65, 54, 49);

const checkWinner = function (avgDolphins, avgKoalas) {
  if (avgDolphins >= 2 * avgKoalas) {
    console.log(`dolphins win the trophy`);
  } else if (avgKoalas >= 2 * avgDolphins) {
    console.log(`Koalas win the trophy`);
  } else {
    console.log(`No team wins`);
  }
};
checkWinner(scoreDolphins, scoreKoalas);

//array

const friends = ['michael', 'steven', 'Peter'];
console.log(friends);

const y = new Array(1991, 1984, 2008, 2020);
console.log(y);

console.log(friends[0]);
console.log(friends[2]);

console.log(friends.length);
console.log(friends[friends.length - 1]);

friends[2] = 'Jay';
console.log(friends);
const firstName = 'Jonas';
const jonas = [firstName, 'Schmedtmann', 2037 - 1991, friends];
console.log(jonas);

//Exercise
const calcAge = function (birthYear) {
  return 2037 - birthYear;
};
const years = [1990, 1967, 2002, 2010, 2020];
console.log(calcAge(years));

const ages = [];

const friends = ['michael', 'steven', 'Peter'];
const newLength = friends.push('Jay');//add at the end
console.log(friends);

friends.unshift('John'); // add elements to the array
console.log(friends);

friends.pop(); // removes the last elemnt
const popped = friends.pop();
console.log(popped);
console.log(friends);

friends.shift(); // remove elemnts in the array

console.log(friends.indexOf('steven'));
console.log(friends.indexOf('Bob'));

friends.push(23);
console.log(friends.includes('steven'));
console.log(friends.includes(23));

if (friends.includes('steven')) {
  console.log('You have a friend called steven');
}


//coding challenge
const bill = 430;
let tip;
bill <= 300 && bill >= 50 ? (tip = bill * 0.15) : (tip = bill * 0.2);

const calcTip = (bill) => {
  if (bill <= 300 && bill >= 50) {
    return (tip = bill * 0.15);
  } else {
    return (tip = bill * 0.2);
  }
};
const calcTotal = (bill) => {
  if (bill <= 300 && bill >= 50) {
    tip = bill * 0.15;
  } else {
    tip = bill * 0.2;
  }
  return tip + bill;
};
console.log(calcTip(100));

const bills = [calcTip(100), calcTip(125), calcTip(555), calcTip(44)];
console.log(bills);

const Total = [calcTotal(100), calcTotal(125), calcTotal(555), calcTotal(44)];
console.log(Total);


//object
const jonas = {
  firstName: 'Parth',
  lastName: 'Borole',
  age: 2022 - 2004,
  job: 'student',
  friends: ['Michael', 'Tanmay', 'Neerja'],
};
console.log(jonas);

console.log(jonas.lastName);
console.log(jonas['lastName']);

const nameKey = 'Name';
console.log(jonas['first' + nameKey]);
console.log(jonas['last' + nameKey]);

// const interestedIn = prompt(
//   'What do you want to know about Parth? Choose between firstName, lastName, age, job, and his friends'
// );

// if (jonas[interestedIn]) {
//   console.log(jonas[interestedIn]);
// } else {
//   console.log(
//     'Wrong request! Please Choose between firstName, lastName, age, job, and his friends '
//   );
//}
jonas.location = 'Portugal';
jonas['twitter'] = '@Parthborole';
console.log(jonas);

//challenge
//'Jonas has three friends, and his best friend is michael
console.log(jonas.friends[0]);

console.log(
  `${jonas.firstName} has ${jonas.friends.length} friends, and his best friends is called  ${jonas.friends[0]}`
);

const jonas = {
  firstName: 'Jonas',
  lastName: 'Schmedtmann',
  birthYear: 1991,
  job: 'teacher',
  friends: ['Michael', 'Tanmay', 'Neerja'],
  hasDriversLicense: true,

    calcAge: function () {
      console.log(this);
      return 2037 - this.birthYear;
    },
  };
  calcAge: function () {
    this.age = 2037 - this.birthYear;
    return this.age;
  },
  getSummary: function () {
    return `${this.firstName} is a ${this.calcAge()} year old ${
      jonas.job
    }, and he has ${this.hasDriversLicense ? `a` : `no`} driver's license`;
  },
};

console.log(jonas.calcAge(jonas.birthYear));

console.log(jonas.age);
console.log(jonas.age);
console.log(jonas.age);
// 'Jonas is a 46 year old teacher, and he has a drivers license

// if (jonas.hasDriversLicense === true) {
//   console.log(
//     `${jonas.firstName} is a ${jonas.age} year old ${jonas.job}, and has a drivers license`
//   );
// } else {
//   console.log(
//     `${jonas.firstName} is a ${jonas.age} year old ${jonas.job}, and has no drivers license`
//   );
// }
console.log(jonas.getSummary());
*/
// const massMark = 95;
// const heightMark = 1.88;

// const BMI = massMark / heightMark ** 2;
// console.log(BMI);

// const johnMass = 85;
// const johnHeight = 1.76;
// const johnBMI = johnMass / (johnHeight * johnHeight);

const markObject = {
  fullName: 'Mark Miller',
  mass: 78,
  height: 1.69,
  calcBMI: function () {
    this.markBMI = this.mass / (this.height * this.height);
    return this.markBMI;
  },
};

const johnObject = {
  fullName: 'John Smith',
  mass: 92,
  height: 1.95,
  calcAge: function () {
    this.johnBMI = this.mass / (this.height * this.height);
    return this.johnBMI;
  },
};
if (markObject.markBMI > johnObject.johnBMI) {
  console.log(
    `${markObject.fullName}(${markObject.calcBMI()}) BMI is higher than ${
      johnObject.fullName
    } (${johnObject.calcAge()})`
  );
} else {
  console.log(
    `${johnObject.fullName}(${johnObject.calcAge()}) BMI is higher than ${
      markObject.fullName
    } (${markObject.calcBMI()})`
  );
}
