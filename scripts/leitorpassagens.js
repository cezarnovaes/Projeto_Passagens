const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const path = require('path')

// Função para ler o arquivo JSON
function readJsonFile(filePath) {
    try {
        // Tenta ler o arquivo e retornar os dados como JSON
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        // Verifica o tipo de erro e retorna uma mensagem apropriada
        if (error.code === "ENOENT") {
            // Arquivo não encontrado
            return { error: "O arquivo não foi encontrado. Certifique-se de que ele existe no caminho especificado." };
        } else if (error.name === "SyntaxError") {
            // Erro de JSON inválido
            return { error: "Erro ao processar o arquivo. O conteúdo não está em formato JSON válido." };
        } else {
            // Outros erros
            return { error: `Erro ao ler o arquivo: ${error.message}` };
        }
    }
}

// Função para criar o URL da oferta
function generateOfferURL(deal, from, to, departureDate) {
    const offerToken = encodeURIComponent(deal.offerToken);
    return `https://flights.booking.com/flights/${from}-${to}/${offerToken}/?type=ONEWAY&adults=1&cabinClass=ECONOMY&sort=${deal.key}&depart=${departureDate}&from=${from}&to=${to}&ca_source=flights_index_cf&aid=304142&label=gen173bo-1DEg1mbGlnaHRzX2luZGV4KIICQgVpbmRleEgfWANoIIgBAZgBH7gBF8gBDNgBA-gBAfgBBogCAZgCAqgCA7gCwc-6vAbAAgHSAiQ2OTFmZWI3MS0wMWMyLTQ5ZjUtYjRkNS1mMWU5MTNiOWZlY2PYAgTgAgE&adplat=www-index-web_shell_header-flight-missing_creative-667NpvkQmtT1JuwQgDaItj`;
}

// Função para gerar mensagens detalhadas
function generateWhatsAppMessages(data) {
    const messages = [];

    data.forEach((entry) => {
        const flightDeals = entry.data.flightDeals || [];

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

                messages.push(`
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
    });

    return messages;
}

// Função principal
async function runLeitorPassagens(config, logCallback) {
    const controller = new AbortController();
    const { signal } = controller;
    const diretorioAtual = __dirname.split('scripts')[0]
    const caminhoLog = path.join(diretorioAtual, 'logs')
    const caminhoArquivo = path.join(caminhoLog, 'PASSAGENS')
    const caminhoPassagens = path.join(caminhoArquivo, 'passagensResult.json')
    const data = readJsonFile(caminhoPassagens)

    if (data.error) {
        console.error(data.error);
        return; // Encerra a execução, evitando falhas posteriores
    }

    function log(texto) {
        if (texto != null) {
            console.log(texto)
            if (logCallback) {
                logCallback(texto)
            }
        }
    }

    async function sendTelegramMessage(botToken, chatId, message) {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;
        try {
            const response = await axios.get(url, { timeout: 90000 });
            log(`Mensagem enviada no Telegram com sucesso!`)
            if (response.data.ok) {
            } else {
                log("Erro ao enviar mensagem:", response.data.description);
            }
        } catch (error) {
            log("Erro na requisição telegram:", error.message);
        }
    }

    // Configurar cliente WhatsApp
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: "client3" }),  // Cria uma nova sessão ou usa uma existente com um clientId único
        puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true } // Opcional: Torne o navegador headless
    })

    // Mostrar o QR code para autenticação
    client.on("qr", (qr) => {
        qrcode.generate(qr, { small: true })
    })

    client.on("ready", async () => {
        log("Cliente WhatsApp está pronto!");

        // Obter a lista de chats/grupos
        const chats = await client.getChats();
        // log(chats)
        log(`${chats.length} Chats encontrados no WhatsApp, filtrando grupo "Teste1"`)
        // Filtrar apenas grupos
        // chats.forEach(c => {log(c.name + " - " + c.id._serialized)})
        const grupo = chats.find(chat => chat.name == "Teste1")

        if (grupo) {
            const groupId = grupo.id._serialized;
            // Gerar as mensagens detalhadas
            const messages = generateWhatsAppMessages(data);
            // log('Enviando mensagens para o grupo: ' + grupo.name + " < Id >: " + groupId)
            // log(messages)
            for (mes in messages) {
                if (signal.aborted) throw new Error('Execução cancelada pelo usuário.');
                try {
                    // Enviar as mensagens para o grupo - 120363390566540905@g.us Teste1
                    log(`Enviando mensagem programada ${(parseInt(mes)	 + 1)}`)
                    await client.sendMessage(groupId, messages[mes])
                    log(`Mensagem para WhatsApp envidada com sucesso!`)
                    await sendTelegramMessage('7874360588:AAGYphRhJGd8NWMZ2bk_eIWrZ4zivKEOUTM', '-1002352411246', messages[mes])
                    await sleep(100)
                } catch (error) {
                    log('Erro ao enviar mensagem para o grupo: ' + error)
                }
            }
            log('Finalizando...')
            client.destroy();
        } else {
            client.destroy();
            log("Nenhum grupo encontrado!")
            log('Finalizando...')
        }

    })

    // client.on("message", (message) => {
    //     log(`Message received from ${message.from}: ${message.body}`)
    // })

    client.on("authenticated", () => {
        log("Cliente autenticado com sucesso!")
    })

    client.on("auth_failure", (msg) => {
        console.error("Falha na autenticação:", msg)
    })

    client.on("disconnected", (reason) => {
        log("Cliente desconectado:", reason)
    })

    // Inicializar o cliente
    client.initialize()
    return { status: 'success', message: 'Crawler concluído.' };
}
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

module.exports = { runLeitorPassagens, createControllerLeitor: () => new AbortController() };