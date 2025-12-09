<script setup>
import { ref, onMounted, markRaw } from 'vue';
import { useRoute } from 'vue-router';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import ImageNode from '@/components/ImageNode.vue';
import { getPublicWall } from '@/services/api';

const route = useRoute();
const nodeTypes = { imageNode: markRaw(ImageNode) };

const elements = ref([]);
const isLoading = ref(true);
const error = ref(null);
const wallTitle = ref('');

onMounted(async () => {
  try {
    const wallData = await getPublicWall(route.params.id);
    wallTitle.value = wallData.title;

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
    console.error('Erro ao carregar mural público:', err);
    error.value = 'Não foi possível carregar o mural público.';
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="public-wall">
    <div v-if="isLoading">Carregando mural público...</div>
      <div v-else-if="error">{{ error }}</div>
      <div v-else>
        <div class="public-header">
          <button @click="$router.back()" class="back-btn">← Voltar</button>
          <h2>{{ wallTitle }}</h2>
          <div class="read-only-badge">Somente visualização</div>
        </div>
        <VueFlow v-model="elements" :node-types="nodeTypes" fit-view-on-init :nodes-draggable="false" :nodes-connectable="false" :elements-selectable="false">
          <Background />
        </VueFlow>
      </div>
  </div>
</template>

<style>
.public-wall {
  height: 100vh;
  width: 100%;
}

h2 {
  margin: 1rem;
}
</style>
