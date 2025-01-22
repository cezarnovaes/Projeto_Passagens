const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

let robotRunning = false;

app.use(bodyParser.json());
app.use(express.static('public'));

// Salvar configurações
app.post('/api/save-config', (req, res) => {
  const config = req.body;
  console.log("Configurações salvas:", config);
  res.status(200).send({ message: "Configurações salvas com sucesso" });
});

// Iniciar robô
app.post('/api/start-robot', (req, res) => {
  if (robotRunning) {
    return res.status(400).send({ message: "O robô já está em execução" });
  }

  robotRunning = true;
  console.log("Robô iniciado com as configurações:", req.body);
  res.status(200).send({ message: "Robô iniciado com sucesso" });
});

// Parar robô
app.post('/api/stop-robot', (req, res) => {
  if (!robotRunning) {
    return res.status(400).send({ message: "O robô não está em execução" });
  }

  robotRunning = false;
  console.log("Robô parado.");
  res.status(200).send({ message: "Robô parado com sucesso" });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
