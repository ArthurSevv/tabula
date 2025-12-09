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

dotenv.config();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// serve uploaded files (uploads folder is inside the server working dir)
app.use('/uploads', express.static('uploads'));

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
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setIo(io);

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});