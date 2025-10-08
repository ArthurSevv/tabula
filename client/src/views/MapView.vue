<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { getWallById, createNote, updateNote, updateNotePosition } from '@/services/api';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';

const route = useRoute();

const elements = ref([]);
const isLoading = ref(true);
const error = ref(null);

const isEditDialogVisible = ref(false);
const editingNote = ref(null);
const editingText = ref('');

onMounted(async () => {
    try {
        const wallId = route.params.id;
        const wallData = await getWallById(wallId);

        const nodes = wallData.notes.map((note, index) => {
            const hasSavedPosition = note.positionX !== null && note.positionY !== null;
            
            return {
                id: note.id,
                label: note.textContent || 'Nota sem texto',
                position: hasSavedPosition
                    ? { x: note.positionX, y: note.positionY }
                    : { x: (index * 250) % 1000, y: Math.floor(index / 4) * 120 },
            };
        });

        const edges = [];
        elements.value = [...nodes, ...edges];

    } catch (error) {
        console.error("Erro ao carregar o mural:", error);
        error.value = "Não foi possível carregar os dados deste mural";
    } finally {
        isLoading.value = false;
    }
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
            label: newNoteFromApi.textContent,
            //pos test REVER====================
            position: { x: 100, y:100}
        };

        elements.value.push(newNode);
    } catch (error) {
        console.error("Erro ao adicionar nova nota:", error);
        alert("Não foi possível criar a nota.");
    }
}

function onNodeDragStop(event) {
    const { node } = event;

    if (node.position.x !== node.oldPosition?.x || node.position.y !== node.oldPosition?.y) {
        //chama api
        updateNotePosition(node.id, node.position).catch(err => {
            console.error("Falha salvar nova position:", err);
        });
    }
}

//edita nota

function openEditDialog({ node }) {
    editingNote.value = node;
    editingText.value = node.label;
    isEditDialogVisible.value = true;
}

async function handleUpdateNote() {
    if (!editingNote.value) return;

    const noteId = editingNote.value.id;
    const newText = editingText.value;

    try {
        await updateNote(noteId, { textContent: newText });

        const nodeInElements = elements.value.find(el => el.id === noteId);
        if (nodeInElements) {
            nodeInElements.label = newText;
        }

        isEditDialogVisible.value = false;
        editingNote.value = null;
        editingText.value = '';
    } catch (error) {
        console.error("Erro ao atualizar a nota:", error);
        alert("Não foi possível salvar as alterações.")
    }
}

</script>

<template>
    <div class="map-container">
        <div v-if="isLoading">Carregando mapa...</div>
        <div v-else-if="error">{{ error }}</div>
        <VueFlow v-else v-model="elements" @node-double-click="openEditDialog" @node-drag-stop="onNodeDragStop" fit-view-on-init>
            <div class="controls">
                <Button icon="pi pi-plus" @click="handleAddNewNote" />
            </div>
        </VueFlow>

        <Dialog v-model:visible="isEditDialogVisible" modal header="Editar Nota" :style="{ width: '30rem' }">
            <div class="form-group">
                <Textarea v-model="editingText" rows="5" class="w-full" />
            </div>

            <template #footer>
                <Button label="Cancelar" severity="secondary" @click="isEditDialogVisible = false" />
                <Button label="Salvar" @click="handleUpdateNote" />
            </template>
        </Dialog>
    </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.map-container {
    height: 100vh;
    width: 100vh;
    position: relative;
}

.controls {
    position: absolute;
    z-index: 10;
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