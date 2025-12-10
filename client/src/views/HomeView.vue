<script setup>
import { ref, onMounted, computed } from 'vue';
import { getUserWalls, createWall, deleteWall, updateWall, generateShareLink, uploadFile, updateUserAvatar } from '@/services/api';
import { useConfirm } from "primevue/useconfirm";
import { useRouter } from 'vue-router';

// Componentes PrimeVue
import ProgressSpinner from 'primevue/progressspinner';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { ConfirmDialog } from 'primevue';

const confirm = useConfirm();
const router = useRouter();
const walls = ref([]);
const userData = ref(JSON.parse(localStorage.getItem('userData')) || null);
const isLoading = ref(true);
const error = ref(null);

// Dialogs
const isDialogVisible = ref(false);
const newWallTitle = ref('');
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

// Avatar Logic
const avatarFileInput = ref(null);
function triggerAvatarFileInput(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  avatarFileInput.value.click();
}

async function onAvatarFileChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const res = await uploadFile(file);
    if (res && res.url) {
      const updated = await updateUserAvatar(userData.value.id, res.url);
      const newUserData = { ...userData.value, avatarUrl: updated.avatarUrl };
      localStorage.setItem('userData', JSON.stringify(newUserData));
      userData.value = newUserData;
      alert('Avatar atualizado!');
    }
  } catch (err) {
    console.error('Erro upload avatar:', err);
    alert('Erro ao atualizar avatar.');
  }
}

// Wall Logic
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
    message: 'Tem certeza? Todas as notas serão perdidas.',
    header: 'Excluir Mural',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Excluir',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await deleteWall(wallId);
        walls.value = walls.value.filter(wall => wall.id !== wallId);
      } catch (error) {
        alert("Erro ao deletar.");
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
  if (!editingWall.value || !editingWallTitle.value.trim()) return;
  try {
    const updated = await updateWall(editingWall.value.id, { title: editingWallTitle.value });
    const idx = walls.value.findIndex(w => w.id === updated.id);
    if (idx !== -1) walls.value[idx] = updated;
    isEditTitleDialogVisible.value = false;
  } catch (err) {
    alert('Erro ao atualizar.');
  }
}

function copyShareLink(wallId) {
  generateShareLink(wallId).then(res => {
    const token = res.shareLink || localStorage.getItem('shareToken');
    const shareUrl = `${window.location.origin}/map/${wallId}?token=${token}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert('Link copiado!'))
      .catch(() => alert('Erro ao copiar.'));
  });
}

async function handleGenerateShareLink(wallId) {
  try {
    const res = await generateShareLink(wallId);
    const token = res.shareLink;
    const shareUrl = `${window.location.origin}/map/${wallId}?token=${token}`;
    await navigator.clipboard.writeText(shareUrl);
    alert('Link regenerado e copiado!');
  } catch (err) { alert('Erro ao gerar link.'); }
}

async function openPublicView(wallId) {
  const res = await generateShareLink(wallId);
  const token = res?.shareLink;
  const url = `${window.location.origin}/map/${wallId}?token=${token}`;
  window.open(url, '_blank');
}

const userInitials = computed(() => {
  if (!userData.value?.name) return 'U';
  return userData.value.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
});
</script>

<template>
  <div class="app-wrapper">
    <ConfirmDialog />

    <header class="navbar">
      <div class="navbar-content">
        <div class="brand">
          <div class="logo-icon">T</div>
          <div class="brand-text">
            <h1>Tabula</h1>
          </div>
        </div>

        <div class="navbar-actions">
          <Button 
            label="Novo Mural" 
            icon="pi pi-plus" 
            class="create-btn"
            @click="isDialogVisible = true" 
          />

          <div class="user-profile">
            <div class="avatar-container" @click="triggerAvatarFileInput" title="Alterar foto">
              <img v-if="userData?.avatarUrl" :src="userData.avatarUrl" alt="Avatar" class="avatar-img" />
              <div v-else class="avatar-initials">{{ userInitials }}</div>
              
              <div class="avatar-overlay">
                <i class="pi pi-camera"></i>
              </div>
            </div>
            
            <div class="user-info">
              <span class="user-name">{{ userData?.name }}</span>
              <small class="logout-link" @click="handleLogout">Sair</small>
            </div>
            
            <input ref="avatarFileInput" type="file" accept="image/*" class="hidden-input" @change="onAvatarFileChange" />
          </div>
        </div>
      </div>
    </header>

    <main class="main-content">
      
      <div v-if="isLoading" class="state-container">
        <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
        <p>Carregando seus murais...</p>
      </div>

      <div v-else-if="error" class="error-banner">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ error }}</span>
      </div>

      <div v-else-if="walls.length > 0">
        <div class="section-header">
          <h2>Seus Murais</h2>
          <span class="count">{{ walls.length }} murais criados</span>
        </div>

        <div class="walls-grid">
          <div v-for="wall in walls" :key="wall.id" class="wall-card-wrapper">
            <div class="wall-card" @click="openWall(wall.id)">
              <div class="card-header-visual">
                <div class="visual-icon"><i class="pi pi-map"></i></div>
              </div>
              
              <div class="card-body">
                <h3 class="wall-title" :title="wall.title">{{ wall.title }}</h3>
                <p class="wall-date">
                  <i class="pi pi-calendar"></i> 
                  {{ new Date(wall.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }}
                </p>
              </div>

              <div class="card-footer" @click.stop>
                <div class="left-actions">
                  <Button icon="pi pi-pencil" text rounded size="small" @click="openEditWallDialog(wall)" v-tooltip="'Renomear'" />
                  <Button icon="pi pi-link" text rounded size="small" @click="copyShareLink(wall.id)" v-tooltip="'Copiar Link'" />
                </div>
                <div class="right-actions">
                  <Button icon="pi pi-external-link" text rounded size="small" @click="openPublicView(wall.id)" v-tooltip="'Ver Público'" />
                  <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="handleDeleteWall(wall.id)" v-tooltip="'Excluir'" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <i class="pi pi-folder-open"></i>
        </div>
        <h2>Nenhum mural por aqui</h2>
        <p>Comece a organizar suas ideias criando seu primeiro mural.</p>
        <Button label="Criar meu primeiro mural" icon="pi pi-plus" size="large" @click="isDialogVisible = true" />
      </div>
    </main>

    <Dialog v-model:visible="isDialogVisible" modal header="Novo Mural" :style="{ width: '400px' }">
        <div class="dialog-content">
            <span class="p-float-label mt-4">
                <InputText id="wall-title" v-model="newWallTitle" class="w-full" @keyup.enter="handleCreateWall" autofocus />
                <label for="wall-title">Dê um nome ao mural</label>
            </span>
        </div>
        <template #footer>
            <Button label="Cancelar" text severity="secondary" @click="isDialogVisible = false" />
            <Button label="Criar Mural" @click="handleCreateWall" />
        </template>
    </Dialog>

    <Dialog v-model:visible="isEditTitleDialogVisible" modal header="Renomear Mural" :style="{ width: '400px' }">
      <div class="dialog-content">
        <span class="p-float-label mt-4">
          <InputText id="edit-wall-title" v-model="editingWallTitle" class="w-full" @keyup.enter="handleUpdateWall" autofocus />
          <label for="edit-wall-title">Novo nome</label>
        </span>
      </div>
      <template #footer>
        <Button label="Cancelar" text severity="secondary" @click="isEditTitleDialogVisible = false" />
        <Button label="Salvar" @click="handleUpdateWall" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* Reset & Layout */
.app-wrapper {
  background-color: #f8fafc; /* Slate-50 */
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #334155;
}

/* Navbar Style */
.navbar {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.75rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.navbar-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.2rem;
}

.brand-text h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.create-btn {
  background-color: #4f46e5;
  border: none;
}
.create-btn:hover {
  background-color: #4338ca;
}

/* Perfil Moderno */
.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 1.5rem;
  border-left: 1px solid #e2e8f0;
}

.avatar-container {
  position: relative;
  width: 40px;
  height: 40px;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e2e8f0;
  transition: border-color 0.2s;
}
.avatar-container:hover {
  border-color: #6366f1;
}

.avatar-img {
  width: 100%; height: 100%; object-fit: cover;
}

.avatar-initials {
  width: 100%; height: 100%;
  background: #f1f5f9;
  color: #475569;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.9rem;
}

.avatar-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
}
.avatar-container:hover .avatar-overlay { opacity: 1; }
.avatar-overlay i { color: white; font-size: 0.8rem; }

.user-info {
  display: flex; flex-direction: column;
}

.user-name {
  font-weight: 600; font-size: 0.9rem; color: #1e293b;
}

.logout-link {
  font-size: 0.75rem; color: #64748b; cursor: pointer;
  transition: color 0.2s;
}
.logout-link:hover { color: #ef4444; text-decoration: underline; }
.hidden-input { display: none; }


/* Main Content */
.main-content {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1.5rem;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.section-header h2 {
  font-size: 1.5rem; color: #1e293b; margin: 0;
}
.section-header .count {
  font-size: 0.9rem; color: #64748b;
}

/* Cards Grid */
.walls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.wall-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 200px;
  cursor: pointer;
}

.wall-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.card-header-visual {
  height: 48px;
  background: linear-gradient(to right, #e0e7ff, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #f1f5f9;
}
.visual-icon {
  color: #818cf8;
  font-size: 1.2rem;
}

.card-body {
  padding: 1rem;
  flex: 1;
}

.wall-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wall-date {
  font-size: 0.8rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.card-footer {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
}

.left-actions, .right-actions {
  display: flex; gap: 0.25rem;
}

/* Empty & Loading States */
.state-container, .empty-state {
  text-align: center;
  padding: 4rem 1rem;
}

.empty-state {
  background: white;
  border-radius: 16px;
  border: 1px dashed #cbd5e1;
}

.empty-icon {
  font-size: 3rem;
  color: #cbd5e1;
  margin-bottom: 1rem;
}
.empty-state h2 { color: #1e293b; margin-bottom: 0.5rem; }
.empty-state p { color: #64748b; margin-bottom: 1.5rem; }

.error-banner {
  background: #fee2e2;
  color: #b91c1c;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2rem;
}

.w-full { width: 100%; }
.mt-4 { margin-top: 1.5rem; }
</style>