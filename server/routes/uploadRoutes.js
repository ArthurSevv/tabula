import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ---------------------------------------------------------
// configuracao do armazenamento (multer)
// ---------------------------------------------------------

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // define a pasta onde os arquivos serao salvos
    // process.cwd() pega a raiz de onde o servidor esta rodando
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: function (req, file, cb) {
    // cria um sufixo unico com data e numero aleatorio
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // remove espacos do nome original para evitar quebra de url
    const cleanName = file.originalname.replace(/\s+/g, '_');
    
    cb(null, uniqueSuffix + '-' + cleanName);
  }
});

const upload = multer({ storage });

// ---------------------------------------------------------
// rotas
// ---------------------------------------------------------

// post /api/uploads
// rota protegida: apenas usuarios logados podem fazer upload
router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'nenhum arquivo enviado.' });
  }

  // constroi a url completa para acesso web
  // ex: http://localhost:3000/uploads/nome-do-arquivo.jpg
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
  res.status(201).json({ url: fileUrl });
});

export default router;