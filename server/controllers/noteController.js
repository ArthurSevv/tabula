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

export async function updateNotePosition(req, res) {
    const { id } = req.params;
    const { position } = req.body;
    const userId = req.user.id;

    try {
        const note = await prisma.note.findUnique({
            where: { id },
            include: { wall: true }
        });

        if(!note || note.wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado." });
        }

        const updatedNote = await prisma.note.update({
            where: { id: id },
            data: {
                positionX: position.x,
                positionY: position.y,
            }
        });

        res.status(200).json(updatedNote);
    } catch (error) {
        console.error("Erro atualizar posicao", error);
        res.status(500).json({ message: "Erro ao atualizar a posição da nota." });
    }
}