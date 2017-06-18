const common = require('./common-methods.js');

/**
 * Creates Answer Object
 * @param db DB Object
 * @param answer Actual Ans
 * @param fake_answer Fake Ans
 * @param type Question Type
 * @return number 0 for success, -1 for fail to add category, -2 for fail to get category (not exists),
 * -3 for fail to add qn
 */
module.exports.createAnswer = function (db, answer, fake_answer, type) {
    type = type.toLowerCase();
    db.query("INSERT IGNORE INTO questions_category SET ?", {name: type}, (error, results, fields) => {
        if (error) return -1;
    });
    db.query("SELECT id from questions_category WHERE name = ?", [type], (error, results, fields) => {
        if (error) return -2;
        let queryid = results[0].id;
        db.query("INSERT IGNORE INTO questions SET ?", {answer: answer, fake: fake_answer, category: queryid},
            (error, results, fields) => {
                if (error) return -3;
            });
    });
    return 0;
};

/**
 * Add a user if they do not exist
 * @param db Database Object
 * @param msg Telegram Message Object
 * @param callback Callback object with the return var
 * @return boolean true if success, false otherwise
 */
module.exports.addUser = function (db, msg, callback) {
    if (msg.chat.type === "channel") return callback(false);
    if (msg.chat.type === "private") {
        // Personal Chat, add to chat
        db.query("INSERT IGNORE INTO players_private SET ?", {
            player_id: msg.from.id,
            chat_id: msg.chat.id
        }, (error, res, f) => {
            if (error) {
                console.log("An error occurred adding a user private chat. Error: " + error.stack);
                console.log("User: " + msg.from.id + " | Chat: " + msg.chat.id);
                return callback(false);
            }
            return callback(true);
        });
    } else {
        // Group or Supergroup
        let name = msg.from.first_name;
        if (typeof msg.from.last_name !== 'undefined') name += " " + msg.from.last_name;
        db.query("INSERT IGNORE INTO players SET ?", {
            player_id: msg.from.id, player_name: name, chat_id: msg.chat.id,
            chat_type: msg.chat.type, chat_title: msg.chat.title
        }, (err, r, f) => {
            if (err) {
                console.log("An error occurred adding a new user. Error: " + err.stack);
                console.log("User: " + msg.from.id + " | Chat: " + msg.chat.id);
                return callback(false);
            }
        });
        // Update stats
        db.query("UPDATE players SET player_name = ?, chat_title = ?, chat_type = ?, username = ? WHERE player_id = ? AND chat_id = ?",
            [name, msg.chat.title, msg.chat.type, msg.from.username, msg.from.id, msg.chat.id], (err, r, f) => {
                if (err) console.log("Failed to update user details. Using old details. Error: " + err.stack);
            });
        return callback(true);
    }
};

/**
 * Get list of questions
 * @param db Database Object
 * @param callback Callback object with the return object
 * @return array Array of Questions
 */
module.exports.getQuestionList = function (db, callback) {
    db.query("SELECT * FROM questions", (err, result, f) => {
        if (err) {
            console.log("Error retrieving list, returning empty array");
            return callback(new Array(0));
        }

        return callback(result);
    });
};

/**
 * Creates a game instance
 * NOTE: MAKE SURE THIS IS ALREADY IN A GROUP BEFORE CREATING
 * @param db Database Object
 * @param msg Message Object
 * @param callback Callback function
 * @return int 0 - cannot start (no qns), 1 - started, -1 - DB Error, -2 - DB Error and abandon game
 */
module.exports.createGame = function (db, msg, callback) {
    module.exports.getQuestionList(db, (questions) => {
        module.exports.addUser(db, msg, (r) => {
            if (questions.length === 0) return callback(0, 0); // Cannot start game. No questions
            let questionId = common.randomInt(1, questions.length);
            db.query("INSERT INTO gamedata SET ?", {chat_id: msg.chat.id, playercount: 1, question: questionId}, (err, r, f) => {
                if (err) return callback(-1, 0);
                let qid = r.insertId;
                // Add user in too
                db.query("SELECT id from players WHERE player_id = ? AND chat_id = ?", [msg.from.id, msg.chat.id], (err, r, f) => {
                    if (err) return callback(-2, 0);
                    let playerId = r[0].id;
                    db.query("INSERT INTO game_players SET ?", {player_id: playerId, game_id: qid}, (err, r, f) => {
                        if (err) return callback(-2, 0);
                        return callback(1, qid);
                    });
                });
            });
        });
    });
};

module.exports.joinGame = function (db, msg, callback) {
    module.exports.addUser(db, msg, (r) => {
        db.query("SELECT * FROM players WHERE player_id = ? AND chat_id = ?", [msg.from.id, msg.chat.id], (err, r, f) => {
            if (err) return callback(false, 0);
            if (r == null) return callback(false, -1);
            if (r.length === 0) return callback(false, -2);
            let pid = r[0].id;

            module.exports.getActiveGameRecord(db, msg.chat.id, (res) => {
               if (res.state === 1) return callback(false, -3);
                db.query("INSERT INTO game_players SET ? WHERE game_id = ?", {player_id: r[0].id, game_id: res.id}, (err, r, f) => {
                    if (err) return callback(false, -4);
                    return callback(true, res.id);
                })
            });
        })
    });
};

module.exports.getActiveGameRecord = function (db, chat_id, callback) {
    db.query("SELECT * from gamedata WHERE chat_id = ? AND state IN (0,1) ORDER BY id DESC LIMIT 1", [chat_id], (err, r, f) => {
        if (err) return callback(null); // No active games
        if (r.length === 0) return callback(null);
        return callback(r[0]);
    });
};

module.exports.updateGameState = function (db, gameId, newState, callback) {
    db.query("UPDATE gamedata SET state = ? WHERE id = ?", [newState, gameId], (err, r, f) => {
        if (err) return callback(false); // Cannot Update
        return callback(true);
    });
};

module.exports.updateGameMode = function (db, gameId, newMode, callback) {
    let gametype = 0;
    switch (newMode.toLowerCase().trim()) {
        case "undercover": gametype = 1; break;
        case "mr white": gametype = 2; break;
        default: return callback(false); break;
    }
    db.query("UPDATE gamedata SET gametype = ? WHERE id = ?", [gametype, gameId], (err, r, f) => {
        if (err) return callback(false);
        return callback(true);
    })
};

module.exports.getGameTypes = function (db, callback) {
    db.query("SELECT * FROM gametype", (err, r, f) => {
        if (err) return callback(new Array(0));
        return callback(r);
    });
};
