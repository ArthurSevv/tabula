import express from 'express';
import { getWallById, createWall, getUserWalls, deleteWall, updateWall, getPublicWall, generateShareLink } from '../controllers/wallController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rota pública para compartilhar o mural
router.get('/share/:id', getPublicWall);

// Gera (ou regenera) um shareLink para o mural (protegido)
router.post('/:id/share', protect, generateShareLink);

router.get('/', protect, getUserWalls);
router.post('/', protect, createWall);
router.get('/:id', protect, getWallById);
router.delete('/:id', protect, deleteWall);
router.put('/:id', protect, updateWall);

export default router;