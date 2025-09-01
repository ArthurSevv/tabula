const express = require('express');
const cors = require('cors')
const app = express();
const PORT = 3000;

app.use(cors())

app.get('/', (req, res) => {
    res.send('Servidor funcionando')
})

app.get('/api/test', (req, res) => {
  res.json({ message: "Conexão com o back-end funcionando!"})
})

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});