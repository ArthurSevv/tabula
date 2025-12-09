import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import generateToken from '../utils/generateToken.js';

const prisma = new PrismaClient();

export async function registerUser(req, res) {
    const { name, email, password } = req.body;

    try {
        if(!name || !email || !password) {
            return res.status(400).json ({ message: "Por favor, preencha todos os campos"})
        }
        
        const userExist = await prisma.user.findUnique({ where: { email }})

        if(userExist){
            return res.status(400).json({ message: 'O email já está em uso' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({ data: {
            name,
            email,
            hashedPassword: hash
        }})

        return res.status(201).json({ 
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl || null,
            token: generateToken(user.id)
        })
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
}

export async function loginUser(req, res) {
    try {
        const { email, password } = req.body

        if(!email || !password) {
            return res.status(400).json ({ message: "Por favor, preencha todos os campos"})
        }
        
        const userExist = await prisma.user.findUnique({ where: { email }})

        if(!userExist){
            return res.status(400).json({ message: 'Credenciais inválidas' });
        }

        const isMatch = await bcrypt.compare(password, userExist.hashedPassword);

        if(!isMatch){
            return res.status(400).json({ message: 'Credenciais inválidas' });
        }

        return res.status(200).json({
            id: userExist.id,
            name: userExist.name,
            email: userExist.email,
            avatarUrl: userExist.avatarUrl || null,
            token: generateToken(userExist.id)
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
}

export async function updateAvatar(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        if (parseInt(id) !== userId) return res.status(403).json({ message: 'Acesso negado.' });

        const { avatarUrl } = req.body;
        if (!avatarUrl) return res.status(400).json({ message: 'avatarUrl obrigatório.' });

        const updated = await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });

        return res.status(200).json({ id: updated.id, name: updated.name, email: updated.email, avatarUrl: updated.avatarUrl });
    } catch (err) {
        console.error('Erro ao atualizar avatar:', err);
        return res.status(500).json({ message: 'Erro interno' });
    }
}