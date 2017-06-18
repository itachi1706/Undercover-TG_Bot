const mysql = require('mysql');

module.exports.createDbPool = function (mySqlInfo) {
    return mysql.createPool({
        connectionLimit: 100,
        host: mySqlInfo.host,
        user: mySqlInfo.user,
        password: mySqlInfo.password,
        database: mySqlInfo.database
    });
};

module.exports.randomInt = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
};

module.exports.isGroup = function (msg) {
    return msg.chat.type === "group" || msg.chat.type === "supergroup";

};

module.exports.isPrivate = function (msg) {
    return msg.chat.type === "private";
};

module.exports.STATE_CREATED = 0;
module.exports.STATE_STARTED = 1;
module.exports.STATE_COMPLETED = 2;
module.exports.STATE_ABANDONED = 3;