const tulind = require('tulind');
const moment = require('moment-timezone');
const { getRecCoins, getAllowedQuote } = require('./execQuery');
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

function calcularTendenciaAltaEma9(velas, priceTolerance) {
    for (let i = 2; i < velas.length; i++) {
        const velaAtual = velas[i];
        const velaAnterior = velas[i - 1];
        const velaAntesDaAnterior = velas[i - 2];

        // Verifica se o preço está acima da EMA9 na vela anterior com tolerância
        const acimaDaEma9Anterior = velaAnterior.close > velaAnterior.ema9 * (1 - priceTolerance / 100);

        // Verifica se o preço tocou na EMA9 na vela atual fora da faixa de tolerância
        const tocouNaEma9Atual = velaAtual.close > velaAtual.ema9 * (1 + priceTolerance / 100);

        // Verifica se o preço está acima da EMA9 na vela seguinte com tolerância
        const acimaDaEma9Seguinte = velas[i + 1] && velas[i + 1].close > velas[i + 1].ema9 * (1 - priceTolerance / 100);

        // Define o indicador tendencia_alta_ema9
        velaAtual.tendencia_alta_ema9 = acimaDaEma9Anterior && tocouNaEma9Atual && acimaDaEma9Seguinte;
    }

    // As duas últimas velas não têm uma vela seguinte suficiente, então removemos o indicador
    velas[velas.length - 1].tendencia_alta_ema9 = undefined;
    velas[velas.length - 2].tendencia_alta_ema9 = undefined;

    // Calcula o indicador para as duas últimas velas
    if (velas.length >= 2) {
        const penultimaVela = velas[velas.length - 2];
        const ultimaVela = velas[velas.length - 1];

        const acimaDaEma9Penultima = penultimaVela.close > penultimaVela.ema9 * (1 - priceTolerance / 100);
        const tocouNaEma9Ultima = ultimaVela.close > ultimaVela.ema9 * (1 + priceTolerance / 100);

        ultimaVela.tendencia_alta_ema9 = acimaDaEma9Penultima && tocouNaEma9Ultima;
    }

    return velas;
}

function calcularTendenciaAltaEma21(velas, priceTolerance) {
    for (let i = 2; i < velas.length; i++) {
        const velaAtual = velas[i];
        const velaAnterior = velas[i - 1];
        const velaAntesDaAnterior = velas[i - 2];

        // Verifica se o preço está acima da EMA21 na vela anterior com tolerância
        const acimaDaEma21Anterior = velaAnterior.close > velaAnterior.ema21 * (1 - priceTolerance / 100);

        // Verifica se o preço tocou na EMA21 na vela atual fora da faixa de tolerância
        const tocouNaEma21Atual = velaAtual.close > velaAtual.ema21 * (1 + priceTolerance / 100);

        // Verifica se o preço está acima da EMA21 na vela seguinte com tolerância
        const acimaDaEma21Seguinte = velas[i + 1] && velas[i + 1].close > velas[i + 1].ema21 * (1 - priceTolerance / 100);

        // Define o indicador tendencia_alta_ema21
        velaAtual.tendencia_alta_ema21 = acimaDaEma21Anterior && tocouNaEma21Atual && acimaDaEma21Seguinte;
    }

    // As duas últimas velas não têm uma vela seguinte suficiente, então removemos o indicador
    velas[velas.length - 1].tendencia_alta_ema21 = undefined;
    velas[velas.length - 2].tendencia_alta_ema21 = undefined;

    // Calcula o indicador para as duas últimas velas
    if (velas.length >= 2) {
        const penultimaVela = velas[velas.length - 2];
        const ultimaVela = velas[velas.length - 1];

        const acimaDaEma21Penultima = penultimaVela.close > penultimaVela.ema21 * (1 - priceTolerance / 100);
        const tocouNaEma21Ultima = ultimaVela.close > ultimaVela.ema21 * (1 + priceTolerance / 100);

        ultimaVela.tendencia_alta_ema21 = acimaDaEma21Penultima && tocouNaEma21Ultima;
    }

    return velas;
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
    calcularTendenciaAltaEma9,
    calcularTendenciaAltaEma21
}