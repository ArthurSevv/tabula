<script setup>
import { ref, onMounted } from 'vue';
import { getUserWalls, createWall } from '@/services/api';
import { useRouter } from 'vue-router';

import ProgressSpinner from 'primevue/progressspinner';
import Dialog from 'primevue/dialog';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

const router = useRouter();
const walls = ref([]);
const isLoading = ref(true);
const error = ref(null);

//pop up
const isDialogVisible = ref(false);
const newWallTitle = ref('');

onMounted(async () => {
    try {
        walls.value = await getUserWalls();
    } catch (error) {
        error.value = "Não foi possível carregar seus murais";
    } finally {
        isLoading.value = false;
    }
});

async function handleCreateWall() {
  if (!newWallTitle.value.trim()) {
    alert("O título não pode estar vazio.")
    return;
  }
  try {
    const newWall = await createWall({ title: newWallTitle.value });
    walls.value.push(newWall);
    isDialogVisible.value = false;
    newWallTitle.value = '';
  } catch (err) {
    alert("Não foi possível criar o mural.")
  }
}

function openWall(wallId) {
    console.log(`Abrindo Mural com ID: ${wallId}`);
}

</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1>Meus Murais</h1>
      <Button label="Criar Novo Mural" icon="pi pi-plus" @click="isDialogVisible = true" />
    </div>

    <div v-if="isLoading" class="loading-container">
      <ProgressSpinner />
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

    <Dialog v-model:visible="isDialogVisible" modal header="Criar Novo Mural" :style="{ width: '25rem' }">
        <div class="form-group">
            <label for="wall-title">Título do Mural</label>
            <InputText id="wall-title" v-model="newWallTitle" class="w-full" @keyup.enter="handleCreateWall" />
        </div>
        
        <template #footer>
            <Button label="Cancelar" severity="secondary" @click="isDialogVisible = false" />
            <Button label="Salvar" @click="handleCreateWall" />
        </template>
    </Dialog>

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

.form-group { 
  display: flex; 
  flex-direction: column; 
  gap: 0.5rem; 
  padding-top: 1rem; 
}

.w-full { 
  width: 100%; 
}

.error-message {
  color: #D8000C;
  background-color: #FFD2D2;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}
</style>