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

export async function updateNote(req, res){
    const { id } = req.params;
    const { textContent } = req.body;
    const userId = req.user.id;

    try {
        const note = await prisma.note.findUnique({
            where: { id },
            include: { wall: true }
        });

        if (!note || note.wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado."});
        }

        const updatedNote = await prisma.note.update({
            where: { id: id},
            data: {
                textContent: textContent,
            }
        });

        return res.status(200).json(updatedNote);
    } catch (error) {
        console.error("ERRO AO ATUALIZAR A NOTA"), error;
        return res.status(500).json({ message: "Erro ao atualizar a nota." });
    }
}

export async function updateNotePosition(req, res) {
    const { id } = req.params;
    const { position } = req.body;
    const userId = req.user.id;

    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        return res.status(400).json({ message: "Dados de posição inválidos ou ausentes." }); 
    }

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

export async function deleteNote(req, res) {
    const { id: noteId } = req.params;
    const userId = req.user.id;

    try {
        const note = await prisma.note.findUnique({
            where: { id: noteId },
            include: { wall: true }
        });

        if (!note || note.wall.ownerId !== userId) {
            return res.status(403).json({ message: "Acesso negado." });
        }

        await prisma.$transaction([
            prisma.edge.deleteMany({
                where: {
                    OR: [
                        { sourceId: noteId },
                        { targetId: noteId },
                    ]
                }
            }),
            prisma.note.delete({
                where: { id: noteId }
            })
        ]);

        return res.status(204).send();
    } catch (error) {
        console.error("ERRO AO DELETAR NOTA:", error);
        return res.status(500).json({ message: "Erro ao deletar a nota." });
    }
}