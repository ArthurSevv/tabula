import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const protect = async (req, res, next) => {
    let token;

    // verifica o envio do token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            //pega o token
            token = req.headers.authorization.split(' ')[1];
            // use configured secret or fallback for development
            const secret = process.env.JWT_SECRET || 'dev_secret_tabula_fallback_change_in_prod';
            if (!process.env.JWT_SECRET) {
                console.warn('Warning: JWT_SECRET not set in environment — using fallback secret for development.');
            }

            const decoded = jwt.verify(token, secret);

            req.user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, name: true, email: true }});
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Não autorizado, token falhou' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Não autorizado, sem token' });
    }
};