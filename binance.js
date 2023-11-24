const Binance = require('node-binance-api');

let binanceConfig

if (process.env.TEST === "TRUE") {
    binanceConfig = {
        recvWindow: 60000,
        test: process.env.TEST,
        'family': 4, //ajuste para funcionar no node 18
    };
} else {
    binanceConfig = {
        recvWindow: 60000,
        'family': 4, // ajuste para funcionar no node 18
    };
}

async function getTickers(apiKey, apiSecret) {

    const binance = new Binance({
        APIKEY: apiKey,
        APISECRET: apiSecret,
        ...binanceConfig,
    });

    const tickers = await binance.bookTickers();
    return tickers;
}

async function getPrices(apiKey, apiSecret) {

    const binance = new Binance({
        APIKEY: apiKey,
        APISECRET: apiSecret,
        ...binanceConfig,
    });

    const tickers = await binance.prices();
    return tickers;
}

async function getCandlesticks(apiKey, apiSecret, pair, time) {

    const binance = new Binance({
        APIKEY: apiKey,
        APISECRET: apiSecret,
        ...binanceConfig,
    });


    return new Promise((resolve, reject) => {
        binance.candlesticks(pair, time, (error, ticks, symbol) => {
            if (error) {
                reject(error);
            } else {
                //console.info("candlesticks()", ticks);
                let candlesticksData = [];
                for (let tick of ticks) {
                    let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
                    let candlestick = {
                        time: time,
                        close: close,
                    };
                    candlesticksData.push(candlestick);
                }
                
                console.info(symbol + " last close: " + candlesticksData[candlesticksData.length - 1].close);
                resolve(candlesticksData);
            }
        }, { limit: 100 });
    });
}

async function getCandlesticks2(apiKey, apiSecret, pair, time) {
    const tulind = require('tulind');
    const moment = require('moment-timezone');
    moment.locale('pt-br');
    moment.tz.setDefault('America/Sao_Paulo');

    const binance = new Binance({
        APIKEY: apiKey,
        APISECRET: apiSecret,
        ...binanceConfig,
    });

    return new Promise((resolve, reject) => {
        binance.candlesticks(pair, time, (error, ticks, symbol) => {
            if (error) {
                reject(error);
            } else {
                console.info("candlesticks()", ticks);
                let candlesticksData = [];
                let fortunaDefault = "0";
                let prevEma9 = null;
                let prevEma21 = null;
                for (let tick of ticks) {
                    let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
                    let formattedTime = moment(time).format('YYYY-MM-DD HH:mm:ss');
                    let candlestick = {
                        time: time,
                        formattedTime: formattedTime,
                        close: close,
                        ema9: null,
                        ema21: null,
                        fortuna: fortunaDefault
                    };
                    candlesticksData.push(candlestick);
                }
                tulind.indicators.ema.indicator([candlesticksData.map(candlestick => candlestick.close)], [9], (err, ema9) => {
                    if (err) {
                        reject(err);
                    } else {
                        tulind.indicators.ema.indicator([candlesticksData.map(candlestick => candlestick.close)], [21], (err, ema21) => {
                            if (err) {
                                reject(err);
                            } else {
                                for (let i = 0; i < candlesticksData.length; i++) {
                                    candlesticksData[i].ema9 = ema9[0][i];
                                    candlesticksData[i].ema21 = ema21[0][i];
                                    if (prevEma9 && prevEma21) {
                                        if (prevEma9 < prevEma21 && candlesticksData[i].ema9 > candlesticksData[i].ema21) {
                                            candlesticksData[i].fortuna = "compra";
                                        } else if (prevEma9 > prevEma21 && candlesticksData[i].ema9 < candlesticksData[i].ema21) {
                                            candlesticksData[i].fortuna = "venda";
                                        } else {
                                            candlesticksData[i].fortuna = fortunaDefault;
                                        }
                                    }
                                    prevEma9 = candlesticksData[i].ema9;
                                    prevEma21 = candlesticksData[i].ema21;
                                }
                                console.info(symbol + " last close: " + candlesticksData[candlesticksData.length - 1].close);
                                resolve(candlesticksData);
                            }
                        });
                    }
                });
            }
        }, { limit: 100 });
    });
}

module.exports = {
    getTickers,
    getPrices,
    getCandlesticks,
    getCandlesticks2
}