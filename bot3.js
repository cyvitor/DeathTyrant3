require('dotenv').config();
const { getPrices, getCandlesticks } = require('./binance');
const { getMonit, getOneAcc, getTelegramBotID, getTelegramChatsIDS, checkDtOper, setDtOper, setLittleBotOper, checkDtOperAndOrders, setDtOperClosed } = require('./execQuery');
const { sendTelegramMsgAnyIds, getIndicatorsFromCandlesticks, tendencia_alta_ema9, tendencia_alta_ema21, obterValorPorChave, atualizarValorPorChave, getNewOperID, getLastCandle, calcPercentage } = require('./fx');
const { escreveLog } = require('./log');
const cron = require('node-cron');
const log_file = process.env.LOG;

let istendencia_alta_ema9V = [];
let istendencia_alta_ema21V = [];

async function check3() {
    const acc = await getOneAcc();
    const monit = await getMonit();
    monit.forEach(async (e) => {
        escreveLog(`Check: ${e.symbol}, ${e.timeframe}, ${e.priceTolerance}`, log_file);
        const candlesticks = await getCandlesticks(acc.apiKey, acc.apiSecret, e.symbol, e.timeframe);
        const candlesticks1 = await getIndicatorsFromCandlesticks(candlesticks);
        const lastCandle = getLastCandle(candlesticks1);
        const istendencia_alta_ema9 = tendencia_alta_ema9(candlesticks1, e.priceTolerance);
        const istendencia_alta_ema21 = tendencia_alta_ema21(candlesticks1, e.priceTolerance);
        const chave1 = e.symbol + "_" + e.timeframe;
        if (istendencia_alta_ema21 != obterValorPorChave(istendencia_alta_ema21V, chave1)) {
            if (istendencia_alta_ema21) {
                if (await checkDtOper(e.id)) {
                    escreveLog(`MID: ${e.id} - oper ja em andamento`, log_file);
                } else {
                    const operID = await getNewOperID();
                    escreveLog(`MID: ${e.id} operID: ${operID} - iniciar operação`, log_file);
                    atualizarValorPorChave(istendencia_alta_ema21V, chave1, istendencia_alta_ema21);
                    sendTelegramMsgAnyIds(await getTelegramBotID(), `${e.symbol} ${e.timeframe} Tentendecia de alta EMA 21`, await getTelegramChatsIDS());
                    await setDtOper(operID, e.id);
                    const target = calcPercentage(lastCandle.close, e.targetPercent, 2);
                    await setLittleBotOper(operID, e.symbol, e.leverage, e.quantity, target);
                }
            } else {
                atualizarValorPorChave(istendencia_alta_ema21V, chave1, istendencia_alta_ema21);
            }
        }
        if (istendencia_alta_ema9 != obterValorPorChave(istendencia_alta_ema9V, chave1)) {
            if (istendencia_alta_ema9) {
                if (await checkDtOper(e.id)) {
                    escreveLog(`MID: ${e.id} - oper ja em andamento`, log_file);
                } else {
                    const operID = await getNewOperID();
                    escreveLog(`MID: ${e.id} operID: ${operID} - iniciar operação`, log_file);
                    atualizarValorPorChave(istendencia_alta_ema9V, chave1, istendencia_alta_ema9);
                    sendTelegramMsgAnyIds(await getTelegramBotID(), `${e.symbol} ${e.timeframe} Tentendecia de alta EMA 9`, await getTelegramChatsIDS());
                    await setDtOper(operID, e.id);
                    const target = calcPercentage(lastCandle.close, e.targetPercent, 2);
                    await setLittleBotOper(operID, e.symbol, e.leverage, e.quantity, target);
                }
            } else {
                atualizarValorPorChave(istendencia_alta_ema9V, chave1, istendencia_alta_ema9);
            }
        }
    });
}

async function check4() {
    const opers = await checkDtOperAndOrders();
    opers.forEach(async operation => {
        if (operation.o_status === '3') {
            escreveLog(`Fecha operação ${operation.oper_id}`, log_file);
            await setDtOperClosed(operation.oper_id);
        }
    });
}

escreveLog(`DeathTyrant 3 INI`, log_file);

// Agendando a execução da função check() a cada 1 minuto

cron.schedule('* * * * *', () => {
    console.log('Executando check() 1 minutos');
    escreveLog(`DeathTyrant3 1-1M`, log_file);
    check3();
    check4();
});

//check3();
//check4();