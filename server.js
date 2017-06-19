const TelegramBot = require('node-telegram-bot-api');
const config = require('./config.js');
const commons = require('./common-methods.js');
const database = require('./database.js');
const util = require('util');
const fs = require('fs');

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

// Matches "/test [whatever]"
console.log('Registering test command');
bot.onText(/\/test (.+)/, (msg, match) => {
    sendTextMessage(msg.chat.id, match[1] + " @itachi1706 [K S](http://telegram.me/itachi1706)",
        {parse_mode: "Markdown", disable_web_page_preview: true});
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
console.log('Registering Create Game command');
bot.onText(/\/create_game\b/, (msg, match) => {
    if (!commons.isGroup(msg)) {
        sendTextMessage(msg.chat.id, "This command can only be used in a group!");
        return;
    }

    if (msg.from.username == null) {
        sendTextMessage(msg.chat.id, "Game Creator does not have a username, please add a username before creating a game!");
        return;
    }

    database.getActiveGameRecord(dbConnection, msg.chat.id, (res) => {
        if (res != null) {
            // Game exists, don't create new game
            sendTextMessage(msg.chat.id, "There is currently a game existing in " + msg.chat.title + "." +
                "\n\nIf you wish to create a new game, abandon the current game with /abandon first!");
            return;
        }

        database.createGame(dbConnection, msg, (res, gameid) => {
            switch (res) {
                case 0:
                    sendTextMessage(msg.chat.id, "Unable to create a new game, there are no Answers. " +
                        "\n\nPlease add some Answers with the /gadmin_add answer|||fake_answer|||category command!");
                    break;
                case 1:
                    // Game Created
                    database.getGameTypes(dbConnection, (gametypes) => {
                        // Create reply keyboard
                        let keyboard = [];
                        for (let i = 0; i < gametypes.length; i++) {
                            keyboard.push([gametypes[i].type]);
                        }
                        let reply = {keyboard: keyboard, one_time_keyboard: true, selective: true, resize_keyboard: true};

                        sendTextMessage(msg.chat.id, "A new game (#" + gameid + ") has been created for " + msg.chat.title + "!\n" +
                            "\nGame creator should now choose a game mode or it will use the default gamemode (Undercover) when the game starts!"
                            , {reply_markup: reply, reply_to_message_id: msg.message_id})
                            .then((msg) => {
                                bot.onReplyToMessage(msg.chat.id, msg.message_id, (response) => {
                                    database.updateGameMode(dbConnection, gameid, response.text, (res) => {
                                        if (!res) sendTextMessage(msg.chat.id, "Unable to select gamemode/invalid gamemode selected, using default gamemode instead");
                                        let message = "<b>" + response.text + "</b> gamemode has been selected!\n\nPlayers can now go ahead to join the game with the /join command.\n" +
                                            "\n- Players should ensure that <a href='http://telegram.me/ccn_test_game_bot'>they have already started me privately</a> as that will be where answers are received\n" +
                                            "- Players are to also ensure that they have a username in order to play this game\n\n" +
                                            "When you are ready, do /start_game to start the game\n<i>Note: A minimum of 3 players is needed to start the game</i>";

                                        sendTextMessage(msg.chat.id, message, {parse_mode: "HTML", reply_markup: {remove_keyboard: true}, disable_web_page_preview: true});
                                    });
                                });
                            });
                    });
                    break;
                case -1:
                    sendTextMessage(msg.chat.id, "A DB Exception has occurred. Please try creating a game again later");
                    break;
                case -2:
                    sendTextMessage(msg.chat.id, "A DB Exception has occurred trying to add the creator into the game. Abandoning the game...");
                    database.getActiveGameRecord(dbConnection, msg.chat.id, (rec) => {
                        if (rec == null) return;

                        database.updateGameState(dbConnection, rec.id, commons.STATE_ABANDONED, (res) => {
                            if (!res) sendTextMessage(msg.chat.id, "Unable to abandon game (id: " + rec.id + "). Try again later");
                        });
                    });
                    break;
            }
        });
    });
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
    if (!commons.isGroup(msg)) {
        sendTextMessage(msg.chat.id, "This command can only be used in a group!");
        return;
    }

    if (msg.from.username == null) {
        sendTextMessage(msg.chat.id, "You need to have a Telegram Username to join this game!", {reply_to_message_id: msg.message_id});
        return;
    }

    database.joinGame(dbConnection, msg, (result, gid) => {
        if (!result) {
            let reason = "";
            switch (gid) {
                case 0:
                case -1:
                case -2: reason = "An error occurred retrieving your details from the server"; break;
                case -3: reason = "There are currently no active games in this chat"; break;
                case -4: reason = "The game has already started"; break;
                case -5: reason = "Unable to join you into the game"; break;
                default: reason = "An Unknown error has occurred when attempting to join you to the game"; break;
            }
            sendTextMessage(msg.chat.id, "Unable to join the game\n\n" + reason);
            console.log("ERROR JOIN GAME: " + gid);
        } else sendTextMessage(msg.chat.id, "Successfully joined the game at " + msg.chat.title + " (Game #" + gid + ")!")
    });
});

// Matches "/abandon"
console.log('Registering Abandon Game command');
bot.onText(/\/abandon\b/, (msg, match) => {
    if (!commons.isGroup(msg)) {
        sendTextMessage(msg.chat.id, "This command can only be used in a group!");
        return;
    }

    database.getActiveGameRecord(dbConnection, msg.chat.id, (rec) => {
        if (rec == null) {
            // No game
            sendTextMessage(msg.chat.id, "There is currently no active game in " + msg.chat.title);
            return;
        }

        database.updateGameState(dbConnection, rec.id, commons.STATE_ABANDONED, (res) => {
            if (!res) sendTextMessage(msg.chat.id, "Unable to abandon game (id: " + rec.id + "). Try again later");
            else sendTextMessage(msg.chat.id, "Abandoned game in " + msg.chat.title + " (Game #" + rec.id + ")");
        });
    });
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

// Matches "/gskip"
console.log('Registering Skip Player command');
bot.onText(/\/gskip\b/, (msg, match) => {
    /*if (!commons.isGroup(msg)) {
     sendTextMessage(msg.chat.id, "This command can only be used in a group!");
     return;
     }*/

    // TODO: Write TODOs
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/guess"
console.log('Registering Guess Answer command');
bot.onText(/\/guess\b/, (msg, match) => {
    /*if (!commons.isGroup(msg)) {
     sendTextMessage(msg.chat.id, "This command can only be used in a group!");
     return;
     }*/

    // TODO: Write TODOs
    sendTextMessage(msg.chat.id, "W.I.P Check back later!");
});

// Matches "/about"
console.log('Registering About Bot command');
bot.onText(/\/about\b/, (msg, match) => {
    fs.readFile('./version.txt', 'utf8', (err, data) => {
        if (err) sendTextMessage(msg.chat.id, "Command error. Try again later");
        else {
            let message = "About This Bot\n\nVersion: #" + data;
            sendTextMessage(msg.chat.id, message);
        }
    });
});

console.log('Registering any messages receiver');
bot.on('message', (msg) => {
    // Add user to DB
    if (config.debug) console.log("Message Received: " + util.inspect(msg, {depth:null}));
    database.addUser(dbConnection, msg, (r) => {});
});

function sendTextMessage(chatId, msg, options = {}) {
    let promise = bot.sendMessage(chatId, msg, options);
    promise.then((msg) => {
        if (config.debug) console.log("Sent Message: " + util.inspect(msg, {depth:null}));
    });
    return promise;
}

console.log('Finished initializing Telegram Bot!');
