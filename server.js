const express = require('express')
const puppeteer = require('puppeteer')
const bodyParser = require('body-parser')

const app = express()
const PORT = 3000

// Middleware
app.use(bodyParser.json())
app.use(express.static('public'))

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
