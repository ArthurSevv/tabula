<script setup>
// imports de bibliotecas
import { ref, onMounted, onUnmounted, markRaw, computed } from 'vue';
import { io } from 'socket.io-client';
import { useRoute } from 'vue-router';
import { VueFlow, useVueFlow } from '@vue-flow/core';

// servicos de api
import { 
    getWallById, getPublicWall, createNote, updateNote, updateNotePosition, 
    deleteNote, createEdge, deleteEdge, uploadFile, updateWall 
} from '@/services/api';

// componentes customizados
import ImageNode from '@/components/ImageNode.vue';

// componentes de ui primevue
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import InputText from 'primevue/inputtext';

// inicializacao de rotas e fluxo
const route = useRoute();
const { addEdges, project } = useVueFlow();

// tipos de nos registrados
const nodeTypes = {
  imageNode: markRaw(ImageNode),
};

// ---------------------------------------------------------
// variaveis de estado (state)
// ---------------------------------------------------------

const elements = ref([]);
const isLoading = ref(true);
const error = ref(null);
const wallTitle = ref('');
const wallOwnerId = ref(null);
const isReadOnly = ref(false);

// configuracoes de fundo (background)
const wallBackgroundColor = ref('#f0f0f0');
const wallBackgroundImage = ref('');
const isSettingsVisible = ref(false);

// estados de edicao de nota
const isEditDialogVisible = ref(false);
const editingNote = ref(null);
const editingText = ref('');
const editingMediaUrl = ref('');
const editingColor = ref('#ffffff');
const uploading = ref(false);

// interface geral
const isHelpVisible = ref(false);
const presenceUsers = ref([]);
const socketRef = ref(null);

// menu de contexto (clique direito)
const contextMenuVisible = ref(false);
const contextMenuLeft = ref(0);
const contextMenuTop = ref(0);
const contextCanvasPos = ref({ x: 0, y: 0 });

// paleta de cores disponiveis
const colorPalette = [
    '#ffffff', '#f28b82', '#fbbc04', '#fff475', '#ccff90', 
    '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8', '#e6c9a8', '#e8eaed'
];

// ---------------------------------------------------------
// ciclo de vida (lifecycle)
// ---------------------------------------------------------

onMounted(async () => {
    try {
        const userData = JSON.parse(localStorage.getItem('userData'));
        const isLoggedIn = !!userData;

        // recupera token da url se houver e salva
        const shareTokenFromQuery = route.query.token || null;
        if (shareTokenFromQuery) {
            localStorage.setItem('shareToken', shareTokenFromQuery);
        }
        const shareToken = localStorage.getItem('shareToken') || null;

        // logica de permissao:
        // se nao ta logado, e readonly. se ta logado, tenta acesso total.
        if (!isLoggedIn) {
            isReadOnly.value = true;
        } else {
            isReadOnly.value = false;
        }

        // busca dados do mural
        // importante: passa o sharetoken mesmo se estiver logado, para validar acesso caso nao seja dono
        const wallData = isReadOnly.value 
            ? await getPublicWall(route.params.id) 
            : await getWallById(route.params.id, shareToken);
        
        // configura dados do mural
        wallTitle.value = wallData.title || '';
        wallOwnerId.value = wallData.ownerId || null;
        
        if (wallData.backgroundColor) wallBackgroundColor.value = wallData.backgroundColor;
        if (wallData.backgroundImage) wallBackgroundImage.value = wallData.backgroundImage;

        const currentUserId = userData ? userData.id : null;

        // mapeia notas do banco para o vueflow
        const nodes = wallData.notes.map((note, index) => {
            const hasSavedPosition = note.positionX !== null && note.positionY !== null;
            
            // verifica permissao de edicao da nota especifica
            const canEditNote = isLoggedIn && (
                currentUserId === note.authorId || 
                currentUserId === wallData.ownerId || 
                shareToken 
            );

            return {
                id: note.id.toString(),
                type: 'imageNode',
                position: hasSavedPosition
                    ? { x: note.positionX, y: note.positionY }
                    : { x: (index * 250) % 1000, y: Math.floor(index / 4) * 120 },
                data: {
                    label: note.textContent || '',
                    mediaUrl: note.mediaUrl || note.imageUrl || null,
                    noteColor: note.color || '#ffffff', 
                    noteId: note.id,
                    authorName: note.author?.name || null,
                    authorAvatar: note.author?.avatarUrl || null,
                    authorId: note.authorId,
                    isEditable: canEditNote,
                    isOwnerNote: currentUserId === note.authorId, 
                }
            };
        });

        const edges = wallData.edges.map(edge => ({
            id: `e${edge.sourceId}-${edge.targetId}`,
            source: edge.sourceId.toString(),
            target: edge.targetId.toString(),
        }));
        elements.value = [...nodes, ...edges];

    } catch (err) {
        console.error("erro ao carregar mural:", err);
        // fallback: se falhar o carregamento autenticado (403), tenta mostrar erro amigavel
        if (!isReadOnly.value) {
            isReadOnly.value = true;
            error.value = "voce nao tem permissao ou o mural nao existe.";
        } else {
            error.value = "erro ao carregar dados do mural";
        }
    } finally {
        isLoading.value = false;
    }

    setupSocket();
    document.addEventListener('click', onDocClick);
    window.addEventListener('keydown', onEsc);
});

onUnmounted(() => {
    document.removeEventListener('click', onDocClick);
    window.removeEventListener('keydown', onEsc);
    if (socketRef.value) socketRef.value.disconnect();
});

// ---------------------------------------------------------
// logica de socket (realtime)
// ---------------------------------------------------------

function setupSocket() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData'));
        const token = userData ? userData.token : null;
        
        // so conecta no socket se tiver token de usuario
        if (!token) return;

        const socket = io('http://localhost:3000', { auth: { token } });
        socketRef.value = socket;

        const shareToken = localStorage.getItem('shareToken') || null;
        socket.emit('join-wall', { wallId: route.params.id, shareLink: shareToken });

        // logica de presenca corrigida
        // mostra todo mundo (incluindo eu), mas remove duplicatas de abas
        socket.on('presence', (users) => { 
            if (!users || !Array.isArray(users)) {
                presenceUsers.value = [];
                return;
            }

            const uniqueUsers = [];
            const seenIds = new Set();

            users.forEach(u => {
                if (u.id && !seenIds.has(u.id)) {
                    seenIds.add(u.id);
                    uniqueUsers.push(u);
                }
            });

            presenceUsers.value = uniqueUsers;
        });

        // eventos de notas e mural
        socket.on('noteCreated', (note) => {
            if (elements.value.some(el => el.id.toString() === note.id.toString())) return;
            
            const currentUser = JSON.parse(localStorage.getItem('userData'));
            const currentUserId = currentUser ? currentUser.id : null;

             elements.value.push({
                id: note.id.toString(),
                type: 'imageNode',
                position: { x: note.positionX ?? 100, y: note.positionY ?? 100 },
                data: {
                    label: note.textContent,
                    mediaUrl: note.mediaUrl,
                    noteColor: note.color || '#ffffff',
                    noteId: note.id,
                    authorName: note.author?.name,
                    authorAvatar: note.author?.avatarUrl,
                    authorId: note.authorId,
                    isEditable: currentUserId && (currentUserId === note.authorId || currentUserId === wallOwnerId.value || localStorage.getItem('shareToken')),
                    isOwnerNote: currentUserId === note.authorId,
                }
            });
        });

        socket.on('noteUpdated', (note) => {
            const idx = elements.value.findIndex(el => el.id.toString() === note.id.toString());
            if (idx !== -1) {
                const n = elements.value[idx];
                n.data.label = note.textContent;
                n.data.mediaUrl = note.mediaUrl;
                n.data.noteColor = note.color;
            }
        });
        
        socket.on('wallUpdated', (w) => {
            if(w.backgroundColor) wallBackgroundColor.value = w.backgroundColor;
            if(w.backgroundImage !== undefined) wallBackgroundImage.value = w.backgroundImage;
        });

        socket.on('noteMoved', (note) => {
            const idx = elements.value.findIndex(el => el.id.toString() === note.id.toString());
            if (idx !== -1) elements.value[idx].position = { x: note.positionX, y: note.positionY };
        });

        socket.on('noteDeleted', ({ id }) => {
            const idx = elements.value.findIndex(el => el.id.toString() === id.toString());
            if (idx !== -1) elements.value.splice(idx, 1);
        });

        socket.on('edgeCreated', (edge) => {
            const edgeId = `e${edge.sourceId}-${edge.targetId}`;
            if (!elements.value.some(el => el.id === edgeId)) {
                elements.value.push({ id: edgeId, source: edge.sourceId.toString(), target: edge.targetId.toString() });
            }
        });

        socket.on('edgeDeleted', ({ sourceId, targetId }) => {
            const edgeId1 = `e${sourceId}-${targetId}`;
            const idx = elements.value.findIndex(el => el.id === edgeId1 || el.id === `e${targetId}-${sourceId}`);
            if (idx !== -1) elements.value.splice(idx, 1);
        });

    } catch (err) { console.warn(err); }
}

// ---------------------------------------------------------
// funcoes do mural (fundo, conexoes)
// ---------------------------------------------------------

const wallStyle = computed(() => ({
    backgroundColor: wallBackgroundColor.value,
    backgroundImage: wallBackgroundImage.value ? `url(${wallBackgroundImage.value})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center'
}));

async function onWallBgFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
        const result = await uploadFile(file);
        if (result && result.url) wallBackgroundImage.value = result.url;
        else if (result && result.fileUrl) wallBackgroundImage.value = result.fileUrl;
    } catch (err) { alert('falha ao enviar imagem de fundo'); }
}

async function handleSaveWallSettings() {
    try {
        await updateWall(route.params.id, {
            backgroundColor: wallBackgroundColor.value,
            backgroundImage: wallBackgroundImage.value
        });
        isSettingsVisible.value = false;
    } catch (err) { isSettingsVisible.value = false; }
}

const handleConnect = (params) => {
    if (isReadOnly.value) return;
    const wallId = route.params.id;
    addEdges([params]); 
    createEdge({ sourceId: params.source, targetId: params.target, wallId })
        .catch(err => console.error("erro ao ligar notas:", err));
};

// ---------------------------------------------------------
// funcoes de nota (criar, editar, mover)
// ---------------------------------------------------------

function openEditDialog({ node }) {
    if (isReadOnly.value) return;
    editingNote.value = node;
    editingText.value = node.data.label;
    editingMediaUrl.value = node.data.mediaUrl || '';
    editingColor.value = node.data.noteColor || '#ffffff';
    isEditDialogVisible.value = true;
}

async function handleUpdateNote() {
    if (!editingNote.value) return;
    const noteId = editingNote.value.id;
    const data = { 
        textContent: editingText.value, 
        mediaUrl: editingMediaUrl.value, 
        color: editingColor.value 
    };
    try {
        await updateNote(noteId, data);
        const el = elements.value.find(e => e.id === noteId);
        if (el) {
            el.data.label = data.textContent;
            el.data.mediaUrl = data.mediaUrl;
            el.data.noteColor = data.color;
        }
        isEditDialogVisible.value = false;
        editingNote.value = null;
    } catch (error) { alert("erro ao salvar nota"); }
}

async function handleAddNewNote() {
    try {
        await createNote({
            wallId: route.params.id,
            textContent: 'Nova Nota',
            color: '#fff475'
        });
    } catch (error) { console.error(error); }
}

async function onFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
        uploading.value = true;
        const res = await uploadFile(file);
        if (res?.url) editingMediaUrl.value = res.url;
        else if (res?.fileUrl) editingMediaUrl.value = res.fileUrl;
    } catch (err) { alert('erro upload'); } 
    finally { uploading.value = false; }
}

function onNodeDragStop(event) {
    const { node } = event;
    if (isReadOnly.value) return;
    if (node.position.x !== node.oldPosition?.x || node.position.y !== node.oldPosition?.y) {
        updateNotePosition(node.id, node.position).catch(console.error);
    }
}

// ---------------------------------------------------------
// menu de contexto (clique direito)
// ---------------------------------------------------------

const onDocClick = (e) => {
    const menuEl = document.querySelector('.context-menu');
    if (menuEl && !menuEl.contains(e.target)) contextMenuVisible.value = false;
};
const onEsc = (e) => { if (e.key === 'Escape') closeContextMenu(); };
function closeContextMenu() { contextMenuVisible.value = false; }

function onCanvasContextMenu(event) {
    event.preventDefault();
    const { x, y } = project({ x: event.clientX, y: event.clientY });
    contextCanvasPos.value = { x, y };
    contextMenuLeft.value = event.clientX + 2;
    contextMenuTop.value = event.clientY + 2;
    contextMenuVisible.value = true;
}

async function handleContextAddNote() {
    if (isReadOnly.value) return closeContextMenu();
    try {
        await createNote({
            wallId: route.params.id,
            textContent: 'Nova Nota',
            positionX: contextCanvasPos.value.x,
            positionY: contextCanvasPos.value.y,
            color: '#ffffff'
        });
    } catch (err) { alert('erro ao criar nota'); } 
    finally { closeContextMenu(); }
}
</script>

<template>
    <div class="map-container">
        <div v-if="isLoading" class="center-msg">carregando mapa...</div>
        <div v-else-if="error" class="center-msg error">{{ error }}</div>

        <div class="vf-wrapper" :style="wallStyle" @contextmenu.prevent="onCanvasContextMenu" v-else>
            
            <div class="map-header">
                <div class="header-left">
                    <div class="logo-box">T</div>
                    <div class="map-title">{{ wallTitle }}</div>
                    <div v-if="isReadOnly" class="public-badge">somente leitura</div>
                </div>

                <div class="header-right">
                    <div class="presence-list">
                        <template v-for="(user, index) in presenceUsers" :key="user.id">
                            <div class="presence-item" :title="user.name" :style="{ zIndex: 100 - index }">
                                <div class="presence-avatar">
                                    <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="avatar" />
                                    <div v-else>{{ user.name ? user.name.charAt(0).toUpperCase() : '?' }}</div>
                                </div>
                            </div>
                        </template>
                    </div>

                    <Button 
                        v-if="!isReadOnly" 
                        icon="pi pi-cog" 
                        class="p-button-rounded p-button-text p-button-secondary btn-settings" 
                        @click="isSettingsVisible = true" 
                        title="Configurações"
                    />
                </div>
            </div>

            <VueFlow 
                v-model="elements" 
                :node-types="nodeTypes"
                @node-double-click="openEditDialog" 
                @node-drag-stop="onNodeDragStop" 
                @connect="handleConnect"  
                fit-view-on-init
            >
                <div class="controls-custom" v-if="!isReadOnly">
                    <Button icon="pi pi-plus" class="fab-add" @click="handleAddNewNote" title="Adicionar Nota" />
                </div>
            </VueFlow>
        </div>

        <div v-if="contextMenuVisible" class="context-menu" :style="{ left: contextMenuLeft + 'px', top: contextMenuTop + 'px' }">
            <ul>
                <li @click.stop="handleContextAddNote">adicionar nota aqui</li>
                <li @click.stop="closeContextMenu">cancelar</li>
            </ul>
        </div>

        <Dialog v-model:visible="isSettingsVisible" modal header="Aparência do Mural" :style="{ width: '30rem' }">
            <div class="form-group">
                <label class="font-bold mb-2 block">cor de fundo</label>
                <div class="color-picker-row">
                    <div v-for="color in ['#f0f0f0', '#ffffff', '#e3f2fd', '#fce4ec', '#fff8e1', '#e8f5e9', '#2d3748', '#1a202c']" 
                        :key="color" class="color-swatch"
                        :style="{ backgroundColor: color, border: wallBackgroundColor === color ? '2px solid #2563eb' : '1px solid #ddd' }"
                        @click="wallBackgroundColor = color; wallBackgroundImage = ''" :title="color"></div>
                </div>
            </div>
            <div class="form-group mt-4">
                <label class="font-bold mb-2 block">imagem de fundo</label>
                <div class="upload-box">
                    <label class="upload-label">📁 enviar imagem do computador <input type="file" accept="image/*" @change="onWallBgFileChange" style="display: none;" /></label>
                </div>
                <div class="divider">ou cole um link</div>
                <InputText v-model="wallBackgroundImage" class="w-full" placeholder="https://..." />
                <div v-if="wallBackgroundImage" class="bg-preview" :style="{ backgroundImage: `url(${wallBackgroundImage})` }">
                    <button class="remove-bg-btn" @click="wallBackgroundImage = ''">✕ remover imagem</button>
                </div>
            </div>
            <template #footer>
                <Button label="Cancelar" severity="secondary" @click="isSettingsVisible = false" />
                <Button label="Salvar Alterações" @click="handleSaveWallSettings" />
            </template>
        </Dialog>

        <Dialog v-model:visible="isEditDialogVisible" modal header="Editar Nota" :style="{ width: '30rem' }">
            <div class="form-group">
                <label class="font-bold">cor da nota</label>
                <div class="color-picker-row">
                    <div v-for="color in colorPalette" :key="color" class="color-swatch"
                        :style="{ backgroundColor: color, border: editingColor === color ? '2px solid #555' : '1px solid #ddd' }"
                        @click="editingColor = color"></div>
                </div>
            </div>
            <div class="form-group mt-4"><label class="font-bold">texto</label><Textarea v-model="editingText" rows="4" class="w-full" /></div>
            <div class="form-group mt-4"><label class="font-bold">midia</label><InputText v-model="editingMediaUrl" class="w-full mb-2" /><input type="file" @change="onFileChange" /></div>
            <template #footer><Button label="Cancelar" severity="secondary" @click="isEditDialogVisible = false" /><Button label="Salvar" @click="handleUpdateNote" /></template>
        </Dialog>

        <div class="help-fab"><Button icon="pi pi-question" class="p-button-rounded p-button-info p-button-text" @click="isHelpVisible = true" /></div>
        <Dialog v-model:visible="isHelpVisible" header="Ajuda" :style="{ width: '30rem' }"><ul><li>arraste as notas para organizar.</li><li>clique duas vezes para editar.</li></ul></Dialog>
    </div>
</template>

<style>
/* importacao estilos do vueflow */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

/* layout principal */
.map-container { height: 100vh; width: 100%; position: relative; overflow: hidden; background: #f8fafc; font-family: 'Inter', sans-serif; }
.vf-wrapper { width: 100%; height: 100vh; transition: background 0.3s ease; }

/* cabecalho flutuante */
.map-header {
    position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 1100;
    display: flex; justify-content: space-between; align-items: center;
    width: 95%; max-width: 1200px;
    padding: 8px 16px; 
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.6);
    border-radius: 99px; 
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}
.header-left { display: flex; align-items: center; gap: 12px; }
.logo-box { width:32px; height:32px; background:#4f46e5; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size: 14px; }
.map-title { font-weight: 700; font-size: 1rem; color: #1e293b; }
.public-badge { background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; text-transform:uppercase; border: 1px solid #e2e8f0; }

/* avatares empilhados */
.header-right { display: flex; align-items: center; gap: 12px; }
.presence-list { 
    display:flex; 
    align-items: center; 
    margin-right: 10px; 
    padding-left: 10px; 
}

.presence-item {
    margin-left: -12px; /* efeito de sobreposicao */
    transition: transform 0.2s, margin 0.2s;
    position: relative;
    cursor: help;
}

.presence-item:hover {
    transform: translateY(-4px); 
    z-index: 200 !important; 
    margin-right: 4px;
}

.presence-avatar { 
    width:36px; height:36px; border-radius:50%; 
    background:#e2e8f0; color:#475569; display:flex; 
    align-items:center; justify-content:center; 
    font-size:12px; border: 2px solid white; 
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    font-weight: 700;
}
.presence-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }

.btn-settings { color: #64748b !important; }
.btn-settings:hover { background: rgba(0,0,0,0.05) !important; color: #1e293b !important; }

/* botoes flutuantes */
.controls-custom { position: fixed; bottom: 30px; right: 30px; z-index: 1200; }
.fab-add { width: 56px !important; height: 56px !important; border-radius: 50% !important; background-color: #4f46e5 !important; border:none !important; box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4); }
.fab-add:hover { transform: scale(1.05); }
.help-fab { position: fixed; bottom: 30px; left: 30px; z-index: 1200; }

/* utilitarios visuais */
.font-bold { font-weight: 600; color: #334155; }
.block { display: block; }
.mb-2 { margin-bottom: 0.5rem; } .mt-4 { margin-top: 1rem; } .w-full { width: 100%; }

.color-picker-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px; }
.color-swatch { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.color-swatch:hover { transform: scale(1.15); }

.upload-box { margin-bottom: 10px; }
.upload-label { display: block; padding: 12px; background: #eef2ff; color: #4f46e5; border: 1px dashed #6366f1; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; text-align: center; }
.divider { font-size: 11px; text-align: center; color: #94a3b8; margin: 12px 0; display: flex; align-items: center; gap: 10px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
.bg-preview { margin-top: 10px; width: 100%; height: 100px; background-size: cover; background-position: center; border-radius: 8px; position: relative; }
.remove-bg-btn { position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 10px; }
.context-menu { position: fixed; z-index: 10000; background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); padding: 6px 0; min-width: 150px; }
.context-menu li { padding: 10px 16px; cursor: pointer; font-size: 14px; color: #334155; }
.context-menu li:hover { background: #f1f5f9; color: #4f46e5; }
</style>