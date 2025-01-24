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
let scheduledTasks = {}

// API routes
app.post("/api/run-crawler", async (req, res) => {
  const config = req.body
  if (isCrawlerRunning) {
    return res.status(400).json({ status: "error", message: "Crawler já está em execução." })
  } else if (isLeitorPassagensRunning) {
    return res.status(400).json({ status: "error", message: "Envio de mensagens automaticas já está em execução." })
  }
  const { createController, runCrawler } = require("./scripts/crawlerbooking")
  const controllerCrawler = createController()
  crawlerProcess = controllerCrawler
  isCrawlerRunning = true

  const { createControllerLeitor, runLeitorPassagens } = require("./scripts/leitorpassagens")
  const controllerLeitor = createControllerLeitor()
  leitorPassagensProcess = controllerLeitor
  isLeitorPassagensRunning = true

  if (!config.updateInterval || config.updateInterval <= 0 || !config.messageInterval || config.messageInterval <= 0) {
    return res.status(400).json({ status: 'error', message: 'Intervalo inválido.' });
  }

  if (scheduledTasks['crawler']) {
    clearInterval(scheduledTasks['crawler']);
  } else if (scheduledTasks['leitorpassagens']) {
    clearInterval(scheduledTasks['leitorpassagens']);
  }
  res.status(200).json({ status: "success", message: "Crawler iniciado com sucesso!" })

  await runCrawler(config, (logMessage) => {
    io.emit('log', logMessage); // Envia logs ao frontend
  });

  io.emit("log", "Iniciando mensagens automaticas...")

  await runLeitorPassagens(config, (logMessage) => {
    io.emit('log', logMessage); // Envia logs ao frontend
  });
  isCrawlerRunning = false
  isLeitorPassagensRunning = false

  io.emit("log", "Intervalo de execução do robô programado: " + config.updateInterval + " min.")
  io.emit("log", "Intervalo de execução do envio de mensagens programado: " + config.messageInterval + " min.")

  scheduledTasks['crawler'] = setInterval(async () => {
    try {
      console.log('Iniciando execução automática do robô...');
      await runCrawler(config, (logMessage) => {
        io.emit('log', logMessage);
      });
    } catch (error) {
      console.error('Erro ao executar o robô automaticamente:', error.message)
      res.status(500).json({ status: "error", message: error.message })
      isCrawlerRunning = false
    }
  }, config.updateInterval * 60 * 1000);

  scheduledTasks['leitorpassagens'] = setInterval(async () => {
    try {
      console.log('Iniciando execução automática do robô...');
      await runCrawler(config, (logMessage) => {
        io.emit('log', logMessage);
      });
    } catch (error) {
      console.error('Erro ao executar o envio de mensagens automaticamente:', error.message)
      res.status(500).json({ status: "error", message: error.message })
      isLeitorPassagensRunning = false
    }
  }, config.messageInterval * 60 * 1000);

})

app.post("/api/run-leitor-passagens", async (req, res) => {
  const config = req.body
  if (isLeitorPassagensRunning) {
    return res.status(400).json({ status: "error", message: "Leitor já está em execução." })
  }
  const { createController, runLeitorPassagens } = require("./scripts/leitorpassagens")
  const controllerLeitor = createController()
  leitorPassagensProcess = controllerLeitor
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
      if (scheduledTasks['crawler']) {
        clearInterval(scheduledTasks['crawler']);
        delete scheduledTasks['crawler'];
        res.status(200).json({ status: 'success', message: 'Agendamento do robô cancelado.' });
      } else {
        res.status(400).json({ status: 'error', message: 'Nenhum agendamento de robô ativo encontrado.' });
      }
      isCrawlerRunning = false

    } else if (target === "leitor" && isLeitorPassagensRunning) {
      leitorPassagensProcess.abort()
      if (scheduledTasks['leitorpassagens']) {
        clearInterval(scheduledTasks['leitorpassagens']);
        delete scheduledTasks['leitorpassagens'];
        res.status(200).json({ status: 'success', message: 'Agendamento do robô cancelado.' });
      } else {
        res.status(400).json({ status: 'error', message: 'Nenhum agendamento de robô ativo encontrado.' });
      }
      isLeitorPassagensRunning = false
    } else if (target === "todos" && (isCrawlerRunning || isLeitorPassagensRunning)) {
      if(isCrawlerRunning){
        crawlerProcess.abort()
        if (scheduledTasks['crawler']) {
          clearInterval(scheduledTasks['crawler']);
          delete scheduledTasks['crawler'];
          res.status(200).json({ status: 'success', message: 'Agendamento do robô cancelado.' });
        } else {
          res.status(400).json({ status: 'error', message: 'Nenhum agendamento de robô ativo encontrado.' });
        }
        isCrawlerRunning = false
      }
      if(isLeitorPassagensRunning){
        leitorPassagensProcess.abort()
        if (scheduledTasks['leitorpassagens']) {
          clearInterval(scheduledTasks['leitorpassagens']);
          delete scheduledTasks['leitorpassagens'];
          res.status(200).json({ status: 'success', message: 'Agendamento do robô cancelado.' });
        } else {
          res.status(400).json({ status: 'error', message: 'Nenhum agendamento de robô ativo encontrado.' });
        }
        isLeitorPassagensRunning = false
      }
      res.status(200).json({ status: "success", message: "Robos parados com sucesso!" })
    } else {
      res.status(400).json({ status: "success", message: "Nenhum robô correspondente está em execução." })
    }
  } catch (error) {
    console.error("Erro ao parar o robô:", error.message)
    res.status(500).json({ status: "error", message: error.message })
  }
})

app.get('/api/search-locations', async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 3) {
    return res.status(400).json({ error: 'Query deve ter pelo menos 3 caracteres.' });
  }

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://booking.com/');

    // Realiza a requisição no contexto da página do Puppeteer
    const fetchURL = `https://flights.booking.com/api/autocomplete/pt?q=${encodeURIComponent(query)}`;
    const results = await page.evaluate(async (fetchURL) => {
      const response = await fetch(fetchURL);
      return await response.json();
    }, fetchURL);

    await browser.close();

    // Retorna os resultados processados
    res.status(200).json(results);
  } catch (error) {
    console.error('Erro ao buscar locais:', error);
    res.status(500).json({ error: 'Erro ao buscar locais.' });
  }
});

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
  console.log(`Server running on port http://localhost:${PORT}`)
})

