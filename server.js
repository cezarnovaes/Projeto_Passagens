const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const puppeteer = require("puppeteer")
const bodyParser = require("body-parser")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = process.env.PORT || 3000

// Middleware
app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }))
app.use(express.static("public"))

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("Cliente conectado ao Socket.IO")
  socket.on("disconnect", () => {
    console.log("Cliente desconectado")
  })
  socket.emit("log", "Conexão com o servidor estabelecida!")
})

let isCrawlerRunning = false
let isLeitorPassagensRunning = false
let crawlerProcess = null
let leitorPassagensProcess = null

// API routes
app.post("/api/run-crawler", async (req, res) => {
  const config = req.body
  if (isCrawlerRunning) {
    return res.status(400).json({ status: "error", message: "Crawler já está em execução." })
  }
  const { createController, runCrawler } = require("./scripts/crawlerbooking")
  const controller = createController()

  crawlerProcess = controller
  isCrawlerRunning = true

  try {
    const result = await runCrawler(config, (logMessage) => {
      io.emit("log", logMessage)
    })
    isCrawlerRunning = false
    res.status(200).json(result)
  } catch (error) {
    console.error("Erro ao executar o crawler:", error.message)
    isCrawlerRunning = false
    res.status(500).json({ status: "error", message: error.message })
  }
})

app.post("/api/run-leitor-passagens", async (req, res) => {
  const config = req.body
  if (isLeitorPassagensRunning) {
    return res.status(400).json({ status: "error", message: "Leitor já está em execução." })
  }
  const { createController, runLeitorPassagens } = require("./scripts/leitorpassagens")
  const controller = createController()

  leitorPassagensProcess = controller
  isLeitorPassagensRunning = true

  try {
    const result = await runLeitorPassagens(config)
    isLeitorPassagensRunning = false
    res.status(200).json(result)
  } catch (error) {
    console.error("Erro ao executar o leitor de passagens:", error.message)
    isLeitorPassagensRunning = false
    res.status(500).json({ status: "error", message: error.message })
  }
})

app.post("/api/stop-robos", async (req, res) => {
  const { target } = req.body
  try {
    if (target === "crawler" && isCrawlerRunning) {
      crawlerProcess.abort()
      isCrawlerRunning = false
      res.status(200).json({ status: "success", message: "Crawler parado com sucesso!" })
    } else if (target === "leitor" && isLeitorPassagensRunning) {
      leitorPassagensProcess.abort()
      isLeitorPassagensRunning = false
      res.status(200).json({ status: "success", message: "Leitor de passagens parado com sucesso!" })
    } else if (target === "todos" && (isCrawlerRunning || isLeitorPassagensRunning)) {
      if (isLeitorPassagensRunning) {
        leitorPassagensProcess.abort()
        isLeitorPassagensRunning = false
      }
      if (isCrawlerRunning) {
        crawlerProcess.abort()
        isCrawlerRunning = false
      }
      res.status(200).json({ status: "success", message: "Robos parados com sucesso!" })
    } else {
      res.status(400).json({ status: "error", message: "Nenhum robô correspondente está em execução." })
    }
  } catch (error) {
    console.error("Erro ao parar o robô:", error.message)
    res.status(500).json({ status: "error", message: error.message })
  }
})

app.get("/api/fetch-locations-booking", async (req, res) => {
  const baseURL = "https://flights.booking.com/api/autocomplete/pt?q="
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const results = {}

  try {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto("https://booking.com/")

    for (const letter of alphabet) {
      const fetchURL = `${baseURL}${letter}`
      console.log(`Fetching: ${fetchURL}`)

      try {
        const response = await page.evaluate(async (fetchURL) => {
          return await fetch(fetchURL).then((res) => res.json())
        }, fetchURL)

        if (!results[letter]) {
          results[letter] = []
        }

        if (Array.isArray(response)) {
          response.forEach((item) => {
            if (!isDuplicate(item, results)) {
              results[letter].push(item)
            }
          })
        } else {
          console.warn(`Unexpected response format for ${letter}:`, response)
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${letter}: ${error.message}`)
        results[letter] = []
      }
    }

    for (const letter in results) {
      results[letter].sort((a, b) => {
        if (a.type === b.type) {
          return (a.cityName || a.name || "").localeCompare(b.cityName || b.name || "")
        }
        return a.type === "CITY" ? -1 : 1
      })
    }

    await browser.close()
    res.status(200).json(results)
  } catch (error) {
    console.error("Error fetching locations:", error)
    res.status(500).send({ error: "Erro ao buscar locais." })
  }
})

function isDuplicate(item, results) {
  const itemType = item.type
  const itemCode = item.code

  for (const letter in results) {
    if (results[letter].some((existingItem) => existingItem.type === itemType && existingItem.code === itemCode)) {
      return true
    }
  }

  return false
}

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

