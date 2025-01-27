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
    const { createController, runCrawler } = require("./scripts/crawlerbestdestinations")
    const { createControllerLeitor, runLeitorPassagens } = require("./scripts/leitorpassagens")
    const { createControllerEnvio, runEviaMensagens } = require("./scripts/enviamensagens")

    let config = {
        senderContact: "Teste26-1",
        contacts: [{
            name: "Teste1"
        }]
    }
    console.log(`Server running on port http://localhost:${PORT}`)

    await runCrawler(config);

    console.log("Lendo resultados passagens...")

    const mensagens = await runLeitorPassagens(config);

    console.log("Enviando mensagens...")

    config.mensagens = mensagens

    const envio = await runEviaMensagens(config);

    console.log(envio)
})

