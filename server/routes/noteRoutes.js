import express from 'express';
import { createNote, updateNotePosition } from '../controllers/noteController.js'
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createNote);
router.put('/:id/position', protect, updateNotePosition);

export default router;