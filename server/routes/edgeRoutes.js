import express from 'express';
import { createEdge } from '../controllers/edgeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createEdge);

export default router;