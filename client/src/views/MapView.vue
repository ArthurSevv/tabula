<script setup>
import { ref, onMounted, onUnmounted, markRaw } from 'vue';
import { io } from 'socket.io-client';
import { useRoute } from 'vue-router';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { getWallById, getPublicWall, createNote, updateNote, updateNotePosition, deleteNote, createEdge, deleteEdge, uploadFile } from '@/services/api';
import ImageNode from '@/components/ImageNode.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import InputText from 'primevue/inputtext';

const route = useRoute();
const { onConnect, addEdges, onNodesChange, onEdgesChange, project } = useVueFlow();
const nodeTypes = {
  imageNode: markRaw(ImageNode),
};

const elements = ref([]);
const isLoading = ref(true);
const error = ref(null);
const wallTitle = ref('');
const wallOwnerId = ref(null);
const isReadOnly = ref(false);

const isEditDialogVisible = ref(false);
const editingNote = ref(null);
const editingText = ref('');
const editingImageUrl = ref('');
const uploading = ref(false);
const isHelpVisible = ref(false);
const presenceUsers = ref([]);
const socketRef = ref(null);
// (no click-to-connect state — use VueFlow handles for connections)

onMounted(async () => {
    try {
        // support opening a shared wall: /walls/:id?token=SHARETOKEN
        const shareTokenFromQuery = route.query.token || null;
        if (shareTokenFromQuery) {
            // persist share token for subsequent API calls
            localStorage.setItem('shareToken', shareTokenFromQuery);
            isReadOnly.value = true;
        }

        const shareToken = localStorage.getItem('shareToken') || null;

        // if there's a share token present, consider this a public (read-only) view
        if (shareToken && !isReadOnly.value) isReadOnly.value = Boolean(shareTokenFromQuery);

        const wallData = shareToken ? await getPublicWall(route.params.id) : await getWallById(route.params.id);
        wallTitle.value = wallData.title || '';
        wallOwnerId.value = wallData.ownerId || null;

        const currentUser = JSON.parse(localStorage.getItem('userData')) || null;
        const currentUserId = currentUser ? currentUser.id : null;

        const nodes = wallData.notes.map((note, index) => {
            const hasSavedPosition = note.positionX !== null && note.positionY !== null;
            
            return {
                id: note.id.toString(),
                type: 'imageNode',
                position: hasSavedPosition
                    ? { x: note.positionX, y: note.positionY }
                    : { x: (index * 250) % 1000, y: Math.floor(index / 4) * 120 },
                data: {
                    label: note.textContent || 'Nota sem texto',
                    imageUrl: note.imageUrl,
                        noteId: note.id,
                    authorName: note.author?.name || null,
                    authorAvatar: note.author?.avatarUrl || null,
                    authorId: note.authorId,
                    // note is editable if current user is the note's author OR the wall owner
                    isEditable: currentUserId && (currentUserId === note.authorId || currentUserId === wallData.ownerId),
                    // mark if this note belongs to the wall owner
                    isOwnerNote: note.authorId === wallData.ownerId,
                }
            };
        });

        const edges = wallData.edges.map(edge => ({
            id: `e${edge.sourceId}-${edge.targetId}`,
            source: edge.sourceId.toString(),
            target: edge.targetId.toString(),
        }));
        elements.value = [...nodes, ...edges];

    } catch (error) {
        console.error("Erro ao carregar o mural:", error);
        error.value = "Não foi possível carregar os dados deste mural";
    } finally {
        isLoading.value = false;
    }
    // setup realtime socket connection for presence and updates
    try {
        const userData = JSON.parse(localStorage.getItem('userData')) || null;
        const token = userData ? userData.token : null;
        if (!token) {
            console.warn('No auth token found; realtime disabled');
        } else {
            const socket = io('http://localhost:3000', { auth: { token } });
            socketRef.value = socket;

            // join room (server will validate token)
            const shareToken = localStorage.getItem('shareToken') || null;
            socket.emit('join-wall', { wallId: route.params.id, shareLink: shareToken });

            socket.on('presence', (users) => {
                presenceUsers.value = users;
            });

            socket.on('noteCreated', (note) => {
                // avoid duplicate
                if (elements.value.some(el => el.id.toString() === note.id.toString())) return;
                const currentUser = JSON.parse(localStorage.getItem('userData')) || null;
                const currentUserId = currentUser ? currentUser.id : null;

                const node = {
                    id: note.id.toString(),
                    type: 'imageNode',
                    position: { x: note.positionX ?? 0, y: note.positionY ?? 0 },
                    data: {
                        label: note.textContent || 'Nota sem texto',
                        imageUrl: note.imageUrl || null,
                        noteId: note.id,
                        authorName: note.author ? note.author.name : null,
                        authorAvatar: note.author ? note.author.avatarUrl : null,
                        authorId: note.authorId,
                        isEditable: currentUserId && (currentUserId === note.authorId || currentUserId === wallOwnerId.value),
                        isOwnerNote: note.authorId === wallOwnerId.value,
                    }
                };
                elements.value.push(node);
            });

            socket.on('noteUpdated', (note) => {
                const idx = elements.value.findIndex(el => el.id.toString() === note.id.toString());
                if (idx !== -1) {
                    const node = elements.value[idx];
                    if (node.data) {
                        node.data.label = note.textContent;
                        node.data.imageUrl = note.imageUrl;
                            if (note.author && note.author.avatarUrl) node.data.authorAvatar = note.author.avatarUrl;
                    }
                }
            });

            socket.on('noteMoved', (note) => {
                const idx = elements.value.findIndex(el => el.id.toString() === note.id.toString());
                if (idx !== -1) {
                    const node = elements.value[idx];
                    node.position = { x: note.positionX ?? node.position.x, y: note.positionY ?? node.position.y };
                }
            });

            socket.on('noteDeleted', ({ id }) => {
                const idx = elements.value.findIndex(el => el.id.toString() === id.toString());
                if (idx !== -1) elements.value.splice(idx, 1);
                // also remove edges referencing this node
                elements.value = elements.value.filter(el => !(el.source === id.toString() || el.target === id.toString()));
            });

            socket.on('edgeCreated', (edge) => {
                const edgeId = `e${edge.sourceId}-${edge.targetId}`;
                if (elements.value.some(el => el.id === edgeId)) return;
                elements.value.push({ id: edgeId, source: edge.sourceId.toString(), target: edge.targetId.toString() });
            });

            socket.on('edgeDeleted', ({ sourceId, targetId }) => {
                const edgeId1 = `e${sourceId}-${targetId}`;
                const edgeId2 = `e${targetId}-${sourceId}`;
                const idx = elements.value.findIndex(el => el.id === edgeId1 || el.id === edgeId2);
                if (idx !== -1) elements.value.splice(idx, 1);
            });
        }
    } catch (err) {
        console.warn('Realtime init failed', err);
    }
    // fecha menu de contexto ao clicar fora
    const onDocClick = (e) => {
        if (contextMenuVisible.value) {
            // se clicar fora do menu
            const menuEl = document.querySelector('.context-menu');
            if (menuEl && !menuEl.contains(e.target)) {
                contextMenuVisible.value = false;
            }
        }
    };

    const onEsc = (e) => {
        if (e.key === 'Escape') closeContextMenu();
    };

    document.addEventListener('click', onDocClick);
    window.addEventListener('keydown', onEsc);

    // cleanup on unmount
    onUnmounted(() => {
        document.removeEventListener('click', onDocClick);
        window.removeEventListener('keydown', onEsc);
        // leave realtime room and disconnect socket
        try {
            if (socketRef.value) {
                socketRef.value.emit('leave-wall', { wallId: route.params.id });
                socketRef.value.disconnect();
                socketRef.value = null;
            }
        } catch (err) {
            console.warn('Error during socket cleanup', err);
        }
    });
});

onConnect((params) => {
    if (isReadOnly.value) return;

    const wallId = route.params.id;
    const newEdgeData = {
        sourceId: params.source,
        targetId: params.target,
        wallId: wallId,
    }
    addEdges([params]);

    createEdge(newEdgeData).catch(error => {
        console.error("Erro ao salvar a conexão:", error);
        alert("Não foi possível salvar a conexão.");
    });
});

// connections are handled by VueFlow handles and the existing onConnect handler

// right-click on canvas: show custom context menu (prevents browser menu)
const contextMenuVisible = ref(false);
const contextMenuLeft = ref(0);
const contextMenuTop = ref(0);
const contextCanvasPos = ref({ x: 0, y: 0 });

function closeContextMenu() {
    contextMenuVisible.value = false;
}

function onCanvasContextMenu(event) {
    // prevent default browser menu; we'll show our custom menu
    event.preventDefault();

    try {
        // compute canvas coordinates for later use when creating the note
        const { x, y } = project({ x: event.clientX, y: event.clientY });
        contextCanvasPos.value = { x, y };

        // position the context menu at the click coords (adjust a bit if needed)
        contextMenuLeft.value = event.clientX + 2;
        contextMenuTop.value = event.clientY + 2;
        contextMenuVisible.value = true;
    } catch (err) {
        console.error('Erro no contexto do canvas:', err);
    }
}

async function handleContextAddNote() {
    if (isReadOnly.value) {
        alert('Visualização pública: não é possível criar notas aqui. Abra o mural como colaborador para editar.');
        closeContextMenu();
        return;
    }
    try {
        const wallId = route.params.id;
        const { x, y } = contextCanvasPos.value;

        const newNoteFromApi = await createNote({
            wallId: wallId,
            textContent: 'Nova Nota',
            positionX: x,
            positionY: y
        });

        const newNode = {
            id: newNoteFromApi.id.toString(),
            type: 'imageNode',
            position: { x: newNoteFromApi.positionX ?? x, y: newNoteFromApi.positionY ?? y },
            data: {
                label: newNoteFromApi.textContent,
                imageUrl: newNoteFromApi.imageUrl || null,
                authorName: newNoteFromApi.author?.name || null,
                authorId: newNoteFromApi.authorId,
                isOwner: newNoteFromApi.authorId === parseInt(wallId),
            }
        };
        elements.value.push(newNode);
    } catch (err) {
        console.error('Erro ao criar nota via contexto:', err);
        alert('Não foi possível criar a nota.');
    } finally {
        closeContextMenu();
    }
}
//deleta nota
onNodesChange((changes) => {
    if (isReadOnly.value) return;

    changes.forEach(change => {
        if (change.type === 'remove') {
            console.log('Nó removido:', change.id);
            deleteNote(change.id).catch(error => {
                console.error("Erro ao deletar a nota na API:", error);
            });
        }
    });
});
//deleta conexao
onEdgesChange((changes) => {
    changes.forEach(change => {
        if (change.type === 'remove') {
            console.log('Aresta removido:', change.id);

            const removedEdge = elements.value.find(el => el.id === change.id);

            if (removedEdge) {
                const wallId = route.params.id;

                const edgeDataToDelete = {
                    sourceId: removedEdge.source,
                    targetId: removedEdge.target,
                    wallId: wallId,
                };

                deleteEdge(edgeDataToDelete).catch(error => {
                    console.error("Erro ao deletar a aresta na API", error);
                });
            }
        }
    });
});

//add nota

async function handleAddNewNote() {
    try {
        const wallId = route.params.id;

        const newNoteFromApi = await createNote({
            wallId: wallId,
            textContent: 'Nova Nota'
        });

        //api pro vueflow
        const newNode ={
            id: newNoteFromApi.id,
            type: 'imageNode',
            position: { x: 100, y:100},
            data: {
                label: newNoteFromApi.textContent,
                imageUrl: null,
            }
        };

        elements.value.push(newNode);
    } catch (error) {
        console.error("Erro ao adicionar nova nota:", error);
        alert("Não foi possível criar a nota.");
    }
}

function onNodeDragStop(event) {
    const { node } = event;
    if (isReadOnly.value) return;

    if (node.position.x !== node.oldPosition?.x || node.position.y !== node.oldPosition?.y) {
        //chama api
        updateNotePosition(node.id, node.position).catch(err => {
            console.error("Falha salvar nova position:", err);
        });
    }
}

//edita nota

function openEditDialog({ node }) {
    if (isReadOnly.value) return;

    editingNote.value = node;
    editingText.value = node.data.label;
    editingImageUrl.value = node.data.imageUrl;
    isEditDialogVisible.value = true;
}

async function handleUpdateNote() {
    if (!editingNote.value) return;

    const noteId = editingNote.value.id;
    const dataToUpdate = {
        textContent: editingText.value,
        imageUrl: editingImageUrl.value,
    };

    try {
        await updateNote(noteId, dataToUpdate);

        const nodeInElements = elements.value.find(el => el.id === noteId);
        if (nodeInElements) {
            nodeInElements.data.label = editingText.value;
            nodeInElements.data.imageUrl = editingImageUrl.value;
        }

        isEditDialogVisible.value = false;
        editingNote.value = null;
        editingText.value = '';
    } catch (error) {
        console.error("Erro ao atualizar a nota:", error);
        alert("Não foi possível salvar as alterações.")
    }
}

async function onFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
        uploading.value = true;
        const result = await uploadFile(file);
        if (result && result.url) {
            editingImageUrl.value = result.url;
        }
    } catch (err) {
        console.error('Erro ao enviar arquivo:', err);
        alert('Falha ao enviar arquivo.');
    } finally {
        uploading.value = false;
    }
}

</script>

<template>
    <div class="map-container">
        <div v-if="isLoading">Carregando mapa...</div>
        <div v-else-if="error">{{ error }}</div>

        <div class="vf-wrapper" @contextmenu.prevent="onCanvasContextMenu" v-else>
        <div class="map-header">
                <div class="map-title">{{ wallTitle }}</div>
                <div v-if="isReadOnly" class="public-badge">Visualização Pública — Somente leitura</div>
                <div class="map-actions">
                    <small class="owner-label">Dono: <strong v-if="wallOwnerId">Você</strong><span v-else> —</span></small>
                </div>
                <div class="presence-list">
                        <template v-for="user in presenceUsers" :key="user.id">
                            <div class="presence-item" :title="user.name">
                                <div class="presence-avatar">
                                    <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="avatar" @error.once="e => e.target.style.display='none'" />
                                    <div v-else>{{ user.name ? (user.name.split(' ').map(n=>n[0]).slice(0,2).join('')) : '??' }}</div>
                                </div>
                            </div>
                        </template>
                </div>
                
        </div>
        <VueFlow 
            v-model="elements" 
            :node-types="nodeTypes"
            @node-double-click="openEditDialog" 
            @node-drag-stop="onNodeDragStop" 
            @connect="onConnect"
            fit-view-on-init
        >
            <div class="controls-custom" v-if="!isReadOnly">
                <Button icon="pi pi-plus" class="fab-add" @click="handleAddNewNote" title="Adicionar Nota" />
            </div>
        </VueFlow>
        </div>

        <!-- Context menu customizado -->
        <div v-if="contextMenuVisible" class="context-menu" :style="{ left: contextMenuLeft + 'px', top: contextMenuTop + 'px' }">
            <ul>
                <li @click.stop="handleContextAddNote">Adicionar nota aqui</li>
                <li @click.stop="closeContextMenu">Cancelar</li>
            </ul>
        </div>

        <Dialog 
            v-model:visible="isEditDialogVisible" 
            modal header="Editar Nota" 
            :style="{ width: '30rem' }"
        >
            <div class="form-group">
                <label for="note-text">Texto da Nota</label>
                <Textarea id="note-text" v-model="editingText" rows="5" class="w-full" />
            </div>
                <div class="form-group">
                    <label for="note-image">URL da Imagem (ou envie um arquivo)</label>
                    <InputText id="note-image" v-model="editingImageUrl" class="w-full" placeholder="Cole o link da imagem aqui" />
                    <input type="file" accept="image/*,application/pdf" @change="onFileChange" />
                    <div v-if="uploading">Enviando arquivo...</div>
                </div>
                <div v-if="editingNote && editingNote.data.authorName" class="form-group">
                    <label>Autor</label>
                    <div class="author-display">{{ editingNote.data.authorName }}</div>
                </div>

            <template #footer>
                <Button label="Cancelar" severity="secondary" @click="isEditDialogVisible = false" />
                <Button label="Salvar" @click="handleUpdateNote" />
            </template>
        </Dialog>
        <div class="help-fab">
            <Button icon="pi pi-question" class="p-button-rounded p-button-info" @click="isHelpVisible = true" />
        </div>

        <Dialog v-model:visible="isHelpVisible" header="Como usar o mural" :style="{ width: '30rem' }">
            <ul>
                <li>Arraste as notas para organizar (somente o dono do mural pode salvar posição).</li>
                <li>Clique duas vezes em uma nota para editar seu conteúdo ou anexar arquivo.</li>
                <li>Conecte notas arrastando do ponto de conexão para criar relações.</li>
                <li>Arquivos PDF abrem em nova aba; imagens aparecem no cartão.</li>
                <li>O nome do autor aparece abaixo da nota.</li>
            </ul>
            <template #footer>
                <Button label="Fechar" @click="isHelpVisible = false" />
            </template>
        </Dialog>
    </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.map-container {
    height: 100vh;
    width: 100%;
    position: relative;
}

.controls-custom {
    position: fixed;
    bottom: 22px;
    right: 22px;
    z-index: 1200;
}

.fab-add {
    --fab-size: 56px;
    width: var(--fab-size) !important;
    height: var(--fab-size) !important;
    border-radius: 50% !important;
    background-color: #2563eb !important;
    border: none !important;
    color: white !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 10px 30px rgba(37,99,235,0.18);
    transition: transform .12s ease, box-shadow .12s ease;
}
.fab-add:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 36px rgba(37,99,235,0.22);
}

.map-header {
    position: absolute;
    top: 12px;
    left: 18px;
    right: 18px;
    z-index: 1100;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(255,255,255,0.9);
    border-radius: 8px;
    box-shadow: 0 6px 18px rgba(2,6,23,0.06);
}
.map-title{ color: #111827; }
.map-actions .owner-label { color: #6b7280; }
.controls-custom .fab-add { background-color: #2563eb !important; }

.presence-avatar{ background: transparent; border: 1px solid rgba(0,0,0,0.06); }
.public-badge{
    background: #fde68a;
    color: #92400e;
    padding: 6px 10px;
    border-radius: 6px;
    font-weight:600;
    margin-left: 12px;
}
.map-title{
    font-weight: 700;
    font-size: 1.05rem;
}
.owner-label{
    color: #374151;
}
.presence-list{
    display:flex;
    gap:8px;
    align-items:center;
}
.presence-item{ }
.presence-avatar{
    width:32px;
    height:32px;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#111827;
    color:white;
    font-weight:700;
    font-size:12px;
}
.presence-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; display:block; }

.vf-wrapper {
    width: 100%;
    height: calc(100vh - 0px);
}

.context-menu {
    position: fixed;
    z-index: 10000;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(2,6,23,0.14);
    min-width: 160px;
    overflow: hidden;
}
.context-menu ul {
    list-style: none;
    margin: 0;
    padding: 8px 0;
}
.context-menu li {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
}
.context-menu li:hover {
    background: #f3f4f6;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
}

.w-full{
    width: 100%;
}
</style>