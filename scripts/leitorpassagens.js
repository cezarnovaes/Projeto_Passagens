const fs = require("fs");
const axios = require("axios");
const path = require('path')

// Função para criar o URL da oferta
function generateOfferURL(deal, from, to, departureDate) {
    const offerToken = encodeURIComponent(deal.offerToken);
    return `https://flights.booking.com/flights/${from}-${to}/${offerToken}/?type=ONEWAY&adults=1&cabinClass=ECONOMY&sort=${deal.key}&depart=${departureDate}&from=${from}&to=${to}&ca_source=flights_index_cf&aid=304142&label=gen173bo-1DEg1mbGlnaHRzX2luZGV4KIICQgVpbmRleEgfWANoIIgBAZgBH7gBF8gBDNgBA-gBAfgBBogCAZgCAqgCA7gCwc-6vAbAAgHSAiQ2OTFmZWI3MS0wMWMyLTQ5ZjUtYjRkNS1mMWU5MTNiOWZlY2PYAgTgAgE&adplat=www-index-web_shell_header-flight-missing_creative-667NpvkQmtT1JuwQgDaItj`;
}

// Função principal
async function runLeitorPassagens(config, logCallback) {
    const controller = new AbortController();
    const { signal } = controller;
    const diretorioAtual = __dirname.split('scripts')[0]
    const caminhoLog = path.join(diretorioAtual, 'logs')
    const caminhoArquivo = path.join(caminhoLog, 'passagens')
    const caminhoPassagens = path.join(caminhoArquivo, 'passagensResult.json')
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

    function generateWhatsAppMessages(data) {
        const messages = [];
    
        data.forEach((entry) => {
            const flightDeals = entry.data.flightDeals || [];
            if (flightDeals.length > 0) {
                flightDeals.forEach((deal) => {
                    if (deal.key === "BEST") {
                        const price = deal.price.units + deal.price.nanos / 1e9;
                        const currency = deal.price.currencyCode;
                        const from = entry.url.match(/from=([^&]+)/)[1];
                        const to = entry.url.match(/to=([^&]+)/)[1];
                        const departureDate = entry.url.match(/depart=([^&]+)/)[1];
                        const cabinClass = entry.data.searchCriteria.cabinClass || "ECONOMY";
                        const taxes = deal.travellerPrices[0].travellerPriceBreakdown.tax.units;
                        const baseFare = deal.travellerPrices[0].travellerPriceBreakdown.baseFare.units;
    
                        // Gerar o URL da oferta
                        const offerUrl = generateOfferURL(deal, from, to, departureDate);
    
                        messages.push(`${config.messageText}
✈️ *Oferta de Viagem - Melhores Condições!*
🌍 Rota: *${decodeURIComponent(from)} ➡️ ${decodeURIComponent(to)}*
📅 Data de Partida: *${departureDate}*
🛏️ Classe: *${cabinClass}*
💸 Preço Total: *${currency} ${price.toFixed(2)}*
🔍 Base Fare: *${currency} ${baseFare}*
🧾 Taxas: *${currency} ${taxes}*

🌟 Aproveite esta oferta incrível para sua próxima viagem! 
🔗 Confira todos os detalhes e reserve agora: ${offerUrl}`
                        );
                    }
                });
            } else {
                messages.push(`Nenhum voo encontrado com a data de saída: ${entry.url.split("depart=")[1].split("&return=")[0]} e data de retorno: ${entry.url.split("return=")[1].split("&from=")[0]}`);
            }
        });
    
        return messages;
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

    const mensagens = generateWhatsAppMessages(data)

    return { status: 'success', message: mensagens }
}
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))

module.exports = { runLeitorPassagens, createControllerLeitor: () => new AbortController() }