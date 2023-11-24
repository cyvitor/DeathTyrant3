const fs = require('fs');

function escreveLog(msg, file) {
    const dataHora = new Date().toLocaleString();
    const texto = `${dataHora} - ${msg}\n`;
    console.log(texto);
    fs.appendFile(file, texto, err => {
        if (err) throw err;
    });
}

function escreveLogJson(txt, msg, file) {
    const dataHora = new Date().toLocaleString();
    const objetoString = JSON.stringify(msg);
    const texto = `${dataHora} - ${txt} - ${objetoString}\n`;
    console.log(texto);
    fs.appendFile(file, texto, err => {
        if (err) throw err;
    });
}

module.exports = {
    escreveLog,
    escreveLogJson
}