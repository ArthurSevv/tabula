import { PrismaClient } from "@prisma/client";
import { getIo } from '../utils/io.js';

const prisma = new PrismaClient();

// cria uma nova aresta (conexao) entre duas notas
export async function createEdge(req, res) {
    const { sourceId, targetId, wallId } = req.body;
    const userId = req.user.id;

    // recupera o token de compartilhamento de varias fontes possiveis (body, query ou header)
    const shareLink = req.body.shareLink || req.query.shareLink || req.headers['x-share-token'];

    try {
        // verifica se o mural existe
        const wall = await prisma.wall.findUnique({ where: { id: parseInt(wallId) } });
        if (!wall) return res.status(404).json({ message: 'mural nao encontrado.' });

        // permissao: dono do mural ou usuario com link valido
        const canEdit = (wall.ownerId === userId) || (shareLink && wall.shareLink && shareLink === wall.shareLink);
        
        if (!canEdit) {
            return res.status(403).json({ message: "acesso negado." });
        }

        // cria a aresta no banco de dados
        const newEdge = await prisma.edge.create({
            data: { 
                sourceId, 
                targetId, 
                wallId: parseInt(wallId) 
            }
        });

        // notifica outros usuarios na sala via socket
        const io = getIo();
        if (io) {
            io.to(`wall:${wallId}`).emit('edgeCreated', newEdge);
        }

        return res.status(201).json(newEdge);

    } catch (error) {
        console.error("erro ao criar aresta:", error);
        return res.status(500).json({ message: "erro ao criar a conexao" });
    }
}

// remove uma aresta existente
export async function deleteEdge(req, res) {
    const { sourceId, targetId, wallId } = req.body;
    const userId = req.user.id;
    
    // recupera token do body ou header
    const shareLink = req.body.shareLink || req.headers['x-share-token'];

    try {
        const wall = await prisma.wall.findUnique({ where: { id: parseInt(wallId) } });
        if (!wall) return res.status(404).json({ message: 'mural nao encontrado.' });

        // verifica permissao novamente antes de deletar
        const canEdit = (wall.ownerId === userId) || (shareLink && wall.shareLink && shareLink === wall.shareLink);
        
        if (!canEdit) {
            return res.status(403).json({ message: "acesso negado." });
        }

        // remove do banco de dados
        // usamos deletemany pois source/target nao sao chaves primarias unicas isoladamente
        await prisma.edge.deleteMany({
            where: {
                sourceId: sourceId,
                targetId: targetId,
                wallId: parseInt(wallId)
            }
        });

        // notifica a remocao em tempo real
        const io = getIo();
        if (io) {
            io.to(`wall:${wallId}`).emit('edgeDeleted', { sourceId, targetId });
        }

        return res.status(204).send();

    } catch (error) {
        console.error("erro ao deletar aresta:", error);
        return res.status(500).json({ message: "erro ao deletar a conexao" });
    }
}