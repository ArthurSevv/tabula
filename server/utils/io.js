import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// variavel para guardar a instancia do socket para usar em outros arquivos
let ioInstance = null;

// mapa para guardar quem esta online
// funciona assim: nome_da_sala -> lista_de_pessoas
const presence = new Map();

export function setIo(io) {
  ioInstance = io;

  // evento principal: dispara quando alguem abre o site e conecta
  io.on('connection', (socket) => {
    
    // evento: usuario quer entrar em um mural especifico
    socket.on('join-wall', async ({ wallId, shareLink }) => {
      try {
        // 1. pega o token que o frontend enviou
        const token = socket.handshake.auth && socket.handshake.auth.token;
        
        // se nao tiver token, avisa erro e para
        if (!token) {
          socket.emit('error', { message: 'autenticacao necessaria.' });
          return;
        }

        // 2. verifica se o token e valido (senha secreta)
        const secret = process.env.JWT_SECRET || 'dev_secret_tabula_fallback_change_in_prod';
        let decoded = null;
        try {
          decoded = jwt.verify(token, secret);
        } catch (err) {
          socket.emit('error', { message: 'token invalido.' });
          return;
        }

        // 3. busca o usuario no banco para pegar nome e avatar atualizados
        const user = await prisma.user.findUnique({ 
            where: { id: decoded.id }, 
            select: { id: true, name: true, email: true, avatarUrl: true } 
        });

        if (!user) {
          socket.emit('error', { message: 'usuario nao encontrado.' });
          return;
        }

        // 4. define o nome da sala (ex: "wall:5")
        const room = wallId ? `wall:${wallId}` : (shareLink ? `share:${shareLink}` : null);
        if (!room) return;

        // coloca o usuario dentro dessa sala virtual
        socket.join(room);

        // --- logica de lista de presenca ---
        
        // se a sala ainda nao existe no mapa, cria ela
        if (!presence.has(room)) {
            presence.set(room, new Map());
        }

        // adiciona o usuario atual na lista da sala
        // usamos o socket.id como chave para saber qual aba do navegador e
        presence.get(room).set(socket.id, { 
            id: user.id, 
            name: user.name, 
            avatarUrl: user.avatarUrl || null 
        });

        // avisa todo mundo da sala (inclusive quem entrou) a nova lista de usuarios
        const users = Array.from(presence.get(room).values());
        io.to(room).emit('presence', users);

      } catch (err) {
        console.error('erro ao entrar na sala:', err);
      }
    });

    // evento: usuario saiu do mural (mudou de pagina)
    socket.on('leave-wall', ({ wallId, shareLink }) => {
      const room = wallId ? `wall:${wallId}` : (shareLink ? `share:${shareLink}` : null);
      if (!room) return;

      socket.leave(room);
      handleDisconnect(socket, room);
    });

    // evento: usuario fechou a aba ou caiu a internet
    socket.on('disconnecting', () => {
      // percorre todas as salas que o usuario estava e remove ele
      for (const room of socket.rooms) {
        handleDisconnect(socket, room);
      }
    });
  });
}

// funcao auxiliar para remover usuario da lista e avisar os outros
function handleDisconnect(socket, room) {
    if (presence.has(room)) {
        // remove o usuario especifico pelo id do socket
        presence.get(room).delete(socket.id);
        
        // pega a lista atualizada
        const users = Array.from(presence.get(room).values());
        
        // se nao sobrou ninguem, pode deletar a sala da memoria para economizar ram
        if (users.length === 0) {
            presence.delete(room);
        } else {
            // senao, avisa quem sobrou que alguem saiu
            ioInstance.to(room).emit('presence', users);
        }
    }
}

// permite que os controllers (ex: noteController) usem o socket
// para avisar "nota criada" sem precisar estar neste arquivo
export function getIo() {
  return ioInstance;
}