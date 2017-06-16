module.exports.createDbConnection = function (mySqlInfo) {
    let mysql = require('mysql');
    return mysql.createConnection({
        host: mySqlInfo.host,
        user: mySqlInfo.user,
        password: mySqlInfo.password,
        database: mySqlInfo.database
    });
};
