import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Servidor funcionando');
})

app.get('/api/test', (req, res) => {
  res.json({ message: "Conexão com o back-end funcionando!"});
})

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});