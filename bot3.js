require('dotenv').config();
const { getPrices, getCandlesticks } = require('./binance');
const { getMonit, getOneAcc } = require('./execQuery');
const { sendTelegramMsgAnyIds, getIndicatorsFromCandlesticks, calcularTendenciaAltaEma9, calcularTendenciaAltaEma21 } = require('./fx');
const { escreveLog } = require('./log');
const cron = require('node-cron');
const log_file = process.env.LOG;

async function check3() {
    const acc = await getOneAcc();
    const monit = await getMonit();
    monit.forEach(async (e) => {
        escreveLog(`Check: ${e.symbol}, ${e.timeframe}, ${e.priceTolerance}`, log_file);
        const candlesticks = await getCandlesticks(acc.apiKey, acc.apiSecret, e.symbol, e.timeframe);
        const candlesticks1 = await getIndicatorsFromCandlesticks(candlesticks);
        const candlesticks2 = await calcularTendenciaAltaEma9(candlesticks1, e.priceTolerance);
        const candlesticks3 = await calcularTendenciaAltaEma21(candlesticks2, e.priceTolerance);
        console.log(candlesticks3);
    });
}

escreveLog(`DeathTyrant 3 INI`, log_file);
check3();
// Agendando a execução da função check() a cada 1 minuto
/*
cron.schedule('* * * * *', () => {
    console.log('Executando check() 1 minutos');
    escreveLog(`DeathTyrant3 1-1M`, log_file);
    check3();
});
*/