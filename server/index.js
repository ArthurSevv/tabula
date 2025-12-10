import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// importacao de rotas
import userRoutes from './routes/userRoutes.js';
import wallRoutes from './routes/wallRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import edgeRoutes from './routes/edgeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

// utilitarios
import { setIo } from './utils/io.js';

// configuracao inicial
dotenv.config();
const app = express();
const PORT = 3000;

// configuracao de caminhos (necessario para es modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------
// middlewares globais
// ---------------------------------------------------------

// configuracao de cors (permite que o front acesse o back)
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // url do vite
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-share-token'],
    credentials: true
}));

// habilita leitura de json no corpo das requisicoes
app.use(express.json());

// serve a pasta de uploads como arquivos estaticos (imagens/videos)
// garante que as midias sejam acessiveis pela url /uploads/...
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------------------------------------------
// rotas da api
// ---------------------------------------------------------

app.use('/api/users', userRoutes);
app.use('/api/walls', wallRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/edges', edgeRoutes);
app.use('/api/uploads', uploadRoutes);

// rotas de teste/saude
app.get('/', (req, res) => {
  res.send('servidor tabula rodando');
});

app.get('/api/test', (req, res) => {
  res.json({ message: "conexao com o back-end funcionando!"});
});

// ---------------------------------------------------------
// configuracao do servidor e socket.io
// ---------------------------------------------------------

const server = http.createServer(app);

// configura o socket.io com as mesmas regras de cors
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// passa a instancia do io para o utilitario de gerenciamento
setIo(io);