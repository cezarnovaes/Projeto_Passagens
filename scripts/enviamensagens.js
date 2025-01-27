const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");

// Função principal
async function runEnviaMensagens(config) {
    console.log("RUN")
    const controller = new AbortController();
    const { signal } = controller;

    function log(texto) {
        if (texto != null) {
            console.log(texto)
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
            log("Erro na requisição telegram:", error);
        }
    }
    // Configurar cliente WhatsApp
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: config.senderContact }),  // Cria uma nova sessão ou usa uma existente com um clientId único
        puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true } // Opcional: Torne o navegador headless
    })

    // Mostrar o QR code para autenticação
    client.on("qr", (qr) => {
        log("QR:" + qr)
        qrcode.generate(qr, { small: true }, (qrcode) => {
            log(qrcode);
        });
    })

    client.on("ready", async () => {
        log("Cliente WhatsApp está pronto!");

        // Obter a lista de chats/grupos
        const chats = await client.getChats();
        let mensagensEnviadasTelegram = false
        // log(chats)

        for(contato of config.contacts){
            const grupo = chats.find(chat => chat.name == contato.name)
            log(`______________________________________________________________`)
            log(`Filtrando contato " ${contato.name} "`)
            if (grupo) {
                const groupId = grupo.id._serialized;
                // Gerar as mensagens detalhadas
                const messages = config.mensagens
                // log('Enviando mensagens para o grupo: ' + grupo.name + " < Id >: " + groupId)
                // log(messages)
                for (mes in messages.slice(0, 2)) {
                    if (signal.aborted) throw new Error('Execução cancelada pelo usuário.');
                    try {
                        // Enviar as mensagens para o grupo - 120363390566540905@g.us Teste1
                        log(`Enviando mensagem programada: ${(parseInt(mes) + 1)}`)
                        if (messages[mes].startsWith('Nenhum voo encontrado')) {
                            log(messages[mes])
                        } else {
                            await client.sendMessage(groupId, messages[mes])
                            log(`Mensagem para WhatsApp envidada com sucesso!`)
                            if(!mensagensEnviadasTelegram){
                                await sendTelegramMessage('7874360588:AAGYphRhJGd8NWMZ2bk_eIWrZ4zivKEOUTM', '-1002352411246', messages[mes])
                            }
                            await sleep(100)
                        }
                        log(`______________________________________________________________`)
                    } catch (error) {
                        log('Erro ao enviar mensagem para o grupo: ' + error)
                        log(`______________________________________________________________`)
                    }
                }
                mensagensEnviadasTelegram = true
            } else {
                log(`Contato ${contato.name} não encontrado na lista de contatos.`)
            }
        }
        log('Finalizando...')
        client.destroy();
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

    client.initialize()
}

// runEnviaMensagens({
//     senderContact: "teste27-1",
//     contacts: [{
//         name: "Teste1"
//     }],
//     mensagens: [`
// ✈️ *Oferta de Viagem - Melhores Condições!*
// 🌍 Rota: *Florianópolis ➡️ Fort Lauderdale*
// 📅 Data de Partida: *2/2/2025*
// 📅 Data de Retorno: *10/2/2025*
// 💸 Preço Total: *R$ 2630.00*
// 🌟 Aproveite esta oferta incrível para sua próxima viagem!

// 🔗 Confira todos os detalhes e reserve agora: https://www.trackeame.com/sem-tracker-web/track?key=UT81AK9JAFEGJ4D69OVO6J673E&clt_n=mlds&clt_cc=BR&clt_cm=campaign_partnership_melhoresdestinos.com.br&clt_c=BR-V-MelhoresDestinos&clt_pr=V&utm_source=melhoresdestinos&utm_medium=viaje_com_desconto_web&u=https%3A%2F%2Fwww.decolar.com%2Fshop%2Fflights%2Fresults%2Froundtrip%2FFLN%2FMIA%2F2025-02-02%2F2025-02-10%2F1%2F0%2F0%3Fdi%3D1-0%26cabinType%3D%26utm_source%3Dmelhoresdestinos%26utm_medium%3Dviaje_com_desconto_web
//         `]
// })

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))

module.exports = { runEnviaMensagens }