const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const axios = require("axios");

// Função principal
async function runLeitorPassagens(config, logCallback) {
    const controller = new AbortController();
    const { signal } = controller;

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
        // qrcode.generate(qr, { small: true }, (qrcode) => {
        //     log(qrcode);
        // });
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
                for (mes in messages) {
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

    // Inicializar o cliente
    client.initialize()
    return { status: 'success', message: 'Envio de mensagens concluído.' }
}
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))

module.exports = { runLeitorPassagens, createControllerLeitor: () => new AbortController() }