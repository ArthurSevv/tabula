<script setup>
import { Handle, Position } from '@vue-flow/core';
import { computed } from 'vue';
import { deleteNote } from '@/services/api';

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
});

const API_BASE_URL = 'http://localhost:3000';

// --- LÓGICA DE DETECÇÃO DE MÍDIA (IGUAL ANTES) ---
const youtubeId = computed(() => {
  const url = props.data?.mediaUrl || props.data?.imageUrl;
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
});

const resolvedUrl = computed(() => {
  let url = props.data?.mediaUrl || props.data?.imageUrl;
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.includes('uploads')) {
    const parts = url.split('uploads');
    url = 'uploads' + parts[parts.length - 1];
  } else {
    url = `uploads/${url}`;
  }
  url = url.replace(/\\/g, '/').replace('uploads//', 'uploads/');
  return `${API_BASE_URL}/${url}`;
});

const isPdf = computed(() => !youtubeId.value && /\.pdf(\?.*)?$/i.test(resolvedUrl.value));
const isVideo = computed(() => !youtubeId.value && /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(resolvedUrl.value));

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
}

async function handleDeleteClick() {
  const noteId = props.data?.noteId || props.data?.id || props.id;
  if (!noteId) return;
  if (!confirm('Deseja realmente deletar esta nota?')) return;
  try {
    await deleteNote(noteId);
  } catch (err) {
    console.error('Erro ao deletar nota:', err);
    alert('Não foi possível deletar a nota.');
  }
}

// --- NOVO: LÓGICA DE COR DA NOTA ---
// Se não vier cor do banco, usa branco padrão
const nodeStyle = computed(() => {
  return {
    backgroundColor: props.data.noteColor || '#ffffff',
  };
});
</script>

<template>
  <div 
    :class="['custom-node', { selected: props.selected }]"
    :style="nodeStyle" 
  >
    
    <Handle type="target" :position="Position.Top" />
    <Handle type="source" :position="Position.Bottom" />

    <div class="meta-row">
      <div class="avatar" v-if="props.data.authorName">
        <img v-if="props.data.authorAvatar" :src="props.data.authorAvatar" alt="avatar" @error.once="e => e.target.style.display='none'" />
        <div v-else class="initials">{{ getInitials(props.data.authorName) }}</div>
      </div>
      <span class="top-author-name">{{ props.data.authorName }}</span> 
      <div class="spacer"></div>
    </div>

    <div class="media-container">
      <template v-if="youtubeId">
        <div class="youtube-wrapper">
          <iframe :src="`https://www.youtube.com/embed/${youtubeId}`" title="YouTube" frameborder="0" allowfullscreen></iframe>
        </div>
      </template>

      <template v-else-if="resolvedUrl && isPdf">
        <a :href="resolvedUrl" target="_blank" class="pdf-link">📄 Abrir PDF</a>
      </template>

      <template v-else-if="resolvedUrl && isVideo">
        <video controls class="node-video"><source :src="resolvedUrl"></video>
      </template>

      <template v-else-if="resolvedUrl">
        <img :src="resolvedUrl" alt="Anexo" @error.once="e => e.target.style.display='none'" />
      </template>
    </div>

    <div v-if="props.data.label" class="label-wrapper">
      {{ props.data.label }}
    </div>

    <div class="footer-wrapper">
      <div class="author-info">
        <small>Criado por: <strong>{{ props.data.authorName }}</strong> 
          <span v-if="props.data.isOwnerNote" class="me-badge">(Você)</span>
        </small>
      </div>
      
      <div class="node-actions">
        <button v-if="props.data.isEditable" class="delete-btn" @click="handleDeleteClick" title="Deletar">🗑️</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.custom-node {
  border: 1px solid #ccc; /* Borda mais neutra para combinar com cores */
  border-radius: 12px;
  background: white; /* Cor padrão */
  padding: 12px;
  min-width: 200px;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.custom-node:hover {
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.custom-node.selected {
  border: 2px solid #2563eb; /* Azul forte quando selecionado */
}

/* Mídia */
.media-container { margin-bottom: 10px; width: 100%; display: flex; justify-content: center; flex-direction: column; }
.media-container img, .node-video { width: 100%; height: auto; max-height: 200px; object-fit: contain; border-radius: 6px; }
.youtube-wrapper { position: relative; padding-bottom: 56.25%; height: 0; border-radius: 6px; overflow: hidden; background: black; }
.youtube-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

/* Cabeçalho */
.meta-row { display: flex; align-items: center; margin-bottom: 8px; gap: 8px; }
.avatar { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 1px solid rgba(0,0,0,0.1); }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.top-author-name { font-size: 12px; font-weight: 600; color: #444; }
.spacer { flex: 1; }

/* Texto */
.label-wrapper { font-size: 14px; margin-bottom: 10px; text-align: left; white-space: pre-wrap; word-break: break-word; line-height: 1.4; color: #1f2937; }

/* Rodapé */
.footer-wrapper { border-top: 1px solid rgba(0,0,0,0.1); padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.author-info small { color: #666; font-size: 11px; }
.me-badge { background: #10b981; color: white; padding: 1px 5px; border-radius: 4px; font-size: 9px; margin-left: 4px; font-weight: bold; text-transform: uppercase; }

/* Botões */
.delete-btn { background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0.6; transition: opacity 0.2s; }
.delete-btn:hover { opacity: 1; transform: scale(1.1); }
.pdf-link { display: block; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 6px; text-decoration: none; color: #333; font-size: 12px; font-weight: 600; }
</style>