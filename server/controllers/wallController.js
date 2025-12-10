import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';
import { getIo } from '../utils/io.js';

const prisma = new PrismaClient();

// cria um novo mural
export async function createWall(req, res) {
    try {
        const { title, backgroundColor, backgroundImage } = req.body;
        const ownerId = req.user.id;

        if (!title) {
            return res.status(400).json({ message: "o titulo e obrigatorio."})
        }
        
        // gera um link unico de compartilhamento automaticamente
        const shareLink = crypto.randomUUID();
        
        const newWall = await prisma.wall.create({
            data: {
                title: title,
                ownerId: ownerId,
                shareLink: shareLink,
                backgroundColor: backgroundColor || '#f0f0f0',
                backgroundImage: backgroundImage || null
            }
        });

        res.status(201).json(newWall);
    } catch (error) {
        console.error("erro ao criar mural:", error);
        res.status(500).json({ message: "erro interno do servidor." });
    }
}

// busca mural por id (rota protegida)
// permite acesso se for dono OU se tiver token de compartilhamento valido
export async function getWallById(req, res) {
    try {
        const wallId = parseInt(req.params.id);
        const userId = req.user.id;
        
        // pega o token da query string ou header
        const shareLink = req.query.shareLink || req.headers['x-share-token'];

        const wall = await prisma.wall.findUnique({
            where: { id: wallId },
            include: { 
                notes: true,
                edges: true
            },
        });

        if (!wall) {
            return res.status(404).json({ message: "mural nao encontrado." });
        }

        // verificacao de seguranca:
        // permite se for dono OU se o token enviado bater com o do mural
        const isOwner = wall.ownerId === userId;
        const hasValidToken = (shareLink && wall.shareLink === shareLink);

        if (!isOwner && !hasValidToken) {
            return res.status(403).json({ message: "acesso negado." });
        }

        // anexa autores as notas para exibir no front
        const authorIds = [...new Set(wall.notes.map(n => n.authorId))].filter(Boolean);
        let authors = [];
        if (authorIds.length > 0) {
            authors = await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true, avatarUrl: true } });
        }

        const notesWithAuthor = wall.notes.map(n => ({
            ...n,
            author: authors.find(a => a.id === n.authorId) || null
        }));

        const wallWithAuthors = { 
            ...wall, 
            notes: notesWithAuthor,
            isOwner: isOwner 
        };

        res.status(200).json(wallWithAuthors);
    } catch (error) {
        console.error("erro ao buscar mural:", error);
        res.status(500).json({ message: "erro interno do servidor."})
    }
}

// lista murais do usuario logado
export async function getUserWalls(req, res) {
    try {
        const walls = await prisma.wall.findMany({
            where: { ownerId: req.user.id } 
        });
        res.status(200).json(walls);
    } catch (error) {
        res.status(500).json({ message: "erro ao buscar os murais." });
    }
}

// deleta um mural e tudo relacionado a ele
export async function deleteWall(req, res) {
    const { id: wallId } = req.params;
    const userId = req.user.id;

    try {
        const wall = await prisma.wall.findUnique({
            where: { id: parseInt(wallId) },
        });

        if (!wall) return res.status(404).json({ message: "mural nao encontrado." });
        
        // apenas o dono pode deletar o mural inteiro
        if (wall.ownerId !== userId) {
            return res.status(403).json({ message: "acesso negado."});
        }

        const wallIdInt = parseInt(wallId);
        
        // transacao para garantir que tudo seja deletado ou nada
        await prisma.$transaction([
            prisma.edge.deleteMany({ where: { wallId: wallIdInt } }),
            prisma.note.deleteMany({ where: { wallId: wallIdInt } }),
            prisma.wall.delete({ where: { id: wallIdInt } }),
        ]);
        
        return res.status(204).send();
    } catch (error) {
        console.error("erro ao deletar mural:", error);
        return res.status(500).json({ message: "erro ao deletar o mural." });
    }
}

// atualiza informacoes do mural (titulo, cor, imagem)
export async function updateWall(req, res) {
    const { id } = req.params;
    const { title, backgroundColor, backgroundImage } = req.body;
    const userId = req.user.id;

    try {
        const wallId = parseInt(id);
        const wall = await prisma.wall.findUnique({ where: { id: wallId } });

        if (!wall) return res.status(404).json({ message: "mural nao encontrado." });

        if (wall.ownerId !== userId) {
            return res.status(403).json({ message: "acesso negado." });
        }

        // monta objeto de update dinamico
        const dataToUpdate = {};
        if (title) dataToUpdate.title = title;
        if (backgroundColor) dataToUpdate.backgroundColor = backgroundColor;
        if (backgroundImage !== undefined) dataToUpdate.backgroundImage = backgroundImage;

        const updatedWall = await prisma.wall.update({
            where: { id: wallId },
            data: dataToUpdate,
        });

        // notifica mudancas visuais em tempo real
        const io = getIo();
        if (io) {
            io.to(`wall:${wallId}`).emit('wallUpdated', updatedWall);
        }

        res.status(200).json(updatedWall);
    } catch (error) {
        console.error("erro ao atualizar mural:", error);
        res.status(500).json({ message: "erro ao atualizar o mural." });
    }
}

// busca mural publico (rota liberada, somente leitura)
export async function getPublicWall(req, res) {
    try {
        const wallId = parseInt(req.params.id);
        const wall = await prisma.wall.findUnique({
            where: { id: wallId },
            include: {
                notes: true,
                edges: true
            },
        });

        if (!wall) {
            return res.status(404).json({ message: "mural nao encontrado." });
        }

        // anexa autores sem precisar mudar o schema
        const authorIds = [...new Set(wall.notes.map(n => n.authorId))].filter(Boolean);
        let authors = [];
        if (authorIds.length > 0) {
            authors = await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true, avatarUrl: true } });
        }

        const notesWithAuthor = wall.notes.map(n => ({
            ...n,
            author: authors.find(a => a.id === n.authorId) || null
        }));

        const wallWithAuthors = { ...wall, notes: notesWithAuthor };

        res.status(200).json(wallWithAuthors);
    } catch (error) {
        console.error("erro ao buscar mural publico:", error);
        res.status(500).json({ message: "erro interno do servidor." });
    }
}

// gera ou recupera link de compartilhamento
export async function generateShareLink(req, res) {
    try {
        const wallId = parseInt(req.params.id);
        const userId = req.user.id;

        const wall = await prisma.wall.findUnique({ where: { id: wallId } });
        if (!wall) return res.status(404).json({ message: 'mural nao encontrado.' });
        
        if (wall.ownerId !== userId) return res.status(403).json({ message: 'acesso negado.' });

        // se ja existe, poderia retornar o mesmo, mas aqui renovamos ou mantemos a logica de update
        // para garantir que sempre haja um link valido
        let link = wall.shareLink;
        if (!link) {
             link = crypto.randomUUID();
             await prisma.wall.update({ where: { id: wallId }, data: { shareLink: link } });
        }
        
        return res.status(200).json({ shareLink: link });
    } catch (error) {
        console.error('erro ao gerar link:', error);
        return res.status(500).json({ message: 'erro interno ao gerar link.' });
    }
}