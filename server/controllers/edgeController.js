import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { getIo } from '../utils/io.js';

export async function createEdge(req, res) {
    const { sourceId, targetId, wallId } = req.body;
    // accept share token from body, query or headers
    const shareLink = req.body.shareLink || req.query.shareLink || req.headers['x-share-token'];
    const userId = req.user.id;

    try {
        const wall = await prisma.wall.findUnique({ where: { id: parseInt(wallId) } });
        if (!wall) return res.status(404).json({ message: 'Mural não encontrado.' });

        const canEdit = (wall.ownerId === userId) || (shareLink && wall.shareLink && shareLink === wall.shareLink);
        if (!canEdit) return res.status(403).json({ message: "Acesso negado." });

                const newEdge = await prisma.edge.create({
                        data: { sourceId, targetId, wallId: parseInt(wallId) }
                });

                const io = getIo();
                if (io) {
                    io.to(`wall:${wallId}`).emit('edgeCreated', newEdge);
                }

                return res.status(201).json(newEdge);
    }catch (error) {
        console.error("ErRRO AO CRIAR ARESTA:", error);
        return res.status(500).json({ message: "Erro ao criar a conexão" });
    }
}

export async function deleteEdge(req, res) {
    const { sourceId, targetId, wallId, shareLink } = req.body;
    const userId = req.user.id;

    try {
        const wall = await prisma.wall.findUnique({ where: { id: parseInt(wallId) } });
        if (!wall) return res.status(404).json({ message: 'Mural não encontrado.' });

        const canEdit = (wall.ownerId === userId) || (shareLink && wall.shareLink && shareLink === wall.shareLink);
        if (!canEdit) return res.status(403).json({ message: "Acesso negado." });

                await prisma.edge.deleteMany({
            where: {
                sourceId: sourceId,
                targetId: targetId,
                wallId: parseInt(wallId)
            }
        });

                const io = getIo();
                if (io) {
                    io.to(`wall:${wallId}`).emit('edgeDeleted', { sourceId, targetId });
                }

                return res.status(204).send();

    }catch (error) {
        console.error("ERRO AO DELETAR ARESTA:", error);
        return res.status(500).json({ message: "Erro ao deletar a conexão" });
    }
}