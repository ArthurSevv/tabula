<script setup>
import { ref, onMounted, computed } from 'vue';
import { getUserWalls, createWall, deleteWall, updateWall, generateShareLink, uploadFile, updateUserAvatar } from '@/services/api';
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
const userData = ref(JSON.parse(localStorage.getItem('userData')) || null);
const isLoading = ref(true);
const error = ref(null);

//pop up
const isDialogVisible = ref(false);
const newWallTitle = ref('');

// editar titulo
const isEditTitleDialogVisible = ref(false);
const editingWall = ref(null);
const editingWallTitle = ref('');

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

async function onAvatarFileChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const res = await uploadFile(file);
    if (res && res.url) {
      const updated = await updateUserAvatar(userData.value.id, res.url);
      // update local storage and local state
      const newUserData = { ...userData.value, avatarUrl: updated.avatarUrl };
      localStorage.setItem('userData', JSON.stringify(newUserData));
      userData.value = newUserData;
      alert('Avatar atualizado!');
    }
  } catch (err) {
    console.error('Erro ao enviar avatar:', err);
    alert('Não foi possível atualizar o avatar.');
  }
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

function openEditWallDialog(wall) {
  editingWall.value = wall;
  editingWallTitle.value = wall.title;
  isEditTitleDialogVisible.value = true;
}

async function handleUpdateWall() {
  if (!editingWall.value) return;
  if (!editingWallTitle.value.trim()) {
    alert('O título não pode ser vazio.');
    return;
  }

  try {
    const updated = await updateWall(editingWall.value.id, { title: editingWallTitle.value });
    const idx = walls.value.findIndex(w => w.id === updated.id);
    if (idx !== -1) walls.value[idx] = updated;
    isEditTitleDialogVisible.value = false;
    editingWall.value = null;
    editingWallTitle.value = '';
  } catch (err) {
    console.error('Erro ao atualizar mural:', err);
    alert('Não foi possível atualizar o mural.');
  }
}

function copyShareLink(wallId) {
  // Ensure we have a valid share token from the server, then copy editable map link
  generateShareLink(wallId).then(res => {
    const token = res.shareLink || localStorage.getItem('shareToken');
    const shareUrl = `${window.location.origin}/map/${wallId}?token=${token}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link de compartilhamento copiado!');
      }).catch(() => {
        alert('Não foi possível copiar o link.');
      });
    } else {
      // fallback
      const tmp = document.createElement('textarea');
      tmp.value = shareUrl;
      document.body.appendChild(tmp);
      tmp.select();
      try {
        document.execCommand('copy');
        alert('Link de compartilhamento copiado!');
      } catch {
        alert('Não foi possível copiar o link.');
      }
      document.body.removeChild(tmp);
    }
  }).catch(err => {
    console.error('Erro ao obter token de compartilhamento:', err);
    alert('Não foi possível copiar o link de compartilhamento.');
  });
}

async function handleGenerateShareLink(wallId) {
  try {
    const res = await generateShareLink(wallId);
    const token = res.shareLink;
    const shareUrl = `${window.location.origin}/map/${wallId}?token=${token}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    }
    alert('Link de compartilhamento atualizado e copiado!');
  } catch (err) {
    console.error('Erro ao gerar link de compartilhamento:', err);
    alert('Não foi possível gerar o link.');
  }
}

const userInitials = computed(() => {
  if (!userData.value || !userData.value.name) return 'U';
  return userData.value.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
});

const avatarFileInput = ref(null);

function triggerAvatarFileInput(event) {
  // prevent other handlers
  if (event && event.stopPropagation) event.stopPropagation();
  if (avatarFileInput.value) avatarFileInput.value.click();
  else document.getElementById('avatar-file')?.click();
}

async function openPublicView(wallId) {
  try {
    // Ensure we have a share token (generate if missing) then open public URL
    const res = await generateShareLink(wallId);
    const token = res && res.shareLink ? res.shareLink : localStorage.getItem('shareToken');
    const url = `${window.location.origin}/map/${wallId}?token=${token}`;
    window.open(url, '_blank');
  } catch (err) {
    console.error('Erro ao abrir visualização pública:', err);
    alert('Não foi possível abrir a visualização pública.');
  }
}

</script>

<template>
  <div class="home-container">
    <ConfirmDialog />

    <div class="header">
      <div class="brand">
        <h1>Tabula</h1>
        <p class="tag">Murais colaborativos</p>
      </div>

      <div class="header-actions">
        <div class="profile">
          <div class="avatar" role="button" tabindex="0" @click.stop="triggerAvatarFileInput" @keyup.enter="triggerAvatarFileInput" title="Alterar avatar" style="cursor:pointer">
            <img v-if="userData?.avatarUrl" :src="userData.avatarUrl" alt="avatar" @error.once="e => e.target.style.display='none'" />
            <div v-else>{{ userInitials }}</div>
          </div>
          <div class="avatar-edit-icon" @click.stop="triggerAvatarFileInput" title="Alterar avatar">
            ✎
          </div>
          <div class="profile-info">
            <div class="name">{{ userData?.name }}</div>
            <div class="email">{{ userData?.email }}</div>
            <input id="avatar-file" ref="avatarFileInput" type="file" accept="image/*" style="display:none" @change="onAvatarFileChange" />
          </div>
        </div>

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
            <div class="card-actions">
              <Button icon="pi pi-link" class="p-button-text" @click.stop="copyShareLink(wall.id)" aria-label="Compartilhar" v-tooltip.bottom="'Copiar link público'" />
              <Button icon="pi pi-external-link" class="p-button-text" @click.stop.prevent="openPublicView(wall.id)" aria-label="Abrir Público" v-tooltip.bottom="'Abrir visualização pública (somente leitura)'" />
              <Button icon="pi pi-refresh" class="p-button-text" @click.stop="handleGenerateShareLink(wall.id)" aria-label="Regenerar link" v-tooltip.bottom="'Regenerar link público'" />
              <Button icon="pi pi-pencil" class="p-button-text" @click.stop="openEditWallDialog(wall)" aria-label="Editar" v-tooltip.bottom="'Editar título'" />
              <Button icon="pi pi-trash" class="p-button-text p-button-danger" @click.stop="handleDeleteWall(wall.id)" aria-label="Deletar Mural" v-tooltip.bottom="'Deletar Mural'" />
            </div>
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

    <Dialog v-model:visible="isEditTitleDialogVisible" modal header="Editar Título do Mural" :style="{ width: '25rem' }">
      <div class="form-group">
        <label for="edit-wall-title">Título do Mural</label>
        <InputText id="edit-wall-title" v-model="editingWallTitle" class="w-full" @keyup.enter="handleUpdateWall" />
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" @click="isEditTitleDialogVisible = false" />
        <Button label="Salvar" @click="handleUpdateWall" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.home-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background: #ffffff;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.brand h1 {
  margin: 0;
  color: #111827;
}
.brand .tag {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.profile {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 1rem;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e5e7eb; /* neutral gray */
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
/* Ensure avatar image fills the circle and is cropped if needed */
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
  overflow: hidden;
}
.avatar-edit-icon{
  position: relative;
  margin-left: -22px;
  margin-top: 18px;
  width: 20px;
  height: 20px;
  display:flex;
  align-items:center;
  justify-content:center;
  background: rgba(0,0,0,0.6);
  color: white;
  border-radius:50%;
  font-size:11px;
  cursor:pointer;
}
.profile-info {
  display: flex;
  flex-direction: column;
}
.profile-info .name {
  font-weight: 600;
}
.profile-info .email {
  font-size: 0.85rem;
  color: #666;
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
  gap: 1.2rem;
}

.wall-card {
  cursor: pointer;
  transition: all 0.18s ease-in-out;
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 8px;
  padding: 10px;
}

.wall-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(2,6,23,0.06);
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

.card-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.card-content {
  cursor: pointer;
}
</style>