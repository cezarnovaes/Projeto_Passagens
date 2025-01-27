const fs = require("fs");
const path = require('path')

// Função principal
async function runLeitorPassagens(config, logCallback) {

    function generateWhatsAppMessages(data) {
        const messages = []
        const listaMeses = []

        data.forEach((entry) => {
            const meses = entry.data.months || []
            if (meses.length > 0) {
                meses.forEach((deal) => {
                    if (deal.dates) {
                        const price = deal.dates[0].price
                        const currency = deal.dates[0].price_currency
                        const from = entry.data.from_city_name
                        const to = entry.data.to_city_name
                        const departureDate = deal.dates[0].departure + "/" + deal.year
                        const returnDate = deal.dates[0].arrival + "/" + deal.year
                        const offerUrl = deal.dates[0].link
    
                        messages.push(`
✈️ *Oferta de Viagem - Melhores Condições!*
🌍 Rota: *${decodeURIComponent(from)} ➡️ ${decodeURIComponent(to)}*
📅 Data de Partida: *${departureDate}*
📅 Data de Retorno: *${returnDate}*
💸 Preço Total: *${currency} ${price.toFixed(2)}*

🌟 Aproveite esta oferta incrível para sua próxima viagem! 
🔗 Confira todos os detalhes e reserve agora: ${offerUrl}`
                        )
                    }
                    listaMeses.push(deal.dates_link)
                })
            }
        })
    
        return {mais_baratas: messages, lista_meses: listaMeses}
    }
    
    function readJsonFile(filePath) {
        try {
            const data = fs.readFileSync(filePath, "utf8");
            // log(`Passagens lidas com sucesso!`)
            return JSON.parse(data);
        } catch (error) {
            if (error.code === "ENOENT") {
                log(`Arquivo de passagens não encontrado no caminho especificado: ${error.message}`)
                return { error: "O arquivo não foi encontrado. Certifique-se de que ele existe no caminho especificado." };
            } else if (error.name === "SyntaxError") {
                log(`Conteúdo do arquivo não está em formato JSON válido: ${error.message}`)
                return { error: "Erro ao processar o arquivo. O conteúdo não está em formato JSON válido." };
            } else {
                log(`Erro ao ler arquivo: ${error.message}`)
                return { error: `Erro ao ler o arquivo: ${error.message}` };
            }
        }
    }

    const controller = new AbortController();
    const { signal } = controller;

    const diretorioAtual = __dirname.split('scripts')[0]
    const caminhoLog = path.join(diretorioAtual, 'logs')
    const caminhoArquivo = path.join(caminhoLog, 'passagens')
    const caminhoPassagens = path.join(caminhoArquivo, 'cidadesPassagens.json')
    const data = readJsonFile(caminhoPassagens)
    if (data.error) {
        console.error(data.error);
        return;
    }

    function log(texto) {
        if (texto != null) {
            console.log(texto)
            if (logCallback) {
                logCallback(texto)
            }
        }
    }
    let passagens = []
    let categoriasNaoLidas = []
    for(passagem of data){
        if(passagem.status == "success"){
            passagens.push(passagem)
        }else{
            categoriasNaoLidas.push(passagem.url)
        }
    }
    const mensagens = generateWhatsAppMessages(passagens)
    console.log(JSON.stringify(mensagens.mais_baratas[0]))

    return { status: 'success', message: mensagens }
}

runLeitorPassagens(null, null)

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))

module.exports = { runLeitorPassagens, createControllerLeitor: () => new AbortController() }