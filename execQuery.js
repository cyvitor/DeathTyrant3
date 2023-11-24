const mysql = require('mysql2/promise');

async function execQuery(query) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME
  });

  const [rows] = await connection.execute(query);

  connection.end();

  return rows;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function execQuery2(query) {
  const connection = await pool.getConnection();
  const [rows] = await connection.execute(query);
  connection.release();
  return rows;
}

async function getMonit() {
  const query = 'SELECT * FROM dt_monit WHERE status = 1';
  const resultado = await execQuery(query);
  return resultado;
}

async function getOneAcc() {
  const query = 'SELECT accid, apiKey, apiSecret FROM accs WHERE status = 1';
  const resultado = await execQuery(query);
  return resultado[0];
}

module.exports = {
  getMonit,
  getOneAcc
};