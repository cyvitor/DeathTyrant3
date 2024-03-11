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

async function getTelegramBotID() {
  const query = 'SELECT value FROM params_conf WHERE param = "TELEGRAM_BOT_ID"';
  const resultado = await execQuery(query);
  return resultado[0]["value"];
}

async function getTelegramChatsIDS() {
  const query = 'SELECT value FROM params_conf WHERE param = "TELEGRAM_CHATS_IDS"';
  const resultado = await execQuery(query);
  return resultado[0]["value"];
}

async function getDtOpers() {
  const query = 'SELECT * FROM dt_opers WHERE status > 0';
  const resultado = await execQuery(query);
  return resultado;
}

async function getDtOper(dt_minit_id) {
  const query = `SELECT * FROM dt_opers WHERE dt_monit_id = "${dt_minit_id}" AND status = 1 `;
  const resultado = await execQuery(query);
  return resultado;
}

async function checkDtOper(dt_minit_id) {
  const query = `SELECT * FROM dt_opers WHERE dt_monit_id = "${dt_minit_id}" AND status = 1 `;
  const resultado = await execQuery(query);
  return resultado.length > 0;
}

async function getDtOperByOperID(operID) {
  const query = `SELECT * FROM dt_opers WHERE oper_id = "${operID}"`;
  const resultado = await execQuery(query);
  return resultado;
}

async function setDtOper(oper_id, dt_monit_id) {
  const query = `INSERT INTO dt_opers (oper_id, dt_monit_id, status, datatime)VALUE("${oper_id}", "${dt_monit_id}", 1, now())`;
  const resultado = await execQuery(query);
  return resultado;
}

async function setLittleBotOper(oper_id, symbol, leverage, quantity, target) {
  const query = `INSERT INTO ordens ( symbol, side, type, quantity, price, target1, stopLoss, startOp, startPrice, leverage, status, datahora, oper_id) VALUES ('${symbol}', 'BUY', 'MARKET', '${quantity}', '0', '${target}', '0', '<', '0', '${leverage}', '4', now(), '${oper_id}');`;
  const resultado = await execQuery(query);
  return resultado;
}

async function checkDtOperAndOrders() {
  const query = `SELECT d.id, d.oper_id, d.dt_monit_id, d.status as dt_status, o.status as o_status FROM dt_opers d, ordens o WHERE d.oper_id=o.oper_id AND d.status != 0`;
  const resultado = await execQuery(query);
  return resultado;
}

async function setDtOperClosed(oper_id) {
  const query = `UPDATE dt_opers SET status = 0 WHERE oper_id = '${oper_id}'`;
  const resultado = await execQuery(query);
  return resultado;
}

module.exports = {
  getMonit,
  getOneAcc,
  getTelegramBotID,
  getTelegramChatsIDS,
  getDtOpers,
  getDtOper,
  setDtOper,
  getDtOperByOperID,
  checkDtOper,
  setLittleBotOper,
  checkDtOperAndOrders,
  setDtOperClosed
};