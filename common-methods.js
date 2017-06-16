module.exports.createDbPool = function (mySqlInfo) {
    let mysql = require('mysql');
    return mysql.createPool({
        connectionLimit: 100,
        host: mySqlInfo.host,
        user: mySqlInfo.user,
        password: mySqlInfo.password,
        database: mySqlInfo.database
    });
};
