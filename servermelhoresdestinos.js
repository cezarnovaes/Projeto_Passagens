const express = require("express")
const http = require("http")
const bodyParser = require("body-parser")

const app = express()
const server = http.createServer(app)

const PORT = process.env.PORT || 3000

app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }))
app.use(express.static("public"))

server.listen(PORT, async () => {
    const { runCrawler } = require("./scripts/crawlerbestdestinations")
    const { runLeitorPassagens } = require("./scripts/leitorbestdestinations")
    const { runEnviaMensagens } = require("./scripts/enviamensagens")

    let config = {
        senderContact: "teste27-1",
        contacts: [
            {
                name: "Teste1"
            },
            {
                name: "Eu"
            }
        ]
    }
    console.log(`Server running on port http://localhost:${PORT}`)

    const resultCrawler = await runCrawler(config);
    
    config.melhoresPassagens = resultCrawler

    console.log("Lendo resultados passagens...")

    const mensagens = await runLeitorPassagens(config);

    console.log("Enviando mensagens...")

    config.mensagens = mensagens.message.mais_baratas

    console.log("MENSAGENS: " + config.mensagens.length)
 
    await runEnviaMensagens(config);
})

//https://passagensaereas.melhoresdestinos.com.br/api/v1/airports/origins