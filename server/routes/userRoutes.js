import express from 'express';
import { registerUser, loginUser, updateAvatar } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// update avatar (protected)
router.put('/:id/avatar', protect, updateAvatar);

export default router;