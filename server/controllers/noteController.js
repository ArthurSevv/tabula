import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { getIo } from '../utils/io.js';

export async function createNote(req, res) {
    const { wallId, type, textContent, imageUrl, linkUrl, positionX } = req.body;
    // accept share token from body, query or headers
    const shareLink = req.body.shareLink || req.query.shareLink || req.headers['x-share-token'];
    const positionY = req.body.positionY;
    const userId = req.user.id;

    try {
        //valida
        const wall = await prisma.wall.findUnique({ where: { id: parseInt(wallId) } });
        if (!wall) {
            return res.status(404).json({ message: "Mural não encontrado."});
        }
        
        // allow edit if owner OR valid share token provided (authenticated users only)
        const canEdit = (wall.ownerId === userId) || (shareLink && wall.shareLink && shareLink === wall.shareLink);
        if (!canEdit) {
            return res.status(403).json({ message: "Acesso negado."});
        }

                const newNote = await prisma.note.create({
            data: {
                wallId: parseInt(wallId),
                type,
                textContent,
                imageUrl,
                linkUrl,
                positionX,
                positionY,
                authorId: userId,
            }
        });
                // attach author info (include avatarUrl)
                const author = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, avatarUrl: true } });
                const noteWithAuthor = { ...newNote, author };

                // emit realtime event
                const io = getIo();
                if (io) {
                    const room = `wall:${wallId}`;
                    io.to(room).emit('noteCreated', noteWithAuthor);
                    if (wall.shareLink) io.to(`share:${wall.shareLink}`).emit('noteCreated', noteWithAuthor);
                }

                res.status(201).json(noteWithAuthor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao criar a nota." });
    }
}

export async function updateNote(req, res){
    const { id } = req.params;
    const { textContent, imageUrl, linkUrl } = req.body;
    const userId = req.user.id;

    try {
        const noteId = parseInt(id);
        const note = await prisma.note.findUnique({
            where: { id: noteId }
        });

        if (!note) {
            return res.status(404).json({ message: "Nota não encontrada." });
        }

        // Allow update if requester is the note author OR the wall owner
        const wall = await prisma.wall.findUnique({ where: { id: note.wallId } });
        const isAuthor = note.authorId === userId;
        const isWallOwner = wall && wall.ownerId === userId;
        if (!isAuthor && !isWallOwner) {
            return res.status(403).json({ message: "Acesso negado."});
        }

                const updatedNote = await prisma.note.update({
            where: { id: noteId },
            data: {
                textContent,
                imageUrl,
                linkUrl,
            }
        });
                // attach author info
                const author = await prisma.user.findUnique({ where: { id: updatedNote.authorId }, select: { id: true, name: true, avatarUrl: true } });
                const updatedWithAuthor = { ...updatedNote, author };

                const io = getIo();
                if (io) {
                    const room = `wall:${updatedNote.wallId}`;
                    io.to(room).emit('noteUpdated', updatedWithAuthor);
                }

                return res.status(200).json(updatedWithAuthor);
    } catch (error) {
        console.error("ERRO AO ATUALIZAR A NOTA", error);
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
        const noteId = parseInt(id);
        const note = await prisma.note.findUnique({
            where: { id: noteId },
            include: { wall: true }
        });

        // allow moving if wall owner or share token provided in body/header/query
        const shareLink = req.body.shareLink || req.query.shareLink || req.headers['x-share-token'];
        const canMove = note && (note.wall.ownerId === userId || (shareLink && note.wall.shareLink === shareLink));
        if (!canMove) {
            return res.status(403).json({ message: "Acesso negado." });
        }

                const updatedNote = await prisma.note.update({
            where: { id: noteId },
            data: {
                positionX: position.x,
                positionY: position.y,
            }
        });

                const io = getIo();
                if (io) {
                    io.to(`wall:${updatedNote.wallId}`).emit('noteMoved', updatedNote);
                }

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
            where: { id: parseInt(noteId) },
        });

        if (!note) {
            return res.status(404).json({ message: "Nota não encontrada." });
        }

        // Only the author or the wall owner can delete the note
        const wall = await prisma.wall.findUnique({ where: { id: note.wallId } });
        const isAuthor = note.authorId === userId;
        const isWallOwner = wall && wall.ownerId === userId;
        if (!isAuthor && !isWallOwner) {
            return res.status(403).json({ message: "Acesso negado. Você não tem permissão para deletar esta nota." });
        }

        const noteIdInt = parseInt(noteId);
        await prisma.$transaction([
            prisma.edge.deleteMany({
                where: {
                    OR: [
                        { sourceId: noteIdInt.toString() },
                        { targetId: noteIdInt.toString() },
                    ]
                }
            }),
            prisma.note.delete({
                where: { id: noteIdInt }
            })
        ]);

        const io = getIo();
        if (io) {
          io.to(`wall:${note.wallId}`).emit('noteDeleted', { id: noteIdInt });
        }

        return res.status(204).send();
    } catch (error) {
        console.error("ERRO AO DELETAR NOTA:", error);
        return res.status(500).json({ message: "Erro ao deletar a nota." });
    }
}