import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';
import { getIo } from '../utils/io.js'; // Importando socket io

const prisma = new PrismaClient();

export async function createWall(req, res) {
    try {
        const { title, backgroundColor, backgroundImage } = req.body; // Pode receber cores na criação se quiser
        const ownerId = req.user.id;

        if (!title) {
            return res.status(400).json({ message: "O título é obrigatório."})
        }
        
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
        console.error("Erro ao criar mural:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
}

export async function getWallById(req, res) {
    try {
        const wallId = parseInt(req.params.id);
        const userId = req.user.id;
        
        // Pega o token da Query (?shareLink=...) ou do Header
        const shareLink = req.query.shareLink || req.headers['x-share-token'];

        const wall = await prisma.wall.findUnique({
            where: { id: wallId },
            include: { 
                notes: true,
                edges: true
            },
        });

        if (!wall) {
            return res.status(404).json({ message: "Mural não encontrado." });
        }

        // VERIFICAÇÃO DE SEGURANÇA CORRIGIDA:
        // Permite se for o Dono OU se o token enviado bater com o do mural
        const isOwner = wall.ownerId === userId;
        const hasValidToken = (shareLink && wall.shareLink === shareLink);

        if (!isOwner && !hasValidToken) {
            return res.status(403).json({ message: "Acesso negado. Você Não é o proprietário deste mural." });
        }

        // Attach author names (mesma lógica de antes)
        const authorIds = [...new Set(wall.notes.map(n => n.authorId))].filter(Boolean);
        let authors = [];
        if (authorIds.length > 0) {
            authors = await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true, avatarUrl: true } });
        }

        const notesWithAuthor = wall.notes.map(n => ({
            ...n,
            author: authors.find(a => a.id === n.authorId) || null
        }));

        // Adiciona flag para o front saber se é dono ou visitante
        const wallWithAuthors = { 
            ...wall, 
            notes: notesWithAuthor,
            isOwner: isOwner // Útil para o front esconder botões de delete do mural, etc.
        };

        res.status(200).json(wallWithAuthors);
    } catch (error) {
        console.error("Erro ao buscar mural por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor."})
    }
}

export async function getUserWalls(req, res) {
    try {
        // O middleware 'protect' já nos deu o 'req.user'!
        const walls = await prisma.wall.findMany({
            where: { ownerId: req.user.id } // Buscamos apenas os murais cujo dono é o usuário logado
        });
        res.status(200).json(walls);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar os murais." });
    }
}

export async function deleteWall(req, res) {
    const { id: wallId } = req.params;
    const userId = req.user.id;

    try {
        const wall = await prisma.wall.findUnique({
            where: { id: parseInt(wallId) },
        });

        if (!wall) {
            return res.status(404).json({ message: "Mural não encontrado." });
        }
        if (wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado."});
        }

        const wallIdInt = parseInt(wallId);
        await prisma.$transaction([
            //deleta arestas do mural
            prisma.edge.deleteMany({
                where: { wallId: wallIdInt },
            }),
            //deleta notas do mural
            prisma.note.deleteMany({
                where: { wallId: wallIdInt },
            }),
            //deleta o mural
            prisma.wall.delete({
                where: { id: wallIdInt },
            }),
        ]);
        return res.status(204).send();
    } catch (error) {
        console.error("ERRO AO DELETAR MURAL:", error);
        return res.status(500).json({ message: "Erro ao deletar o mural." });
    }
}

export async function updateWall(req, res) {
    const { id } = req.params;
    // Adicionei backgroundColor e backgroundImage
    const { title, backgroundColor, backgroundImage } = req.body;
    const userId = req.user.id;

    try {
        const wallId = parseInt(id);
        const wall = await prisma.wall.findUnique({
            where: { id: wallId },
        });

        if (!wall) {
            return res.status(404).json({ message: "Mural não encontrado." });
        }

        if (wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado." });
        }

        // Monta objeto de update dinâmico
        const dataToUpdate = {};
        if (title) dataToUpdate.title = title;
        if (backgroundColor) dataToUpdate.backgroundColor = backgroundColor;
        if (backgroundImage !== undefined) dataToUpdate.backgroundImage = backgroundImage;

        const updatedWall = await prisma.wall.update({
            where: { id: wallId },
            data: dataToUpdate,
        });

        // EMITIR SOCKET PARA ATUALIZAR FUNDO EM TEMPO REAL
        const io = getIo();
        if (io) {
            io.to(`wall:${wallId}`).emit('wallUpdated', updatedWall);
        }

        res.status(200).json(updatedWall);
    } catch (error) {
        console.error("ERRO AO ATUALIZAR MURAL:", error);
        res.status(500).json({ message: "Erro ao atualizar o mural." });
    }
}

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
            return res.status(404).json({ message: "Mural não encontrado." });
        }

        // Attach author names to notes (to avoid schema changes)
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

        // Retorna o mural publicamente, sem checar o dono
        res.status(200).json(wallWithAuthors);
    } catch (error) {
        console.error("Erro ao buscar mural público:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
}

export async function generateShareLink(req, res) {
    try {
        const wallId = parseInt(req.params.id);
        const userId = req.user.id;

        const wall = await prisma.wall.findUnique({ where: { id: wallId } });
        if (!wall) return res.status(404).json({ message: 'Mural não encontrado.' });
        if (wall.ownerId !== userId) return res.status(403).json({ message: 'Acesso negado.' });

        const newShare = crypto.randomUUID();
        const updated = await prisma.wall.update({ where: { id: wallId }, data: { shareLink: newShare } });
        return res.status(200).json({ shareLink: updated.shareLink });
    } catch (error) {
        console.error('Erro ao gerar share link:', error);
        return res.status(500).json({ message: 'Erro interno ao gerar link.' });
    }
}