const TelegramBot = require('node-telegram-bot-api');
const config = require('./config.js');
const commons = require('./common-methods.js');
const database = require('./database.js');
const util = require('util');

const debug = true;

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
bot.onText(/\/create_game\b/, (msg, match) => {
    if (!commons.isGroup(msg)) {
        sendTextMessage(msg.chat.id, "This command can only be used in a group!");
        return;
    }

    if (database.getActiveGameRecord(dbConnection, msg.chat.id) !== null) {
        // Game exists, dont create new game
        sendTextMessage(msg.chat.id, "There is currently a game existing in " + msg.chat.title + "." +
            "\n\nIf you wish to create a new game, abandon the current game with /abandon first!");
        return;
    }
    switch (database.createGame(dbConnection, msg)) {
        case 0:
            sendTextMessage(msg.chat.id, "Unable to create a new game, there are no Answers. " +
                "\n\nPlease add some Answers with the /gadmin_add answer|||fake_answer|||category command!");
            break;
        case 1:
            // Game Created
            let gametypes = database.getGameTypes(dbConnection);

            // Create reply keyboard
            let keyboard = 'ReplyKeyboardMarkup(keyboard=[';
            for (let i = 0; i < gametypes.length; i++) {
                keyboard += '[KeyboardButton(text="' + gametypes[i].type + '")],';
            }
            keyboard = keyboard.substring(0, keyboard.length - 1);
            keyboard += '],selective=true,one_time_keyboard=true)';

            sendTextMessage(msg.chat.id, "A new game has been created for " + msg.chat.title + "!\n" +
                "\nGame creator should now choose a game mode or it will use the default gamemode (Undercover) when the game starts!"
                , {reply_markup: keyboard});
            break;
        case -1:
            sendTextMessage(msg.chat.id, "A DB Exception has occurred. Please try creating a game again later");
            break;
        case -2:
            sendTextMessage(msg.chat.id, "A DB Exception has occurred trying to add the creator into the game. Abandoning the game...");
            let rec = database.getActiveGameRecord(dbConnection, msg.chat.id);
            if (rec === null) return;

            if (!database.updateGameState(dbConnection, rec.id, commons.STATE_ABANDONED)) {
                sendTextMessage(msg.chat.id, "Unable to abandon game (id: " + rec.id + "). Try again later");
                return;
            }
            break;
    }
});

// Matches "/start_game"
console.log('Registering Start Game command');
bot.onText(/\/start_game\b/, (msg, match) => {
    /*if (!commons.isGroup(msg)) {
        sendTextMessage(msg.chat.id, "This command can only be used in a group!");
        return;
    }*/

    // TODO: Starts the game (state 1)
    // TODO: Randomly select a person to start and generate the sequence (probably by how they joined)
    // TODO: If game has already started or abandoned (state 1 or 3) do nothing
    // TODO: If game is completed (state 2), create a new game instance with the same settings and players
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/join"
console.log('Registering Join Game command');
bot.onText(/\/join\b/, (msg, match) => {
    /*if (!commons.isGroup(msg)) {
        sendTextMessage(msg.chat.id, "This command can only be used in a group!");
        return;
    }*/

    // TODO: Joins the game if its created but not started (state 0)
    // TODO: Otherwise dont join game
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/abandon"
console.log('Registering Abandon Game command');
bot.onText(/\/abandon\b/, (msg, match) => {
    if (!commons.isGroup(msg)) {
        sendTextMessage(msg.chat.id, "This command can only be used in a group!");
        return;
    }

    let rec = database.getActiveGameRecord(dbConnection, msg.chat.id);
    if (rec === null) {
        // No game
        sendTextMessage(msg.chat.id, "There is currently no active game in " + msg.chat.title);
        return;
    }

    if (!database.updateGameState(dbConnection, rec.id, commons.STATE_ABANDONED)) {
        sendTextMessage(msg.chat.id, "Unable to abandon game (id: " + rec.id + "). Try again later");
        return;
    }

    sendTextMessage(msg.chat.id, "Abandoned game in " + msg.chat.title + " (Game #" + rec.id + ")");
});

// Matches "/ans <answer>"
console.log('Registering Give Answer command');
bot.onText(/\/ans (.+)/, (msg, match) => {
    /*if (!commons.isGroup(msg)) {
        sendTextMessage(msg.chat.id, "This command can only be used in a group!");
        return;
    }*/

    // TODO: If its your turn, give an Answer and record it down in the turns table
    // TODO: Sends a message of all messages for the game in the same turn
    // TODO: At the end of the turn (everyone said something. Turns table match players table), can go accuse
    // TODO: Only works when game is started (state 2) and not in accuse mode
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/accuse <player>"
console.log('Registering Accuse Player command');
bot.onText(/\/accuse (.+)/, (msg, match) => {
    /*if (!commons.isGroup(msg)) {
        sendTextMessage(msg.chat.id, "This command can only be used in a group!");
        return;
    }*/

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
    if (debug) console.log("Message Received: " + util.inspect(msg, {depth:null}));
    database.addUser(dbConnection, msg);
});

function sendTextMessage(chatId, msg, options = {}) {
    let promise = bot.sendMessage(chatId, msg, options);
    promise.then((msg) => {
        if (debug) console.log("Sent Message: " + util.inspect(msg, {depth:null}));
    })
}

console.log('Finished initializing Telegram Bot!');
