const tulind = require('tulind');
const moment = require('moment-timezone');
moment.locale('pt-br');
moment.tz.setDefault('America/Sao_Paulo');

function getFortunaIndicatorFromCandlesticks(candlesticks) {
    const closes = candlesticks.map(candle => parseFloat(candle.close));
    const ema9Promise = tulind.indicators.ema.indicator([closes], [9]);
    const ema21Promise = tulind.indicators.ema.indicator([closes], [21]);

    return Promise.all([ema9Promise, ema21Promise])
        .then(results => {
            const ema9 = results[0][0].slice(-1)[0];
            const ema21 = results[1][0].slice(-1)[0];
            let fortuna = 0;

            const formattedCandlesticks = candlesticks.map(candle => {
                const formattedTime = moment(candle.time).format('YYYY-MM-DD HH:mm:ss');
                const ema9Value = parseFloat(results[0][0].shift().toFixed(8));
                const ema21Value = parseFloat(results[1][0].shift().toFixed(8));
                let fortunaIndicator = 0;

                if (ema9Value > ema21Value && fortuna !== 1) {
                    fortuna = 1;
                    fortunaIndicator = 'compra';
                } else if (ema9Value < ema21Value && fortuna !== -1) {
                    fortuna = -1;
                    fortunaIndicator = 'venda';
                }

                return {
                    time: candle.time,
                    formattedTime,
                    close: parseFloat(candle.close),
                    ema9: ema9Value,
                    ema21: ema21Value,
                    fortuna: fortunaIndicator
                };
            });

            return formattedCandlesticks;
        });
}

function getLastFortunaCandle(candlesticks) {
    let lastFortunaCandle = null;

    candlesticks.forEach(candle => {
        if (candle.fortuna !== 0) {
            lastFortunaCandle = candle;
        }
    });

    return lastFortunaCandle;
}

function getFortunaConfirmation(candlesticks) {
    const lastCandle = candlesticks[candlesticks.length - 1];
    const penultimateCandle = candlesticks[candlesticks.length - 2];
    let fortunaConfirmation = 0;

    if (penultimateCandle && lastCandle) {
        if (penultimateCandle.fortuna === 'compra' && lastCandle.fortuna === 0) {
            fortunaConfirmation = 'compra confirmada';
        } else if (penultimateCandle.fortuna === 'venda' && lastCandle.fortuna === 0) {
            fortunaConfirmation = 'venda confirmada';
        }
    } else {
        fortunaConfirmation = 0;
    }

    return fortunaConfirmation;
}


async function sendTelegramMsg(TELEGRAM_BOT_TOKEN, MSG, chat_id) {
    const axios = require('axios');
    try {
        const resposta = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: chat_id,
                text: MSG
            }
        );
        console.log(resposta.data);
    } catch (erro) {
        console.error(erro);
    }
}

async function sendTelegramMsgAnyIds(TELEGRAM_BOT_TOKEN, MSG, chat_ids) {
    const axios = require('axios');
    const ids = chat_ids.split(';');
    for (const chat_id of ids) {
        try {
            const resposta = await axios.post(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                {
                    chat_id: chat_id,
                    text: MSG
                }
            );
            console.log(resposta.data);
        } catch (erro) {
            console.error(erro);
        }
    }
}

async function getIndicatorsFromCandlesticks(candlesticks) {
    const closes = candlesticks.map(candle => parseFloat(candle.close));
    const ema9Promise = tulind.indicators.ema.indicator([closes], [9]);
    const ema21Promise = tulind.indicators.ema.indicator([closes], [21]);
    const macdPromise = tulind.indicators.macd.indicator([closes], [12, 26, 9]);
    const rsiPromise = tulind.indicators.rsi.indicator([closes], [14]);

    return Promise.all([ema9Promise, ema21Promise, macdPromise, rsiPromise])
        .then(results => {
            const ema9 = results[0][0].slice(-1)[0];
            const ema21 = results[1][0].slice(-1)[0];
            const macd = results[2][0];
            const signal = results[2][1];
            const histogram = results[2][2];
            const rsi = results[3][0];
            let fortuna = 0;
            let i = 0;
            let x = 0;
            let x2 = 0;

            const formattedCandlesticks = candlesticks.map((candle, index) => {
                const formattedTime = moment(candle.time).format('YYYY-MM-DD HH:mm:ss');
                const ema9Value = parseFloat(results[0][0][index].toFixed(8));
                const ema21Value = parseFloat(results[1][0][index].toFixed(8));
                let macdValue, signalValue, histogramValue, rsiValue;
                if (i > 24) {
                    macdValue = macd[x];
                    signalValue = signal[x];
                    histogramValue = histogram[x];
                    x++;
                } else {
                    macdValue, signalValue, histogramValue = 0;
                }

                if (i > 13) {
                    rsiValue = rsi[x2];
                    x2++;
                } else {
                    rsiValue = 0;
                }

                i++;
                let fortunaIndicator = 0;

                if (ema9Value > ema21Value && fortuna !== 1) {
                    fortuna = 1;
                    fortunaIndicator = 'compra';
                } else if (ema9Value < ema21Value && fortuna !== -1) {
                    fortuna = -1;
                    fortunaIndicator = 'venda';
                }

                return {
                    time: candle.time,
                    formattedTime,
                    close: parseFloat(candle.close),
                    ema9: ema9Value,
                    ema21: ema21Value,
                    macd: macdValue,
                    signal: signalValue,
                    histogram: histogramValue,
                    rsi: rsiValue,
                    fortuna: fortunaIndicator
                };
            });

            return formattedCandlesticks;
        });
}

function getStrategyOne(candles) {
    if (candles.length < 3) {
        return "0";
    }
    const lastThreeCandles = candles.slice(-3);
    const histograms = lastThreeCandles.map(candle => candle.histogram);
    const isIncreasing = histograms.every((histogram, index, arr) => index === 0 || histogram > arr[index - 1]);
    const isDecreasing = histograms.every((histogram, index, arr) => index === 0 || histogram < arr[index - 1]);
    if (isIncreasing && !isDecreasing) {
        return "Compra";
    } else if (isDecreasing && !isIncreasing) {
        return "Venda";
    } else if (histograms[0] < 0 && histograms.every((histogram, index, arr) => index === 0 || histogram > arr[index - 1])) {
        return "Tendência positiva";
    } else {
        return "0";
    }
}

function strategysAnalysis(candles) {
    const result = [];
    let strategyOnrecomend = 'init';
    let lastStrategyOnrecomend = 'init';
    let strategyTwoRecomend = 'init';
    let lastStrategyTwoRecomend = 'init';
    for (let i = 49; i < candles.length; i++) {

        let currCandle0 = candles[i - 3];
        let currCandle1 = candles[i - 2];
        let currCandle = candles[i];
        let analisysCandle = [];
        analisysCandle.push(currCandle0);
        analisysCandle.push(currCandle1);
        analisysCandle.push(currCandle);

        currCandle.strategyOne = getStrategyOne(analisysCandle);

        if (strategyOnrecomend == 'init') {
            strategyOnrecomend = currCandle.strategyOne;
            lastStrategyOnrecomend = currCandle.strategyOne;
        } else {
            if (lastStrategyOnrecomend != currCandle.strategyOne && currCandle.strategyOne != '0') {
                strategyOnrecomend = currCandle.strategyOne;
                lastStrategyOnrecomend = currCandle.strategyOne;
            } else {
                strategyOnrecomend = '0';
            }
        }
        currCandle.strategyOneRecomend = strategyOnrecomend;

        currCandle.strategyTwo = getStrategyTwo(analisysCandle);

        if (strategyTwoRecomend == 'init') {
            strategyTwoRecomend = currCandle.strategyTwo;
            lastStrategyTwoRecomend = currCandle.strategyTwo;
        } else {
            if (lastStrategyTwoRecomend != currCandle.strategyTwo && currCandle.strategyTwo != '0') {
                strategyTwoRecomend = currCandle.strategyTwo;
                lastStrategyTwoRecomend = currCandle.strategyTwo;
            } else {
                strategyTwoRecomend = '0';
            }
        }
        currCandle.strategyTwoRecomend = strategyTwoRecomend;

        result.push(currCandle);
    }
    return result;
}

function calcularSuporteResistencia(dadosFechamento) {
    const fechamentos = dadosFechamento.map((dados) => dados.close);
    const maximo = Math.max(...fechamentos);
    const minimo = Math.min(...fechamentos);
    const pivo = (maximo + minimo) / 2;
    const suporte = 2 * pivo - maximo;
    const resistencia = 2 * pivo - minimo;
    return { suporte, resistencia };
}

function identificarPadraoGrafico(dadosFechamento) {
    const { suporte, resistencia } = calcularSuporteResistencia(dadosFechamento);
    let padraoIdentificado = '';
    let recomenda = '';
    const ultimaVela = dadosFechamento[dadosFechamento.length - 1];
    const penultimaVela = dadosFechamento[dadosFechamento.length - 2];
    const antepenultimaVela = dadosFechamento[dadosFechamento.length - 3];

    // Padrão de Cabeça e Ombros (CO)
    if (ultimaVela.close > resistencia && penultimaVela.close > resistencia && antepenultimaVela.close > resistencia) {
        if (ultimaVela.high > penultimaVela.high && ultimaVela.low > penultimaVela.low &&
            antepenultimaVela.high > penultimaVela.high && antepenultimaVela.low > penultimaVela.low) {
            padraoIdentificado = 'Cabeça e Ombros (Topo)';
        } else if (ultimaVela.high < penultimaVela.high && ultimaVela.low < penultimaVela.low &&
            antepenultimaVela.high < penultimaVela.high && antepenultimaVela.low < penultimaVela.low) {
            padraoIdentificado = 'Cabeça e Ombros Invertido (Fundo)';
        }
    }

    // Padrão de Triângulo
    if (ultimaVela.close > resistencia && penultimaVela.close < suporte &&
        ultimaVela.high > penultimaVela.high && ultimaVela.low > penultimaVela.low) {
        padraoIdentificado = 'Triângulo (Altista)';
    } else if (ultimaVela.close < suporte && penultimaVela.close > resistencia &&
        ultimaVela.high < penultimaVela.high && ultimaVela.low < penultimaVela.low) {
        padraoIdentificado = 'Triângulo (Baixista)';
    }

    // Padrão de Retângulo
    if (ultimaVela.close > resistencia && penultimaVela.close > resistencia &&
        ultimaVela.low > resistencia && penultimaVela.low > resistencia &&
        ultimaVela.high < resistencia && penultimaVela.high < resistencia) {
        padraoIdentificado = 'Retângulo (Topo)';
    } else if (ultimaVela.close < suporte && penultimaVela.close < suporte &&
        ultimaVela.high < suporte && penultimaVela.high < suporte &&
        ultimaVela.low > suporte && penultimaVela.low > suporte) {
        padraoIdentificado = 'Retângulo (Fundo)';
    }
    // Padrão de Martelo
    if (ultimaVela.close > ultimaVela.open &&
        (ultimaVela.close - ultimaVela.open) < (0.25 * (ultimaVela.high - ultimaVela.low)) &&
        (ultimaVela.high - ultimaVela.close) < (2 * (ultimaVela.open - ultimaVela.close)) &&
        (ultimaVela.high - ultimaVela.close) < (2 * (ultimaVela.high - ultimaVela.open))) {
        padraoIdentificado = 'Martelo';
        recomenda = 'Compra';
    }

    // Padrão de Estrela Cadente
    if (penultimaVela.close > ultimaVela.close && penultimaVela.open > ultimaVela.open &&
        ultimaVela.close < ultimaVela.open && ultimaVela.open > penultimaVela.close &&
        (ultimaVela.open - ultimaVela.close) < (0.25 * (ultimaVela.high - ultimaVela.low)) &&
        (ultimaVela.high - ultimaVela.open) < (2 * (ultimaVela.close - ultimaVela.open)) &&
        (ultimaVela.high - ultimaVela.open) < (2 * (ultimaVela.high - ultimaVela.close))) {
        padraoIdentificado = 'Estrela Cadente';
        recomenda = 'Venda';
    }

    // Padrão de Engolfo de alta
    if (penultimaVela.close < ultimaVela.open &&
        penultimaVela.open > ultimaVela.close &&
        penultimaVela.low < ultimaVela.low &&
        penultimaVela.high > ultimaVela.high) {
        padraoIdentificado = 'Engolfo de alta';
        recomenda = 'Compra';
    }

    // Padrão de Fundo Duplo
    if (ultimaVela.close < resistencia && penultimaVela.close < resistencia &&
        ultimaVela.high > resistencia && penultimaVela.high > resistencia &&
        ultimaVela.low < resistencia && penultimaVela.low < resistencia) {
        padraoIdentificado = 'Fundo Duplo';
        recomenda = 'Compra';
    }

    // Padrão de Engolfo de baixa
    if (penultimaVela.close > ultimaVela.open &&
        penultimaVela.open < ultimaVela.close &&
        penultimaVela.high > ultimaVela.high &&
        penultimaVela.low < ultimaVela.low) {
        padraoIdentificado = 'Engolfo de baixa';
        recomenda = 'Venda';
    }

    return {
        padraoIdentificado, recomenda, suporte, resistencia, ultimaVela
    };
}


function getStrategyTwo(candles) {

    // Verificar se há pelo menos 3 velas disponíveis para cálculos
    if (candles.length < 3) {
        return "0";
    }
    const st1 = getStrategyOne(candles);
    if (st1 != '0') {
        // Última vela
        const velaAtual = candles[candles.length - 1];
        // Segunda última vela
        const velaAnterior = candles[candles.length - 2];
        // se compra, verificar se histogram é positivo se macd maior que signal se ema9 maior que ema21
        if (
            velaAtual.ema9 > velaAtual.ema21 && // EMA9 acima da EMA21
            velaAnterior.ema9 <= velaAnterior.ema21 && // EMA9 cruzou abaixo da EMA21 na vela anterior
            velaAtual.histogram > 0 // Histogram positivo
        ) {
            return "Recomendação de COMPRA";
        }
        // se venda, verificar se macd menor que signal se ema9 menor que ema21
        if (
            velaAtual.ema9 < velaAtual.ema21 && // EMA9 abaixo da EMA21
            velaAnterior.ema9 >= velaAnterior.ema21 && // EMA9 cruzou acima da EMA21 na vela anterior
            velaAtual.histogram < 0 // Histogram negativo
        ) {
            return "Recomendação de VENDA.";
        }

        return "0";
    }
}

function getPairs() {
    return new Promise(async (resolve, reject) => {
        try {
            const coins = await getRecCoins();
            const quotes = await getAllowedQuote();

            const coinValues = JSON.parse(coins[0].value);
            const quoteValues = JSON.parse(quotes[0].value);

            const pairs = [];

            for (const coin of coinValues) {
                for (const quote of quoteValues) {
                    const pair = coin + quote;
                    pairs.push(pair);
                }
            }
            resolve(pairs);
        } catch (error) {
            reject(error);
        }
    });
}

function obterValorPorChave(vetor, chave) {
    for (let i = 0; i < vetor.length; i++) {
        if (vetor[i][chave] !== undefined) {
            return vetor[i][chave];
        }
    }
    return false;
}

function atualizarValorPorChave(vetor, chave, valor) {
    let encontrado = false;
    for (let i = 0; i < vetor.length; i++) {
        if (vetor[i][chave] !== undefined) {
            vetor[i][chave] = valor;
            encontrado = true;
            break;
        }
    }
    if (!encontrado) {
        vetor.push({ [chave]: valor });
    }
}

function tendencia_alta_ema9(velas, margemPercentual) {
    const quantidadeDeVelas = velas.length;

    const ultimaVela = velas[quantidadeDeVelas - 1];
    const segundaVela = velas[quantidadeDeVelas - 2];
    const primeiraVela = velas[quantidadeDeVelas - 3];

    // Converte a margem de porcentagem em um multiplicador
    const margem = margemPercentual / 100;

    if (
        primeiraVela.close > primeiraVela.ema9 &&
        segundaVela.close <= segundaVela.ema9 * (1 + margem) &&
        segundaVela.close >= segundaVela.ema9 * (1 - margem) &&
        ultimaVela.close > ultimaVela.ema9
    ) {
        return true;
    }

    return false;
}

function tendencia_alta_ema21(velas, margemPercentual) {
    const quantidadeDeVelas = velas.length;

    if (quantidadeDeVelas < 3) {
        console.error("A função requer pelo menos 3 velas para análise.");
        return false;
    }

    const ultimaVela = velas[quantidadeDeVelas - 1];
    const segundaVela = velas[quantidadeDeVelas - 2];
    const primeiraVela = velas[quantidadeDeVelas - 3];

    // Converte a margem de porcentagem em um multiplicador
    const margem = margemPercentual / 100;

    if (
        primeiraVela.close > primeiraVela.ema21 &&
        segundaVela.close <= segundaVela.ema21 * (1 + margem) &&
        segundaVela.close >= segundaVela.ema21 * (1 - margem) &&
        ultimaVela.close > ultimaVela.ema21
    ) {
        return true;
    }

    return false;
}

async function sendTelegramMsg(TELEGRAM_BOT_TOKEN, MSG, chat_id) {
    const axios = require('axios');
    try {
        const resposta = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: chat_id,
                text: MSG
            }
        );
        console.log(resposta.data);
    } catch (erro) {
        console.error(erro);
    }
}

async function sendTelegramMsgAnyIds(TELEGRAM_BOT_TOKEN, MSG, chat_ids) {
    const axios = require('axios');
    const ids = chat_ids.split(';');
    for (const chat_id of ids) {
        try {
            const resposta = await axios.post(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                {
                    chat_id: chat_id,
                    text: MSG
                }
            );
            console.log(resposta.data);
        } catch (erro) {
            console.error(erro);
        }
    }
}

async function getNewOperID() {
    const {  getDtOperByOperID } = require("./execQuery");
    const crypto = require('crypto');
    const { promisify } = require('util');
    const randomBytesAsync = promisify(crypto.randomBytes);
    let HID, c;
    const prefix = 'DT';

    do {
        HID = prefix + (await randomBytesAsync(4)).toString('hex').toUpperCase().substring(4, 12);
        if (!isNaN(HID.substring(2))) {
            const result = await getDtOperByOperID(HID);
            c = result.length;
        } else {
            c = true;
        }
    } while (c);

    return HID;
}

function getLastCandle(candles) {
    // Verifica se o array de candles não está vazio
    if (candles && candles.length > 0) {
        // Retorna o último elemento do array
        return candles[candles.length - 1];
    } else {
        // Retorna null se o array estiver vazio
        return null;
    }
}

function calcPercentage(value, percentage, decimalPlaces) {
    // Calcula o valor da porcentagem
    const percentageValue = value * (percentage / 100);
    
    // Adiciona ou subtrai a porcentagem do valor original
    const adjustedValue = value + percentageValue;
    
    // Retorna o valor ajustado, arredondado para o número especificado de casas decimais
    return +adjustedValue.toFixed(decimalPlaces);
}

module.exports = {
    getFortunaIndicatorFromCandlesticks,
    getLastFortunaCandle,
    getFortunaConfirmation,
    sendTelegramMsg,
    sendTelegramMsgAnyIds,
    getIndicatorsFromCandlesticks,
    getStrategyOne,
    strategysAnalysis,
    identificarPadraoGrafico,
    getStrategyTwo,
    calcularSuporteResistencia,
    getPairs,
    obterValorPorChave,
    atualizarValorPorChave,
    tendencia_alta_ema9,
    tendencia_alta_ema21,
    sendTelegramMsg,
    sendTelegramMsgAnyIds,
    getNewOperID,
    getLastCandle,
    calcPercentage
}