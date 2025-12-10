import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const protect = async (req, res, next) => {
    let token;

    // verifica se o cabecalho de autorizacao existe e comeca com bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // extrai o token da string "bearer <token>"
            token = req.headers.authorization.split(' ')[1];

            // define a chave secreta (mesma logica do generatetoken)
            const secret = process.env.JWT_SECRET || 'dev_secret_tabula_fallback_change_in_prod';

            // decodifica e verifica a validade do token
            const decoded = jwt.verify(token, secret);

            // busca o usuario no banco (sem retornar a senha) e anexa a requisicao
            req.user = await prisma.user.findUnique({ 
                where: { id: decoded.id }, 
                select: { id: true, name: true, email: true }
            });

            // seguranca extra: se o token for valido, mas o usuario foi deletado do banco
            if (!req.user) {
                return res.status(401).json({ message: 'usuario nao encontrado.' });
            }

            next();
        } catch (error) {
            console.error('erro de autenticacao:', error.message);
            return res.status(401).json({ message: 'nao autorizado, token falhou' });
        }
    }

    // se nao encontrou token nenhum no cabecalho
    if (!token) {
        return res.status(401).json({ message: 'nao autorizado, sem token' });
    }
};