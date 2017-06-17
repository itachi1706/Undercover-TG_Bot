const TelegramBot = require('node-telegram-bot-api');
const config = require('./config.js');
const commons = require('./common-methods.js');
const database = require('./database.js');

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
    bot.sendMessage(msg.chat.id, match[1]);
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
        bot.sendMessage(msg.chat.id, "Not enough arguments to register a new answer!\n" +
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
    bot.sendMessage(msg.chat.id, message);
});

console.log('Registering any messages receiver');
bot.on('message', (msg) => {
    // Add user to DB
    database.addUser(dbConnection, msg);
});

console.log('Finished initializing Telegram Bot!');
