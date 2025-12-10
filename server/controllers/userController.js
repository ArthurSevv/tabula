import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import generateToken from '../utils/generateToken.js';

const prisma = new PrismaClient();

// registra um novo usuario no sistema
export async function registerUser(req, res) {
    const { name, email, password } = req.body;

    try {
        // validacao de campos obrigatorios
        if(!name || !email || !password) {
            return res.status(400).json({ message: "por favor, preencha todos os campos" })
        }
        
        // verifica se o email ja esta cadastrado
        const userExist = await prisma.user.findUnique({ where: { email }})

        if(userExist){
            return res.status(400).json({ message: 'o email ja esta em uso' });
        }

        // criptografa a senha antes de salvar
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // cria o usuario no banco de dados
        const user = await prisma.user.create({ data: {
            name,
            email,
            hashedPassword: hash
        }})

        // retorna dados publicos do usuario e o token de acesso
        return res.status(201).json({ 
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl || null,
            token: generateToken(user.id)
        })
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'erro interno ao registrar usuario' });
    }
}

// autentica um usuario existente
export async function loginUser(req, res) {
    try {
        const { email, password } = req.body

        // validacao basica
        if(!email || !password) {
            return res.status(400).json ({ message: "por favor, preencha todos os campos"})
        }
        
        // busca usuario pelo email
        const userExist = await prisma.user.findUnique({ where: { email }})

        if(!userExist){
            return res.status(400).json({ message: 'credenciais invalidas' });
        }

        // compara a senha enviada com o hash do banco
        const isMatch = await bcrypt.compare(password, userExist.hashedPassword);

        if(!isMatch){
            return res.status(400).json({ message: 'credenciais invalidas' });
        }

        // login bem sucedido: retorna dados e token
        return res.status(200).json({
            id: userExist.id,
            name: userExist.name,
            email: userExist.email,
            avatarUrl: userExist.avatarUrl || null,
            token: generateToken(userExist.id)
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'erro interno ao realizar login' });
    }
}

// atualiza a foto de perfil (avatar) do usuario
export async function updateAvatar(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // garante que o usuario so altere seu proprio perfil
        if (parseInt(id) !== userId) {
            return res.status(403).json({ message: 'acesso negado.' });
        }

        const { avatarUrl } = req.body;
        if (!avatarUrl) {
            return res.status(400).json({ message: 'url do avatar obrigatoria.' });
        }

        // atualiza no banco
        const updated = await prisma.user.update({ 
            where: { id: userId }, 
            data: { avatarUrl } 
        });

        return res.status(200).json({ 
            id: updated.id, 
            name: updated.name, 
            email: updated.email, 
            avatarUrl: updated.avatarUrl 
        });

    } catch (err) {
        console.error('erro ao atualizar avatar:', err);
        return res.status(500).json({ message: 'erro interno ao atualizar avatar' });
    }
}