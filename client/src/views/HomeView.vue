<script setup>
import { ref, onMounted } from 'vue';
import { getUserWalls, createWall, deleteWall } from '@/services/api';
import { useConfirm } from "primevue/useconfirm";
import { useRouter } from 'vue-router';

import ProgressSpinner from 'primevue/progressspinner';
import Dialog from 'primevue/dialog';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { ConfirmDialog } from 'primevue';

const confirm = useConfirm();
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

function handleLogout() {
  localStorage.removeItem('userData');
  router.push('/auth')
}

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
  router.push(`/map/${wallId}`);
}

function handleDeleteWall(wallId) {
  confirm.require({
    message: 'Você tem certeza que quer deletar este mural? Todas as notas e conexões serão perdidas permanentemente.',
    header: 'Confirmação de Deleção',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sim, deletar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await deleteWall(wallId);
        walls.value = walls.value.filter(wall => wall.id !== wallId);
        //deixar bnito
      } catch (error) {
        console.error("Erro ao deletar mural:", err);
        alert("Não foi possível deletar o mural.");
      }
    }
  });
}

</script>

<template>
  <div class="home-container">
    <ConfirmDialog />

    <div class="header">
      <h1>Meus Murais</h1>

      <div class="header-actions">
        <Button 
          label="Criar Novo Mural" 
          icon="pi pi-plus" 
          @click="isDialogVisible = true" 
        />
        <Button
          icon="pi pi-sign-out"
          severity="secondary"
          text
          rounded
          @click="handleLogout"
          aria-label="Sair"
          v-tooltip.bottom="'Sair'"
        />
        </div>
      </div>

    <div v-if="isLoading" class="loading-container">
      <ProgressSpinner />
    </div>
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="walls.length > 0" class="walls-grid">
      <Card v-for="wall in walls" :key="wall.id" class="wall-card">
        <template #title>
          <div class="card-title">
            <span>{{ wall.title }}</span>
            <button 
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              @click.stop="handleDeleteWall(wall.id)"
              aria-label="Deletar Mural"
              v-tooltip.bottom="'Deletar Mural'"
            />
          </div>
        </template>
        <template #content>
          <div @click="openWall(wall.id)" class="card-content">
            <p>Criado em: {{ new Date(wall.createdAt).toLocaleDateString() }}</p>
          </div>
        </template>
      </Card>
    </div>

    <div v-else class="empty-state">
      <h2>Nenhum mural encontrado!</h2>
      <p>Você ainda não tem nenhum mural. Crie o seu primeiro!</p>
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

.header-action {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-content {
  cursor: pointer;
}
</style>