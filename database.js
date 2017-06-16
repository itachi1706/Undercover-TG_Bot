/**
 * Creates Answer Object
 * @param db DB Object
 * @param answer Actual Ans
 * @param fake_answer Fake Ans
 * @param type Question Type
 * @return number 0 for success, -1 for fail to add category, -2 for fail to get category (not exists),
 * -3 for fail to add qn, -4 DB Unspecified Error
 */
module.exports.createAnswer = function (db, answer, fake_answer, type) {
    type = type.toLowerCase();
    db.getConnection((err, conn) => {
        conn.query("INSERT INTO questions_category SET ?", {name: type}, (error, results, fields) => {
            if (error) return -1;
        });
        let queryid = -1;
        conn.query("SELECT id from questions_category WHERE name = ?", [type], (error, results, fields) => {
            if (error) return -2;
            queryid = results.insertId;
        });
        conn.query("INSERT INTO questions SET ?", {answer: answer, fake: fake_answer, category: queryid}, (error, results, fields) => {
            if (error) return -3;
        });
        conn.release();
        if (err) return -4;
        return 0;
    });
    return -4;
};
