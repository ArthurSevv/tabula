import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Ensure environment variables are loaded (safe for cases where imports run before index.js calls dotenv)
dotenv.config();

const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || 'dev_secret_tabula_fallback_change_in_prod';
    if (!process.env.JWT_SECRET) {
        console.warn('Warning: JWT_SECRET not set in environment — using fallback secret for development.');
    }

    try {
        return jwt.sign({ id }, secret, {
            expiresIn: '30d',
        });
    } catch (err) {
        console.error('Failed to generate JWT token:', err);
        throw new Error('Erro ao gerar token de autenticação.');
    }
};

export default generateToken;