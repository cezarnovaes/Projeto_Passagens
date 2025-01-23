const express = require('express')
const puppeteer = require('puppeteer')
const bodyParser = require('body-parser')

const app = express()
const PORT = 3000

let isCrawlerRunning = false;
let isLeitorPassagensRunning = false;
let crawlerProcess = null;
let leitorPassagensProcess = null;

// Middleware
app.use(bodyParser.json())
app.use(express.static('public')) 
app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }))

app.post('/api/run-crawler', async (req, res) => {
  const config = req.body; // Configurações enviadas pela página
  if (isCrawlerRunning) {
    return res.status(400).json({ status: 'error', message: 'Crawler já está em execução.' });
  }
  const { createController, runCrawler } = require('./scripts/crawlerbooking');
  const controller = createController();

  crawlerProcess = controller;
  isCrawlerRunning = true;

  try {
      const result = await runCrawler(config);
      isCrawlerRunning = false;
      res.status(200).json(result);
  } catch (error) {
      console.error('Erro ao executar o crawler:', error.message);
      isCrawlerRunning = false;
      res.status(500).json({ status: 'error', message: error.message });
  }
});

// Rota para executar o leitor de passagens com configurações
app.post('/api/run-leitor-passagens', async (req, res) => {
  const config = req.body; // Configurações enviadas pela página

  if (isLeitorPassagensRunning) {
    return res.status(400).json({ status: 'error', message: 'Leitor já está em execução.' });
  }
  const { createController, runLeitorPassagens } = require('./scripts/leitorpassagens');
  const controller = createController();

  leitorPassagensProcess = controller;
  isLeitorPassagensRunning = true;

  try {
      const result = await runLeitorPassagens(config);
      isLeitorPassagensRunning = false;
      res.status(200).json(result);
  } catch (error) {
      console.error('Erro ao executar o leitor de passagens:', error.message);
      isLeitorPassagensRunning = false;
      res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/stop-robos', async (req, res) => {
  const { target } = req.body; // 'crawler' ou 'leitor'
  try {
      if (target === 'crawler' && isCrawlerRunning) {
          crawlerProcess.abort(); // Método para abortar o crawler
          isCrawlerRunning = false;
          res.status(200).json({ status: 'success', message: 'Crawler parado com sucesso!' });
      } else if (target === 'leitor' && isLeitorPassagensRunning) {
          leitorPassagensProcess.abort(); // Método para abortar o leitor
          isLeitorPassagensRunning = false;
          res.status(200).json({ status: 'success', message: 'Leitor de passagens parado com sucesso!' });
      }else if(target === 'todos' && isCrawlerRunning && isLeitorPassagensRunning){
        leitorPassagensProcess.abort();
        isLeitorPassagensRunning = false;
        crawlerProcess.abort();
        isCrawlerRunning = false;
        res.status(200).json({ status: 'success', message: 'Robos parados com sucesso!' });
      }else {
          res.status(400).json({ status: 'error', message: 'Nenhum robô correspondente está em execução.' });
      }
  } catch (error) {
      console.error('Erro ao parar o robô:', error.message);
      res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/fetch-locations-booking', async (req, res) => {
  const baseURL = 'https://flights.booking.com/api/autocomplete/pt?q=';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const results = {};

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://booking.com/'); // Acessa o contexto da página

    for (const letter of alphabet) {
      const fetchURL = `${baseURL}${letter}`;
      console.log(`Fetching: ${fetchURL}`);

      try {
        // Avalia o fetch no contexto da página
        const response = await page.evaluate(async (fetchURL) => {
          return await fetch(fetchURL).then((res) => res.json());
        }, fetchURL);

        // Garante que a letra tenha uma lista inicial
        if (!results[letter]) {
          results[letter] = [];
        }

        // Adiciona itens não repetidos à lista
        if (Array.isArray(response)) {
          response.forEach((item) => {
            if (!isDuplicate(item, results)) {
              results[letter].push(item);
            }
          });
        } else {
          console.warn(`Unexpected response format for ${letter}:`, response);
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${letter}: ${error.message}`);
        results[letter] = [];
      }
    }

    // Ordena as listas de resultados: cidades primeiro, aeroportos depois
    for (const letter in results) {
      results[letter].sort((a, b) => {
        if (a.type === b.type) {
          return (a.cityName || a.name || '').localeCompare(b.cityName || b.name || '');
        }
        return a.type === "CITY" ? -1 : 1;
      });
    }

    await browser.close(); // Fecha o navegador
    res.status(200).json(results); // Retorna os resultados como JSON
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).send({ error: 'Erro ao buscar locais.' });
  }
});

// Função para verificar duplicados
function isDuplicate(item, results) {
  const itemType = item.type;
  const itemCode = item.code;

  // Percorre todas as listas no objeto results
  for (const letter in results) {
    if (results[letter].some((existingItem) => existingItem.type === itemType && existingItem.code === itemCode)) {
      return true; // Encontrado duplicado
    }
  }

  return false; // Não há duplicados
}


// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`)
});
