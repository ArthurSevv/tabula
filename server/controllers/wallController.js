import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createWall(req, res) {
    try {
        const { title } = req.body;
        const ownerId = req.user.id;

        if (!title) {
            return res.status(400).json({ message: "O título é obrigatório."})
        }
        
        const newWall = await prisma.wall.create({
            data: {
                title: title,
                ownerId: ownerId,
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
        const wallId = req.params.id;
        const userId = req.user.id;
        const wall = await prisma.wall.findUnique({
            where: { id: wallId },
            include: { 
                notes: true,
                edges: true
            },
        });

        if (!wall) {
            return res.status(404).json
        }

        if (wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado. Você Nõ é o proprietário deste mural." });
        }

        res.status(200).json(wall);
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
            where: { id: wallId },
        });

        if (!wall) {
            return res.status(404).json({ message: "Mural não encontrado." });
        }
        if (wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado."});
        }

        await prisma.$transaction([
            //deleta arestas do mural
            prisma.edge.deleteMany({
                where: { wallId: wallId },
            }),
            //deleta notas do mural
            prisma.note.deleteMany({
                where: { wallId: wallId },
            }),
            //deleta o mural
            prisma.wall.delete({
                where: { id: wallId },
            }),
        ]);
        return res.status(204).send();
    } catch (error) {
        console.error("ERRO AO DELETAR MURAL:", error);
        return res.status(500).json({ message: "Erro ao deletar o mural." });
    }
}