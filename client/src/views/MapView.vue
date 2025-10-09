<script setup>
import { ref, onMounted, markRaw } from 'vue';
import { useRoute } from 'vue-router';
import { Background } from '@vue-flow/background';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { ControlButton, Controls } from '@vue-flow/controls';
import { getWallById, createNote, updateNote, updateNotePosition, deleteNote, createEdge, deleteEdge } from '@/services/api';
import ImageNode from '@/components/ImageNode.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';

const route = useRoute();
const { onConnect, addEdges, onNodesChange, onEdgesChange } = useVueFlow();
const nodeTypes = {
  imageNode: markRaw(ImageNode),
};

const elements = ref([]);
const isLoading = ref(true);
const error = ref(null);

const isEditDialogVisible = ref(false);
const editingNote = ref(null);
const editingText = ref('');
const editingImageUrl = ref('');

onMounted(async () => {
    try {
        const wallData = await getWallById(route.params.id);

        const nodes = wallData.notes.map((note, index) => {
            const hasSavedPosition = note.positionX !== null && note.positionY !== null;
            
            return {
                id: note.id,
                type: 'imageNode',
                position: hasSavedPosition
                    ? { x: note.positionX, y: note.positionY }
                    : { x: (index * 250) % 1000, y: Math.floor(index / 4) * 120 },
                data: {
                    label: note.textContent || 'Nota sem texto',
                    imageUrl: note.imageUrl,
                }
            };
        });

        const edges = wallData.edges.map(edge => ({
            id: `e${edge.sourceId}-${edge.targetId}`,
            source: edge.sourceId,
            target: edge.targetId,
        }));
        elements.value = [...nodes, ...edges];

    } catch (error) {
        console.error("Erro ao carregar o mural:", error);
        error.value = "Não foi possível carregar os dados deste mural";
    } finally {
        isLoading.value = false;
    }
});

onConnect((params) => {
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
//deleta nota
onNodesChange((changes) => {
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

</script>

<template>
    <div class="map-container">
        <div v-if="isLoading">Carregando mapa...</div>
        <div v-else-if="error">{{ error }}</div>

        <VueFlow 
            v-else 
            v-model="elements" 
            :node-types="nodeTypes"
            @node-double-click="openEditDialog" 
            @node-drag-stop="onNodeDragStop" 
            @connect="onConnect"
            fit-view-on-init
        >
            <Background />
            <Controls />

            <div class="controls-custom">
                <Button icon="pi pi-plus" @click="handleAddNewNote" title="Adicionar Nota" />
            </div>
        </VueFlow>

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
                <label for="note-image">URL da Imagem</label>
                <InputText id="note-image" v-model="editingImageUrl" class="w-full" placeholder="Cole o link da imagem aqui" />
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

.controls-custom {
    position: absolute;
    top: 15px;
    right: 15px;
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