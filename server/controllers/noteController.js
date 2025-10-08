import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createNote(req, res) {
    const { textContent, wallId } = req.body;
    const userId = req.user.id;

    try {
        //valida
        const wall = await prisma.wall.findUnique({ where: { id: wallId } });
        if (!wall || wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado."});
        }

        const newNote = await prisma.note.create({
            data: {
                textContent,
                wall: {
                    connect: {
                        id: wallId
                    }
                }
            }
        });
        res.status(201).json(newNote);
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar a nota." });
    }
}