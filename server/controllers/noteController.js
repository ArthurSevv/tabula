import { PrismaClient } from "@prisma/client";
import { getIo } from '../utils/io.js';

const prisma = new PrismaClient();

// cria uma nova nota no mural
export async function createNote(req, res) {
    const { wallId, textContent, positionX, positionY, color } = req.body; 
    const authorId = req.user.id;
    
    // recupera o token de compartilhamento (header, query ou body)
    const shareLink = req.body.shareLink || req.query.shareLink || req.headers['x-share-token'];

    try {
        const wall = await prisma.wall.findUnique({ where: { id: parseInt(wallId) } });
        if (!wall) return res.status(404).json({ message: "mural nao encontrado."});
        
        // permissao: dono do mural ou usuario com token valido
        const canEdit = (wall.ownerId === authorId) || (shareLink && wall.shareLink && shareLink === wall.shareLink);
        
        if (!canEdit) {
            return res.status(403).json({ message: "acesso negado."});
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

        // anexa dados do autor para retorno
        const author = await prisma.user.findUnique({ where: { id: authorId }, select: { id: true, name: true, avatarUrl: true } });
        const noteWithAuthor = { ...newNote, author };

        // notifica via socket
        const io = getIo();
        if (io) {
            io.to(`wall:${wallId}`).emit('noteCreated', noteWithAuthor);
        }

        res.status(201).json(noteWithAuthor);
    } catch (error) {
        res.status(500).json({ message: "erro ao criar a nota." });
    }
}

// atualiza conteudo ou cor da nota
export async function updateNote(req, res){
    const { id } = req.params;
    const { textContent, mediaUrl, color } = req.body;
    const userId = req.user.id;

    try {
        const noteId = parseInt(id);
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) return res.status(404).json({ message: "nota nao encontrada." });

        const wall = await prisma.wall.findUnique({ where: { id: note.wallId } });
        
        // pega token do header ou body
        const shareLink = req.body.shareLink || req.headers['x-share-token'];

        // permissao: autor da nota ou dono do mural ou usuario com token valido
        const isAuthor = note.authorId === userId;
        const isWallOwner = wall && wall.ownerId === userId;
        const hasValidToken = (shareLink && wall.shareLink === shareLink);

        if (!isAuthor && !isWallOwner && !hasValidToken) {
            return res.status(403).json({ message: "acesso negado."});
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
        return res.status(500).json({ message: "erro ao atualizar a nota." });
    }
}

// atualiza posicao da nota (arrastar)
export async function updateNotePosition(req, res) {
    const { id } = req.params;
    const { position } = req.body;
    const userId = req.user.id;

    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        return res.status(400).json({ message: "dados de posicao invalidos." }); 
    }

    try {
        const noteId = parseInt(id);
        const note = await prisma.note.findUnique({
            where: { id: noteId },
            include: { wall: true }
        });

        if (!note) return res.status(404).json({ message: "nota nao encontrada." });

        const shareLink = req.body.shareLink || req.query.shareLink || req.headers['x-share-token'];
        
        // permissao: dono, autor ou token valido
        const isAuthor = note.authorId === userId;
        const isWallOwner = note.wall.ownerId === userId;
        const hasValidToken = (shareLink && note.wall.shareLink === shareLink);

        if (!isAuthor && !isWallOwner && !hasValidToken) {
            return res.status(403).json({ message: "acesso negado." });
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
        console.error("erro atualizar posicao", error);
        res.status(500).json({ message: "erro ao atualizar a posicao da nota." });
    }
}

// deleta uma nota e suas conexoes
export async function deleteNote(req, res) {
    const { id: noteId } = req.params;
    const userId = req.user.id;

    try {
        const note = await prisma.note.findUnique({
            where: { id: parseInt(noteId) },
        });

        if (!note) {
            return res.status(404).json({ message: "nota nao encontrada." });
        }

        const wall = await prisma.wall.findUnique({ where: { id: note.wallId } });
        const shareLink = req.headers['x-share-token'];

        // permissao: autor, dono do mural ou token valido
        const isAuthor = note.authorId === userId;
        const isWallOwner = wall && wall.ownerId === userId;
        const hasValidToken = (shareLink && wall.shareLink === shareLink);

        if (!isAuthor && !isWallOwner && !hasValidToken) {
            return res.status(403).json({ message: "acesso negado. voce nao tem permissao para deletar esta nota." });
        }

        const noteIdInt = parseInt(noteId);
        
        // transacao para deletar arestas conectadas antes de deletar a nota
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
        console.error("erro ao deletar nota:", error);
        return res.status(500).json({ message: "erro ao deletar a nota." });
    }
}