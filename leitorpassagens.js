const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const axios = require("axios");

// Função para ler o arquivo JSON
function readJsonFile(filePath) {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
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

async function sendTelegramMessage(botToken, chatId, message) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;

    try {
        const response = await axios.get(url);

        if (response.data.ok) {
            console.log("Mensagem enviada com sucesso!");
        } else {
            console.error("Erro ao enviar mensagem:", response.data.description);
        }
    } catch (error) {
        console.error("Erro na requisição:", error.message);
    }
}

// Função principal
async function main() {
    const filePath = "./logs/PASSAGENS/passagensResult.json"; // Substitua pelo caminho correto do arquivo JSON
    const data = readJsonFile(filePath)

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
        console.log("Cliente WhatsApp está pronto!");

        // Obter a lista de chats/grupos
        const chats = await client.getChats();
        // console.log(chats)
        console.log(`${chats.length} Chats encontrados, filtrando grupo...`)
        // Filtrar apenas grupos
        // chats.forEach(c => {console.log(c.name + " - " + c.id._serialized)})
        const grupo = chats.find(chat => chat.name == "Teste1")

        if (grupo) {
            const groupId = grupo.id._serialized;
            // Gerar as mensagens detalhadas
            const messages = generateWhatsAppMessages(data);            
            // console.log('Enviando mensagens para o grupo: ' + grupo.name + " < Id >: " + groupId)
            // console.log(messages)
            try {
                // Enviar as mensagens para o grupo - 120363390566540905@g.us Teste1
                await client.sendMessage(groupId, messages[0])
                await sendTelegramMessage('7874360588:AAGYphRhJGd8NWMZ2bk_eIWrZ4zivKEOUTM', '-1002352411246', messages[0])
                console.log('Mensagens enviadas com sucesso!')
            } catch (error) {
                console.log('Erro ao enviar mensagem para o grupo: ' + error)
            } finally {
                // Encerrar o cliente após enviar as mensagens
                console.log('Finalizando...')
                await sleep(3000)
                client.destroy();
            }
        } else {
            client.destroy();
            console.log("Nenhum grupo encontrado!")
        }
    })

    // client.on("message", (message) => {
    //     console.log(`Message received from ${message.from}: ${message.body}`)
    // })

    client.on("authenticated", () => {
        console.log("Cliente autenticado com sucesso!")
    })

    client.on("auth_failure", (msg) => {
        console.error("Falha na autenticação:", msg)
    })

    client.on("disconnected", (reason) => {
        console.log("Cliente desconectado:", reason)
    })

    // Inicializar o cliente
    client.initialize()
}

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

main();