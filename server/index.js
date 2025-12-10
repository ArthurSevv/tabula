import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import userRoutes from './routes/userRoutes.js';
import wallRoutes from './routes/wallRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import edgeRoutes from './routes/edgeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { setIo } from './utils/io.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DEBUG: VAMOS VER ONDE ELE ESTÁ PROCURANDO ---
const caminhoUploads = path.join(__dirname, 'uploads');
// Se sua pasta uploads estiver FORA da pasta server (na raiz), use a linha abaixo:
// const caminhoUploads = path.join(__dirname, '../uploads'); 

console.log('------------------------------------------------');
console.log('📂 PASTA ATUAL DO INDEX.JS:', __dirname);
console.log('📂 ONDE O SERVIDOR PROCURA IMAGENS:', caminhoUploads);
console.log('------------------------------------------------');

// Serve a pasta de uploads estática
app.use('/uploads', express.static(caminhoUploads));

// --- CORREÇÃO DO CORS AQUI ---
// Configura o CORS para aceitar requisições do Front-end
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Permite localhost e IP local
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-share-token'], // Libera seus headers personalizados
    credentials: true
}));

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/walls', wallRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/edges', edgeRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

app.get('/api/test', (req, res) => {
  res.json({ message: "Conexão com o back-end funcionando!"});
});

const server = http.createServer(app);

// Configuração do Socket.io também precisa do CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

setIo(io);

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});