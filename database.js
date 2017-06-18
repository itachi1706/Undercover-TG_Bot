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
        db.query("UPDATE players SET player_name = ?, chat_title = ?, chat_type = ? WHERE player_id = ? AND chat_id = ?",
            [name, msg.chat.title, msg.chat.type, msg.from.id, msg.chat.id], (err, r, f) => {
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
 * @return int 0 - cannot start (no qns), 1 - started, -1 - DB Error, -2 - DB Error and abandon game
 */
module.exports.createGame = function (db, msg) {
    module.exports.getQuestionList(db, (questions) => {
        console.log("DEBUG: getQuestionList() executed");
        module.exports.addUser(db, msg, (r) => {
            console.log("DEBUG: addUser() executed");
            if (questions.length === 0) return 0; // Cannot start game. No questions
            let questionId = common.randomInt(0, questions.length - 1);
            console.log("DEBUG: questionId:" + questionId);
            db.query("INSERT INTO gamedata SET ?", {chat_id: msg.chat.id, playercount: 1, question: questionId}, (err, r, f) => {
                console.log("DEBUG: gamedata query executed");
                if (err) return -1;
                let qid = r.insertId;
                console.log("DEBUG: qid:" + qid);
                // Add user in too
                db.query("SELECT id from players WHERE player_id = ?", [msg.from.id], (err, r, f) => {
                    console.log("DEBUG: player SELECT query executed");
                    if (err) return -2;
                    let playerId = r[0].id;
                    console.log("DEBUG: playerId: " + playerId);
                    db.query("INSERT INTO game_players SET ?", {player_id: playerId, game_id: qid}, (err, r, f) => {
                        console.log("DEBUG: game_players INSERT query executed");
                        if (err) return -2;
                        console.log("DEBUG: Completed");
                        return 0;
                    });
                });
            });
            return -1;
        });
    }); // Just in case the user is not inside

};

module.exports.getActiveGameRecord = function (db, chat_id) {
    db.query("SELECT * from gamedata WHERE chat_id = ? AND state IN (0,1) ORDER BY id DESC LIMIT 1", [chat_id], (err, r, f) => {
        if (err) return null; // No active games
        if (r.length === 0) return null;
        return r[0];
    });
};

module.exports.updateGameState = function (db, gameId, newState) {
    db.query("UPDATE gamedata SET state = ? WHERE id = ?", [newState, gameId], (err, r, f) => {
        if (err) return false; // Cannot Update
        return true;
    });
};

module.exports.getGameTypes = function (db) {
    db.query("SELECT * FROM gametype", (err, r, f) => {
        if (err) return new Array(0);
        return r;
    });
};
