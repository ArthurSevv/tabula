import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { getIo } from '../utils/io.js';

export async function createNote(req, res) {
    const { wallId, textContent, positionX, positionY, color } = req.body; 
    const authorId = req.user.id;
    // Pega o token de todos os lugares possiveis
    const shareLink = req.body.shareLink || req.query.shareLink || req.headers['x-share-token'];

    try {
        const wall = await prisma.wall.findUnique({ where: { id: parseInt(wallId) } });
        if (!wall) return res.status(404).json({ message: "Mural nao encontrado."});
        
        // PERMISSAO: Dono OU (Usuario logado E Token Valido)
        const canEdit = (wall.ownerId === authorId) || (shareLink && wall.shareLink && shareLink === wall.shareLink);
        
        if (!canEdit) {
            return res.status(403).json({ message: "Acesso negado."});
        }

        const newNote = await prisma.note.create({
            data: {
                wallId: parseInt(wallId),
                type: "TEXT",        
                textContent, 
                mediaUrl: null, 
                color: color || '#ffffff',
                positionX: positionX ?? 0,
                positionY: positionY ?? 0,
                authorId: authorId,
            }
        });

        const author = await prisma.user.findUnique({ where: { id: authorId }, select: { id: true, name: true, avatarUrl: true } });
        const noteWithAuthor = { ...newNote, author };

        const io = getIo();
        if (io) {
            io.to(`wall:${wallId}`).emit('noteCreated', noteWithAuthor);
        }

        res.status(201).json(noteWithAuthor);
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar a nota." });
    }
}1

export async function updateNote(req, res){
    const { id } = req.params;
    const { textContent, mediaUrl, color } = req.body;
    const userId = req.user.id;

    try {
        const noteId = parseInt(id);
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) return res.status(404).json({ message: "Nota nao encontrada." });

        const wall = await prisma.wall.findUnique({ where: { id: note.wallId } });
        
        // Pega token do header ou body (se o front mandar)
        const shareLink = req.body.shareLink || req.headers['x-share-token'];

        // PERMISSAO: Autor da nota OU Dono do mural OU (Usuario logado E Token Valido)
        const isAuthor = note.authorId === userId;
        const isWallOwner = wall && wall.ownerId === userId;
        const hasValidToken = (shareLink && wall.shareLink === shareLink);

        if (!isAuthor && !isWallOwner && !hasValidToken) {
            return res.status(403).json({ message: "Acesso negado."});
        }

        const updatedNote = await prisma.note.update({
            where: { id: noteId },
            data: { textContent, mediaUrl, color }
        });
        
        const author = await prisma.user.findUnique({ where: { id: updatedNote.authorId }, select: { id: true, name: true, avatarUrl: true } });
        const updatedWithAuthor = { ...updatedNote, author };

        const io = getIo();
        if (io) io.to(`wall:${updatedNote.wallId}`).emit('noteUpdated', updatedWithAuthor);

        return res.status(200).json(updatedWithAuthor);
    } catch (error) {
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

        if (!note) return res.status(404).json({ message: "Nota não encontrada." });

        // allow moving if wall owner or share token provided in body/header/query
        const shareLink = req.body.shareLink || req.query.shareLink || req.headers['x-share-token'];
        const canMove = (note.wall.ownerId === userId || (shareLink && note.wall.shareLink === shareLink));
        
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
        
        // Transação para deletar arestas conectadas antes de deletar a nota
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