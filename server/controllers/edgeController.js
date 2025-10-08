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