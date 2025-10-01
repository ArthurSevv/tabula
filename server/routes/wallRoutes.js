import express from 'express';
import { getWallById, createWall, getUserWalls } from '../controllers/wallController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getUserWalls);
router.post('/', protect, createWall);
router.get('/:id', protect, getWallById);

export default router;