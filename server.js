const express = require('express')
const puppeteer = require('puppeteer')
const bodyParser = require('body-parser')

const app = express()
const PORT = 3000

// Middleware
app.use(bodyParser.json())
app.use(express.static('public'))

// Rota para buscar locais usando Puppeteer
app.get('/api/fetch-locations', async (req, res) => {
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

        // Adiciona os itens retornados à lista da letra
        if (Array.isArray(response)) {
          results[letter].push(...response);
        } else {
          console.warn(`Unexpected response format for ${letter}:`, response);
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${letter}: ${error.message}`);
        results[letter] = [];
      }
    }

    await browser.close(); // Fecha o navegador
    res.status(200).json(results); // Retorna os resultados como JSON
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).send({ error: 'Erro ao buscar locais.' });
  }
});


// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`)
});
