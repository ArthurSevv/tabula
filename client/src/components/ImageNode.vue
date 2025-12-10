<script setup>
// imports de bibliotecas
import { Handle, Position } from '@vue-flow/core';
import { computed } from 'vue';
import { deleteNote } from '@/services/api';

// definicao de propriedades (props)
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
});

// constante da api (ajuste se necessario para variavel de ambiente)
const API_BASE_URL = 'http://localhost:3000';

// ---------------------------------------------------------
// logica de midia (youtube, imagem, video, pdf)
// ---------------------------------------------------------

// detecta id do youtube
const youtubeId = computed(() => {
  const url = props.data?.mediaUrl || props.data?.imageUrl;
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
});

// resolve url completa para arquivos locais (uploads)
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
  
  // normaliza barras
  url = url.replace(/\\/g, '/').replace('uploads//', 'uploads/');
  return `${API_BASE_URL}/${url}`;
});

// verificacoes de tipo de arquivo
const isPdf = computed(() => !youtubeId.value && /\.pdf(\?.*)?$/i.test(resolvedUrl.value));
const isVideo = computed(() => !youtubeId.value && /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(resolvedUrl.value));

// ---------------------------------------------------------
// utilitarios visuais
// ---------------------------------------------------------

// iniciais para avatar sem imagem
function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
}

// estilo dinamico da nota (cor de fundo)
const nodeStyle = computed(() => {
  return {
    backgroundColor: props.data.noteColor || '#ffffff',
  };
});

// ---------------------------------------------------------
// acoes
// ---------------------------------------------------------

async function handleDeleteClick() {
  const noteId = props.data?.noteId || props.data?.id || props.id;
  if (!noteId) return;
  if (!confirm('deseja realmente deletar esta nota?')) return;
  
  try {
    await deleteNote(noteId);
  } catch (err) {
    console.error('erro ao deletar nota:', err);
    alert('nao foi possivel deletar a nota.');
  }
}
</script>

<template>
  <div 
    :class="['custom-node', { selected: props.selected }]"
    :style="nodeStyle" 
  >
    <Handle type="target" :position="Position.Top" class="handle-custom" />
    <Handle type="source" :position="Position.Bottom" class="handle-custom" />

    <div class="node-header">
      <div class="user-profile">
        <div class="avatar">
          <img v-if="props.data.authorAvatar" :src="props.data.authorAvatar" alt="avatar" @error.once="e => e.target.style.display='none'" />
          <div v-else class="initials">{{ getInitials(props.data.authorName) }}</div>
        </div>
        
        <div class="author-details">
          <span class="author-name">{{ props.data.authorName || 'Anônimo' }}</span>
          <span v-if="props.data.isOwnerNote" class="badge-me">você</span>
        </div>
      </div>
      
      <button v-if="props.data.isEditable" class="delete-icon" @click.stop="handleDeleteClick" title="deletar nota">
        ✕
      </button>
    </div>

    <div class="media-content">
      <template v-if="youtubeId">
        <div class="youtube-wrapper">
          <iframe :src="`https://www.youtube.com/embed/${youtubeId}`" title="YouTube" frameborder="0" allowfullscreen></iframe>
        </div>
      </template>

      <template v-else-if="resolvedUrl && isPdf">
        <a :href="resolvedUrl" target="_blank" class="pdf-link">
          <span class="icon">📄</span> abrir documento pdf
        </a>
      </template>

      <template v-else-if="resolvedUrl && isVideo">
        <video controls class="node-video"><source :src="resolvedUrl"></video>
      </template>

      <template v-else-if="resolvedUrl">
        <img :src="resolvedUrl" alt="anexo" class="node-image" @error.once="e => e.target.style.display='none'" />
      </template>
    </div>

    <div v-if="props.data.label" class="node-text">
      {{ props.data.label }}
    </div>

  </div>
</template>

<style scoped>
/* container principal da nota */
.custom-node {
  border-radius: 12px;
  background: white;
  padding: 0; /* padding controlado nos filhos */
  min-width: 220px;
  max-width: 320px;
  width: auto;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0,0,0,0.05);
  overflow: hidden; /* garante que imagem nao saia da borda arredondada */
  color: #1e293b; /* slate-800 */
}

/* efeito de selecao e hover */
.custom-node:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.custom-node.selected {
  outline: 2px solid #6366f1; /* indigo-500 */
  outline-offset: 2px;
}

/* cabecalho */
.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  background: rgba(255,255,255,0.4); /* levemente transparente */
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* avatar */
.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  background: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #475569;
  border: 1px solid white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }

.author-details {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.author-name {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.badge-me {
  font-size: 9px;
  color: #6366f1; /* indigo */
  font-weight: 700;
  text-transform: uppercase;
  margin-top: 2px;
}

/* botao de deletar */
.delete-icon {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  line-height: 1;
}
.delete-icon:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* area de midia */
.media-content {
  width: 100%;
  display: flex;
  justify-content: center;
  background: rgba(0,0,0,0.02);
}

.media-content img.node-image {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
  display: block;
}

.node-video {
  width: 100%;
  max-height: 200px;
  background: black;
}

.youtube-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  background: black;
}
.youtube-wrapper iframe {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
}

.pdf-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  width: 100%;
  text-decoration: none;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  background: #f1f5f9;
  border-top: 1px solid rgba(0,0,0,0.05);
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.pdf-link:hover { background: #e2e8f0; }

/* texto */
.node-text {
  padding: 12px;
  font-size: 14px;
  color: #1e293b;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* pontos de conexao */
.handle-custom {
  width: 10px;
  height: 10px;
  background: #6366f1;
  border: 2px solid white;
}
</style>