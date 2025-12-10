<script setup>
import { ref, onMounted, markRaw, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import ImageNode from '@/components/ImageNode.vue';
import { getPublicWall } from '@/services/api';
import Button from 'primevue/button';

const route = useRoute();
const router = useRouter();
const nodeTypes = { imageNode: markRaw(ImageNode) };

const elements = ref([]);
const isLoading = ref(true);
const error = ref(null);
const wallData = ref(null); // Armazena dados completos do mural para o fundo

onMounted(async () => {
  try {
    const data = await getPublicWall(route.params.id);
    wallData.value = data;

    const nodes = data.notes.map((note, index) => {
      const hasSavedPosition = note.positionX !== null && note.positionY !== null;
      return {
        id: note.id.toString(),
        type: 'imageNode',
        position: hasSavedPosition
          ? { x: note.positionX, y: note.positionY }
          : { x: (index * 250) % 1000, y: Math.floor(index / 4) * 120 },
        // IMPORTANTE: Mapear todos os dados novos (cor, mediaUrl, autor)
        data: {
          label: note.textContent || '',
          mediaUrl: note.mediaUrl || note.imageUrl || null,
          noteColor: note.color || '#ffffff',
          authorName: note.author?.name || 'Anônimo',
          authorAvatar: note.author?.avatarUrl || null,
          isEditable: false, // Força false para visualização pública
          isOwnerNote: false 
        }
      };
    });

    const edges = data.edges.map(edge => ({
      id: `e${edge.sourceId}-${edge.targetId}`,
      source: edge.sourceId.toString(),
      target: edge.targetId.toString(),
      animated: true, // Estilo visual para conexões
    }));

    elements.value = [...nodes, ...edges];
  } catch (err) {
    console.error('Erro ao carregar mural público:', err);
    error.value = 'Mural não encontrado ou acesso restrito.';
  } finally {
    isLoading.value = false;
  }
});

// Estilo dinâmico do fundo
const wallStyle = computed(() => {
    if (!wallData.value) return {};
    return {
        backgroundColor: wallData.value.backgroundColor || '#f8fafc',
        backgroundImage: wallData.value.backgroundImage ? `url(${wallData.value.backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
    };
});

function goToLogin() {
    router.push('/auth');
}
</script>

<template>
  <div class="public-wall-wrapper">
    
    <div v-if="isLoading" class="center-state">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: #4f46e5;"></i>
        <p>Carregando mural...</p>
    </div>

    <div v-else-if="error" class="center-state">
        <i class="pi pi-lock" style="font-size: 2rem; color: #94a3b8;"></i>
        <h2>{{ error }}</h2>
        <Button label="Voltar para o Início" text @click="goToLogin" />
    </div>

    <div v-else class="wall-viewport" :style="wallStyle">
        
        <header class="public-header">
            <div class="header-content">
                <div class="brand">
                    <div class="logo-icon">T</div>
                    <div class="titles">
                        <h1>{{ wallData?.title }}</h1>
                        <span class="badge">Visualização Pública</span>
                    </div>
                </div>

                <div class="actions">
                    <span class="cta-text">Gostou? Crie o seu!</span>
                    <Button label="Entrar no Tabula" size="small" @click="goToLogin" />
                </div>
            </div>
        </header>

        <VueFlow 
            v-model="elements" 
            :node-types="nodeTypes" 
            fit-view-on-init 
            :nodes-draggable="false" 
            :nodes-connectable="false" 
            :elements-selectable="true"
            :zoom-on-scroll="true"
            :pan-on-scroll="true"
            class="flow-container"
        >
          <Background pattern-color="#aaa" :gap="20" />
        </VueFlow>

        <div class="read-only-footer">
            <i class="pi pi-eye"></i> Você está em modo somente leitura.
        </div>
    </div>
  </div>
</template>

<style scoped>
.public-wall-wrapper {
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: #f8fafc;
  font-family: 'Inter', sans-serif;
}

.center-state {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: #64748b;
}

.wall-viewport {
    width: 100%;
    height: 100%;
    position: relative;
    transition: background 0.3s ease;
}

/* Header Flutuante Estilo "Glassmorphism" */
.public-header {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 90%;
    max-width: 1000px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    padding: 0.75rem 1.5rem;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.logo-icon {
    width: 32px;
    height: 32px;
    background: #4f46e5;
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
}

.titles h1 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}

.badge {
    font-size: 0.7rem;
    background: #fef3c7;
    color: #92400e;
    padding: 2px 8px;
    border-radius: 99px;
    font-weight: 600;
    text-transform: uppercase;
}

.actions {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.cta-text {
    font-size: 0.85rem;
    color: #64748b;
    display: none; /* Esconde em mobile */
}

@media (min-width: 768px) {
    .cta-text { display: block; }
}

/* Footer Fixo */
.read-only-footer {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30, 41, 59, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 99px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 1000;
    pointer-events: none; /* Permite clicar através dele se necessário */
    backdrop-filter: blur(4px);
}

.flow-container {
    height: 100%;
    width: 100%;
}
</style>