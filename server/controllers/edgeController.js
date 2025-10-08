import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createEdge(req, res) {
    const { sourceId, targetId, wallId } = req.body;
    const userId = req.user.id;

    try {
        const wall = await prisma.wall.findUnique({ where: { id: wallId } });
        if (!wall || wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado." })
        }

        const newEdge = await prisma.edge.create({
            data: { sourceId, targetId, wallId }
        });
        return res.status(201).json(newEdge);
    }catch (error) {
        console.error("ErRRO AO CRIAR ARESTA:", error);
        return res.status(500).json({ message: "Erro ao criar a conexão" });
    }
}

export async function deleteEdge(req, res) {
    const { id: edgeId } = req.params;
    const userId = req.user.id;

    try {
        const edge = await prisma.edge.findUnique({ 
            where: { id: edgeId },
            include: { wall: true }
        });

        if (!edge || edge.wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado." })
        }

        await prisma.edge.delete({
            where: { id: edgeId }
        });

        return res.status(204).send();
    }catch (error) {
        console.error("ERRO AO DELETAR ARESTA:", error);
        return res.status(500).json({ message: "Erro ao deletar a conexão" });
    }
}