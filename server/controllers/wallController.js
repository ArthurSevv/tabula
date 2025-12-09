import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';
const prisma = new PrismaClient();

export async function createWall(req, res) {
    try {
        const { title } = req.body;
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

        if (wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado. Você Nõ é o proprietário deste mural." });
        }

        // Attach author names to notes for the authenticated view as well
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
    const { title } = req.body;
    const userId = req.user.id;

    if (!title) {
        return res.status(400).json({ message: "O título é obrigatório." });
    }

    try {
        const wall = await prisma.wall.findUnique({
            where: { id: parseInt(id) },
        });

        if (!wall) {
            return res.status(404).json({ message: "Mural não encontrado." });
        }

        if (wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado." });
        }

        const updatedWall = await prisma.wall.update({
            where: { id: parseInt(id) },
            data: { title },
        });

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