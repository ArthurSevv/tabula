<script setup>
import { ref, onMounted } from 'vue';
import { getUserWalls } from '@/services/api';
import { useRouter } from 'vue-router';

const router = useRouter();

const walls = ref([]);
const isLoading = ref(true);
const error = ref(null);

onMounted(async () => {
    try {
        const userWalls = await getUserWalls();
        walls.value = userWalls;
    } catch (error) {
        console.error("Erro ao buscar murais:", err);
        error.value = "Não foi possível carregar seus murais"
    } finally {
        isLoading.value = false;
    }
});

function openWall(wallId) {
    console.log(`Abrindo Mural com ID: ${wallId}`);
}

</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1>Meus Murais</h1>
      <Button label="Criar Novo Mural" icon="pi pi-plus" />
    </div>

    <div v-if="isLoading" class="loading-container">
      <ProgressSpinner />
      <p>Carregando seus murais...</p>
    </div>

    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="walls.length > 0" class="walls-grid">
      <Card v-for="wall in walls" :key="wall.id" class="wall-card" @click="openWall(wall.id)">
        <template #title>
          {{ wall.title }}
        </template>
        <template #content>
          <p>Criado em: {{ new Date(wall.createdAt).toLocaleDateString() }}</p>
        </template>
      </Card>
    </div>

    <div v-else class="empty-state">
      <h2>Nenhum mural encontrado!</h2>
      <p>Você ainda não tem nenhum mural. Que tal criar o primeiro?</p>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.loading-container, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #6c757d;
}

.walls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.wall-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.wall-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
}

.error-message {
  color: #D8000C;
  background-color: #FFD2D2;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}
</style>