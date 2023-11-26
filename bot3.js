require('dotenv').config();
const { getPrices, getCandlesticks } = require('./binance');
const { getMonit, getOneAcc, getTelegramBotID, getTelegramChatsIDS } = require('./execQuery');
const { sendTelegramMsgAnyIds, getIndicatorsFromCandlesticks, tendencia_alta_ema9, tendencia_alta_ema21, obterValorPorChave, atualizarValorPorChave } = require('./fx');
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
        const istendencia_alta_ema9 = tendencia_alta_ema9(candlesticks1, e.priceTolerance);
        const istendencia_alta_ema21 = tendencia_alta_ema21(candlesticks1, e.priceTolerance);
        const chave1 = e.symbol + "_" + e.timeframe;
        if (istendencia_alta_ema21 != obterValorPorChave(istendencia_alta_ema21V, chave1)) {
            if (istendencia_alta_ema21) {
                atualizarValorPorChave(istendencia_alta_ema21V, chave1, istendencia_alta_ema21);
                escreveLog(`${chave1} - ${istendencia_alta_ema21}`, log_file);
                sendTelegramMsgAnyIds(await getTelegramBotID(), `${e.symbol} ${e.timeframe} Tentendecia de alta EMA 21`, await getTelegramChatsIDS());
            } else {
                atualizarValorPorChave(istendencia_alta_ema21V, chave1, istendencia_alta_ema21);
            }
        }
        if (istendencia_alta_ema9 != obterValorPorChave(istendencia_alta_ema9V, chave1)) {
            if (istendencia_alta_ema9) {
                atualizarValorPorChave(istendencia_alta_ema9V, chave1, istendencia_alta_ema9);
                escreveLog(`${chave1} - ${istendencia_alta_ema9}`, log_file);
                sendTelegramMsgAnyIds(await getTelegramBotID(), `${e.symbol} ${e.timeframe} Tentendecia de alta EMA 9`, await getTelegramChatsIDS());
            } else {
                atualizarValorPorChave(istendencia_alta_ema9V, chave1, istendencia_alta_ema9);
            }
        }
    });
}

escreveLog(`DeathTyrant 3 INI`, log_file);

// Agendando a execução da função check() a cada 1 minuto

cron.schedule('* * * * *', () => {
    console.log('Executando check() 1 minutos');
    escreveLog(`DeathTyrant3 1-1M`, log_file);
    check3();
});
