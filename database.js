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
 * @return boolean true if success, false otherwise
 */
module.exports.addUser = function (db, msg) {
    if (msg.chat.type === "channel") return false;
    if (msg.chat.type === "private") {
        // Personal Chat, add to chat
        db.query("INSERT IGNORE INTO players_private SET ?", {player_id: msg.from.id, chat_id: msg.chat.id}, (error, res, f) => {
            if (error) {
                console.log("An error occurred adding a user private chat. Error: " + error.stack);
                console.log("User: " + msg.from.id + " | Chat: " + msg.chat.chatId);
                return false;
            }
            return true;
        });
    }
    // Group or Supergroup
    let name = msg.from.first_name;
    if (typeof msg.from.last_name !== 'undefined') {
        name += msg.from.last_name;
    }
    db.query("INSERT IGNORE INTO players SET ?", {player_id: msg.from.id, player_name: name, chat_id: msg.chat.id,
    chat_type: msg.chat.type, chat_title: msg.chat.title}, (err, r, f) => {
        if (err) {
            console.log("An error occurred adding a new user. Error: " + err.stack);
            console.log("User: " + msg.from.id + " | Chat: " + msg.chat.chatId);
            return false;
        }
    });
    // Update stats
    db.query("UPDATE players SET player_name = ?, chat_title = ?, chat_type = ? WHERE player_id = ? AND chat_id = ?",
        [name, msg.chat.title, msg.chat.type, msg.from.id, msg.chat.id], (err, r, f) => {
        console.log("Failed to update user details. Using old details. Error: " + err.stack);
    });
    return true;
};
