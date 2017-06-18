const TelegramBot = require('node-telegram-bot-api');
const config = require('./config.js');
const commons = require('./common-methods.js');
const database = require('./database.js');
const util = require('util');

console.log('Initializing Telegram Bot...');

console.log('Opening Database Pool Connection...');
const dbConnection = commons.createDbPool(config.mysqlInfo);

// replace the value below with the Telegram token you receive from @BotFather
const token = config.telegramBotToken;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

// Matches "/echo [whatever]"
console.log('Registering echo command');
bot.onText(/\/echo (.+)/, (msg, match) => {
    sendTextMessage(msg.chat.id, match[1]);
});

// Matches "/gadmin_add <ans> <fake> [type]"
console.log("Registering Global Admin Add Answer Command");
bot.onText(/\/gadmin_add (.+)/, (msg, match) => {
    const defType = 'general';
    let type = '';
    let oldstring = match[1];
    console.log('Splitting String ' + oldstring);
    match = match[1].split("|||");
    // Not enough length
    if (match.length < 2) {
        sendTextMessage(msg.chat.id, "Not enough arguments to register a new answer!\n" +
            "You need to have a answer and a fake answer at least!\n\nFormat: /gadmin_add answer|||fake_answer|||[answer_type]" +
            "\n\nExample: If I want actual answer be Apple and fake answer be Orange under the Fruits type\n" +
            "/gadmin_add Apple|||Orange|||Fruits");
        return;
    } else if (match.length === 2) type = defType;
    else type = match[2];
    let message = "";
    switch (database.createAnswer(dbConnection, match[0], match[1], type)) {
        case 0:
            message = "Answer Created!\n\nReal Answer: " + match[0] + "\nFake Answer: " + match[1] + "\nAnswer Category: " + type;
            break;
        case -1: message = "Unable to add category (" + type + "). Failed to add new answer"; break;
        case -2: message = "Unable to retrieve category (" + type + "). Failed to add new answer"; break;
        case -3: message = "Unable to add new answer (" + type + "). Failed to add new answer"; break;
        default: message = "An Unspecified Error occurred. Try again later"; break
    }
    console.log("Executed command: /gadmin_add " + oldstring + ". Results: " + message);
    sendTextMessage(msg.chat.id, message);
});

// Matches "/create_game"
console.log('Registering echo command');
bot.onText(/\/create_game/g, (msg, match) => {
    // TODO: Create game (add record to DB) Defaulted to undercover
    // TODO: Inline Reply Keyboard to select
    // TODO: If there is a unstarted or inprogress game (state 0 or 1), do not create a new game
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/start [whatever]"
console.log('Registering Start Game command');
bot.onText(/\/start (.+)/, (msg, match) => {
    // TODO: Starts the game (state 1)
    // TODO: Randomly select a person to start and generate the sequence (probably by how they joined)
    // TODO: If game has already started or abandoned (state 1 or 3) do nothing
    // TODO: If game is completed (state 2), create a new game instance with the same settings and players
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/join"
console.log('Registering Join Game command');
bot.onText(/\/join/, (msg, match) => {
    // TODO: Joins the game if its created but not started (state 0)
    // TODO: Otherwise dont join game
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/abandon"
console.log('Registering Abandon Game command');
bot.onText(/\/abandon/, (msg, match) => {
    // TODO: Abandons a started or unstarted game (state 0 or 1)
    // TODO: Sets it to state 3
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/ans <answer>"
console.log('Registering Give Answer command');
bot.onText(/\/ans (.+)/, (msg, match) => {
    // TODO: If its your turn, give an Answer and record it down in the turns table
    // TODO: Sends a message of all messages for the game in the same turn
    // TODO: At the end of the turn (everyone said something. Turns table match players table), can go accuse
    // TODO: Only works when game is started (state 2) and not in accuse mode
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/accuse <player>"
console.log('Registering Accuse Player command');
bot.onText(/\/accuse (.+)/, (msg, match) => {
    // TODO: Only works when game is started (state 2)
    // TODO: Only works in accuse mode (everyone given an answer and turn has yet to end
    // TODO: Accuses a player (add/update accuse table) via username (need to see how to do it)
    // TODO: When everyone accuses somebody already, kills the person
    // TODO: If innocent killed, continue game and increment turn, otherwise end game
    // TODO: If there is an equal number of players being accused, the drawn players will write normally more answers and others can change their accusations
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

console.log('Registering any messages receiver');
bot.on('message', (msg) => {
    // Add user to DB
    console.log("Message Received: " + util.inspect(msg, {depth:null}));
    database.addUser(dbConnection, msg);
});

function sendTextMessage(chatId, msg, options = {}) {
    let promise = bot.sendMessage(chatId, msg, options);
    promise.then((msg) => {
        console.log("Sent Message: " + util.inspect(msg, {depth:null}));
    })
}

console.log('Finished initializing Telegram Bot!');
