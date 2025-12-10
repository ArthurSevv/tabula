import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// garante que as variaveis de ambiente estejam carregadas
dotenv.config();

const generateToken = (id) => {
    // define a chave secreta (usa um fallback para desenvolvimento se nao houver .env)
    const secret = process.env.JWT_SECRET || 'dev_secret_tabula_fallback_change_in_prod';

    // alerta no console se estiver usando a chave insegura
    if (!process.env.JWT_SECRET) {
        console.warn('aviso: jwt_secret nao definido. usando segredo de desenvolvimento.');
    }

    // gera o token assinado com validade de 30 dias
    return jwt.sign({ id }, secret, {
        expiresIn: '30d',
    });
};

export default generateToken;