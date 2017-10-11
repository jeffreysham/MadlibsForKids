'use strict';
var Alexa = require("alexa-sdk");
var AWS = require("aws-sdk");
var promisify = require("es6-promisify");
var appId = 'amzn1.ask.skill.16258e7c-8576-410f-bd1b-c3f98b81d460';

var userMap = {}; // Map of user id to madlib story

var docClient = new AWS.DynamoDB.DocumentClient();
var dbGet = promisify(docClient.get, docClient);

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;

    if (!(event.session.user.userId in userMap)) {
        userMap[event.session.user.userId] = 1;
    }
    alexa.registerHandlers(newSessionHandlers, startGameHandlers);
    alexa.execute();
};

var states = {
    GUESSMODE: '_GUESSMODE', // User is prompted to give parts of speech.
    STARTMODE: '_STARTMODE'  // Prompt the user to start or restart the game.
};

var read = function(id) {
    var params = {
        TableName: "MadLibs",
        Key: {
            id: id
        }
    };
    
    dbGet(params)
      .then(data => {
        console.log('Get item succeeded', data);
      })
      .catch(err => console.log(err));
}


var newSessionHandlers = {
    'NewSession': function() {
        this.handler.state = states.STARTMODE;
        read(1);
        this.emit(':ask', 'Welcome to Mad Libs for Kids. Would you like to play?',
            'Say yes to start the game or no to quit.');
    },
    "AMAZON.StopIntent": function() {
      console.log("STOPINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
      console.log("CANCELINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        this.emit(":tell", "Goodbye!");
    }
};


var startGameHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'AMAZON.HelpIntent': function() {
        var message = 'I will first prompt you for a few parts of speech. Afterwards, I will read your newly ' +
            'created story. Do you want to start?';
        this.emit(':ask', message, message);
    },
    'AMAZON.YesIntent': function() {
        read(1);
        this.emit(':ask', 'Great! ' + 'Try saying a number to start the game.', 'Try saying a number.');
    },
    'AMAZON.NoIntent': function() {
        console.log("NOINTENT");
        this.emit(':tell', 'Ok, see you next time!');
    },
    "AMAZON.StopIntent": function() {
      console.log("STOPINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
      console.log("CANCELINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        var message = 'Say yes to continue, or no to end the game.';
        this.emit(':ask', message, message);
    }
});






/*

var newSessionHandlers = {
    'NewSession': function() {
        if(Object.keys(this.attributes).length === 0) {
            this.attributes['endedSessionCount'] = 0;
            this.attributes['gamesPlayed'] = 0;
        }
        this.handler.state = states.STARTMODE;
        this.emit(':ask', 'Welcome to Mad Libs for Kids. You have played '
            + this.attributes['gamesPlayed'].toString() + ' times. would you like to play?',
            'Say yes to start the game or no to quit.');
    },
    "AMAZON.StopIntent": function() {
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
      this.emit(':tell', "Goodbye!");  
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        //this.attributes['endedSessionCount'] += 1;
        this.emit(":tell", "Goodbye!");
    }
};

var startGameHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'NewSession': function () {
        this.emit('NewSession'); // Uses the handler in newSessionHandlers
    },
    'AMAZON.HelpIntent': function() {
        var message = 'I will think of a number between zero and one hundred, try to guess and I will tell you if it' +
            ' is higher or lower. Do you want to start the game?';
        this.emit(':ask', message, message);
    },
    'AMAZON.YesIntent': function() {
        this.attributes["guessNumber"] = Math.floor(Math.random() * 100);
        this.handler.state = states.GUESSMODE;
        this.emit(':ask', 'Great! ' + 'Try saying a number to start the game.', 'Try saying a number.');
    },
    'AMAZON.NoIntent': function() {
        console.log("NOINTENT");
        this.emit(':tell', 'Ok, see you next time!');
    },
    "AMAZON.StopIntent": function() {
      console.log("STOPINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
      console.log("CANCELINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        //this.attributes['endedSessionCount'] += 1;
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        var message = 'Say yes to continue, or no to end the game.';
        this.emit(':ask', message, message);
    }
});

var guessModeHandlers = Alexa.CreateStateHandler(states.GUESSMODE, {
    'NewSession': function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Equivalent to the Start Mode NewSession handler
    },
    'NumberGuessIntent': function() {
        var guessNum = parseInt(this.event.request.intent.slots.number.value);
        var targetNum = this.attributes["guessNumber"];
        console.log('user guessed: ' + guessNum);

        if(guessNum > targetNum){
            this.emit('TooHigh', guessNum);
        } else if( guessNum < targetNum){
            this.emit('TooLow', guessNum);
        } else if (guessNum === targetNum){
            // With a callback, use the arrow function to preserve the correct 'this' context
            this.emit('JustRight', () => {
                this.emit(':ask', guessNum.toString() + 'is correct! Would you like to play a new game?',
                'Say yes to start a new game, or no to end the game.');
        })
        } else {
            this.emit('NotANum');
        }
    },
    'AMAZON.HelpIntent': function() {
        this.emit(':ask', 'I am thinking of a number between zero and one hundred, try to guess and I will tell you' +
            ' if it is higher or lower.', 'Try saying a number.');
    },
    "AMAZON.StopIntent": function() {
        console.log("STOPINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
        console.log("CANCELINTENT");
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        this.attributes['endedSessionCount'] += 1;
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        this.emit(':ask', 'Sorry, I didn\'t get that. Try saying a number.', 'Try saying a number.');
    }
});

// These handlers are not bound to a state
var guessAttemptHandlers = {
    'TooHigh': function(val) {
        this.emit(':ask', val.toString() + ' is too high.', 'Try saying a smaller number.');
    },
    'TooLow': function(val) {
        this.emit(':ask', val.toString() + ' is too low.', 'Try saying a larger number.');
    },
    'JustRight': function(callback) {
        this.handler.state = states.STARTMODE;
        this.attributes['gamesPlayed']++;
        callback();
    },
    'NotANum': function() {
        this.emit(':ask', 'Sorry, I didn\'t get that. Try saying a number.', 'Try saying a number.');
    }
};*/