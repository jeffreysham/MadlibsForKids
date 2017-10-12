'use strict';
var Alexa = require("alexa-sdk");
var fs = require("fs");
var appId = 'amzn1.ask.skill.16258e7c-8576-410f-bd1b-c3f98b81d460';

var userMap = {}; // Map of user id to madlib story index
var userDataMap = {}; // Map of user id to madlib story data
var dataJson;

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;

    if (!(event.context.System.user.userId in userMap)) {
        userMap[event.context.System.user.userId] = 0;
    }

    readWholeFile();

    alexa.registerHandlers(newSessionHandlers, startGameHandlers, promptGameHandlers);
    alexa.execute();
};

var states = {
    PROMPTMODE: '_PROMPTMODE', // User is prompted to give parts of speech.
    STARTMODE: '_STARTMODE'  // Prompt the user to start or restart the game.
};

var readWholeFile = function() {
    var allData = fs.readFileSync("data.json");
    dataJson = JSON.parse(allData);
}

var initializeUserData = function(index, event) {
    if (index >= dataJson.length) {
        index = 0;
        userMap[event.context.System.user.userId] = 0;
    }

    userDataMap[event.context.System.user.userId] = dataJson[index];
}

var newSessionHandlers = {
    'NewSession': function() {
        this.handler.state = states.STARTMODE;
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
    'NewSession': function () {
        this.emit('NewSession'); // Uses the handler in newSessionHandlers
    },
    'AMAZON.HelpIntent': function() {
        var message = 'I will first prompt you for a few parts of speech. Afterwards, I will read your newly ' +
            'created story. Do you want to start?';
        this.emit(':ask', message, message);
    },
    'AMAZON.YesIntent': function() {
        initializeUserData(userMap[this.event.context.System.user.userId], this.event);
        this.handler.state = states.PROMPTMODE;

        var partOfSpeech = userDataMap[this.event.context.System.user.userId].partsOfSpeech[0];
        partOfSpeech = partOfSpeech.replace(/[<>]/g, "");
        var article = getArticle(partOfSpeech);
        this.emit(':ask', 'Great! Try saying ' + article + ' ' + partOfSpeech + ' to start the game.', 'Try saying ' + article + ' ' + partOfSpeech + '.');
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

var promptGameHandlers = Alexa.CreateStateHandler(states.PROMPTMODE, {
    'NewSession': function () {
        this.handler.state = '';
        this.emit('NewSession'); // Uses the handler in newSessionHandlers
    },
    'PartOfSpeechIntent': function() {
        var partsOfSpeech = userDataMap[this.event.context.System.user.userId].partsOfSpeech;
        var content = userDataMap[this.event.context.System.user.userId].content;
        var title = userDataMap[this.event.context.System.user.userId].title;

        var partOfSpeech = partsOfSpeech[0];
        var userInput = this.event.request.intent.slots.partOfSpeech.value;
        content = content.replace(partOfSpeech, userInput);
        partsOfSpeech.shift();
        userDataMap[this.event.context.System.user.userId].content = content;
        userDataMap[this.event.context.System.user.userId].partsOfSpeech = partsOfSpeech;

        if (partsOfSpeech.length > 0) {
            var partOfSpeech = userDataMap[this.event.context.System.user.userId].partsOfSpeech[0];
            partOfSpeech = partOfSpeech.replace(/[<>]/g, "");
            var article = getArticle(partOfSpeech);
            var excitingResponse = getExcitingResponse();
            this.emit(':ask', excitingResponse + ' Say ' + article + ' ' + partOfSpeech, 'Try saying ' + article + ' ' + partOfSpeech + '.');
        } else {
            var message = 'Awesome! Now we can listen to your newly created story. The title is ';
            message += title + '. ' + content;
            message += ' Would you like to do another mad lib?';
            this.handler.state = states.STARTMODE;
            userMap[this.event.context.System.user.userId]++;
            this.emit(':ask', message, 'Would you like to do another mad lib?');
        }
    },
    'AMAZON.HelpIntent': function() {
        var partsOfSpeech = userDataMap[this.event.context.System.user.userId].partsOfSpeech;

        if (partsOfSpeech.length > 0) {
            var partOfSpeech = partsOfSpeech[0];
            partOfSpeech = partOfSpeech.replace(/[<>]/g, "");
            var article = getArticle(partOfSpeech);
            this.emit(':ask', 'Please say ' + article + ' ' + partOfSpeech, 'Try saying ' + article + ' ' + partOfSpeech + '.');
        } else {
            this.emit(':ask', 'Would you like to do another mad lib?', 'Would you like to do another mad lib?');
        }
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
        var partsOfSpeech = userDataMap[this.event.context.System.user.userId].partsOfSpeech;
        if (partsOfSpeech.length > 0) {
            var partOfSpeech = partsOfSpeech[0];
            partOfSpeech = partOfSpeech.replace(/[<>]/g, "");
            var article = getArticle(partOfSpeech);
            this.emit(':ask', 'Please say ' + article + ' ' + partOfSpeech, 'Try saying ' + article + ' ' + partOfSpeech + '.');
        } else {
            this.emit(':ask', 'Would you like to do another mad lib?', 'Would you like to do another mad lib?');
        }
    }
});

var getArticle = function(word) {
    if (word.charAt(0) == 'a' ||
            word.charAt(0) == 'e' ||
            word.charAt(0) == 'i' ||
            word.charAt(0) == 'o' ||
            word.charAt(0) == 'u') {
        return 'an';
    } else {
        return 'a';
    }
}

var getExcitingResponse = function() {
    var number = Math.floor((Math.random() * 10));
    switch (number) {
        case 0:
            return "Thanks.";
        case 1:
            return "Great!";
        case 2:
            return "Good Job.";
        case 3:
            return "Nice one!";
        case 4:
            return "Keep it up.";
        case 5:
            return "Cool.";
        case 6:
            return "Wow! I didn't think of that one.";
        case 7:
            return "Not bad.";
        case 8:
            return "Interesting.";
        case 9:
            return "Neato.";
        default:
            return "";
    }
}