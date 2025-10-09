import express from 'express';
import { createNote, updateNotePosition, updateNote, updateNoteImage, deleteNote } from '../controllers/noteController.js'
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createNote);
router.put('/:id', protect, updateNote);
router.delete('/:id', protect, deleteNote);
router.put('/:id/position', protect, updateNotePosition);
router.put('/:id/image', protect, updateNoteImage);

export default router;