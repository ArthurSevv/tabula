<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { getWallById } from '@/services/api'

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
</script>

<template>
    <div style="height: 100vh; width: 100vw;">
        <div v-if="isLoading">Carregando mapa...</div>
        <div v-else-if="error">{{ error }}</div>
        <VueFlow v-else v-model="elements" fit-view-on-init></VueFlow>
    </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
</style>