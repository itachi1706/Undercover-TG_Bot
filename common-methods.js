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
