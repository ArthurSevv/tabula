import express from 'express';
import { createEdge, deleteEdge } from '../controllers/edgeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createEdge);
router.delete('/:id', protect, deleteEdge);

export default router;