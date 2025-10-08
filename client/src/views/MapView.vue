<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { getWallById, createNote } from '@/services/api';
import { Button } from 'primevue';

const elements = ref([]);
const isLoading = ref(true);
const error = ref(null);

const route = useRoute();

onMounted(async () => {
    try {
        const wallId = route.params.id;
        const wallData = await getWallById(wallId);

        const nodes = wallData.notes.map((note, index) => ({
            id: note.id,
            label: note.textContent || 'Nota sem texto',
            position: { x: (index * 200) %800, y: Math.floor(index / 4) * 150 }
        }));

        const edges = [];
        elements.value = [...nodes, ...edges];

    } catch (error) {
        console.error("Erro ao carregar o mural:", error);
        error.value = "Não foi possível carregar os dados deste mural";
    } finally {
        isLoading.value = false;
    }
});

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

</script>

<template>
    <div style="height: 100vh; width: 100vw;">
        <div v-if="isLoading">Carregando mapa...</div>
        <div v-else-if="error">{{ error }}</div>
        <VueFlow v-else v-model="elements" fit-view-on-init>
            <div class="controls">
                <button icon="pi pi-plus" @click="handleAddNewNote" />
            </div>
        </VueFlow>
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
</style>