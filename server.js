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
    match = match[1].split(" ");
    // Not enough length
    if (match.length < 3) {
        bot.sendMessage(msg.chat.id, "Not enough arguments to register a new answer!\n" +
            "You need to have a answer and a fake answer at least!\n\nFormat: /gadmin_add answer fake_answer [answer_type]");
        return;
    } else if (match.length === 3) type = defType;
    else type = match[3];
    let message = "";
    switch (database.createAnswer(dbConnection, match[1], match[2], type)) {
        case 0:
            message = "Answer Created!\n\nReal Answer: " + match[1] + "\nFake Answer: " + match[2] + "\nAnswer Category: " + type;
            break;
        case -1: message = "Unable to add category (" + type + "). Failed to add new answer"; break;
        case -2: message = "Unable to retrieve category (" + type + "). Failed to add new answer"; break;
        case -3: message = "Unable to add new answer (" + type + "). Failed to add new answer"; break;
        case -4:
        default: message = "An Unspecified DB Error occurred. Try again later"; break
    }
    console.log("Executed command: /gadmin_add " + oldstring + ". Results: " + message);
    bot.sendMessage(msg.chat.id, message);
});

console.log('Finished initializing Telegram Bot!');
