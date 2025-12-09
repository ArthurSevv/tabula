<script setup>
import { Handle, Position } from '@vue-flow/core';
import { computed } from 'vue';
import { deleteNote } from '@/services/api';

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const isPdf = computed(() => {
  const url = props.data?.imageUrl || '';
  return /\.pdf(\?.*)?$/i.test(url);
});

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
}

async function handleDeleteClick() {
  const noteId = props.data?.noteId || props.data?.id;
  if (!noteId) return;
  if (!confirm('Deseja realmente deletar esta nota?')) return;
  try {
    await deleteNote(noteId);
  } catch (err) {
    console.error('Erro ao deletar nota:', err);
    alert('Não foi possível deletar a nota.');
  }
}
</script>

<template>
  <div :class="['custom-node', { owner: props.data?.isOwner }]">
    <Handle type="target" :position="Position.Top" />
    <Handle type="source" :position="Position.Bottom" />

    <div class="meta-row">
      <div class="avatar" v-if="props.data.authorName">
        <img v-if="props.data.authorAvatar" :src="props.data.authorAvatar" alt="avatar" @error.once="e => e.target.style.display='none'" />
        <div v-else class="initials">{{ getInitials(props.data.authorName) }}</div>
      </div>
      <div class="spacer"></div>
    </div>

    <div v-if="props.data.imageUrl" class="image-wrapper">
      <template v-if="isPdf">
        <a :href="props.data.imageUrl" target="_blank" rel="noopener noreferrer" class="pdf-link">
          📄 Abrir PDF
        </a>
      </template>
      <template v-else>
        <img :src="props.data.imageUrl" alt="Image da nota" @error.once="e => e.target.style.display='none'" />
      </template>
    </div>

    <div v-if="props.data.label" class="label-wrapper">
      {{ props.data.label }}
    </div>
    <div v-if="props.data.authorName" class="author-wrapper">
      <small>— {{ props.data.authorName }} <span v-if="props.data.isOwnerNote" class="owner-badge">(Proprietário)</span></small>
      <div class="node-actions">
        <button v-if="props.data.isEditable" class="delete-btn" @click="handleDeleteClick" title="Deletar nota">🗑️</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-node {
  border: 1px solid #777;
  border-radius: 8px;
  background: white;
  padding: 10px;
  min-width: 120px;
  max-width: 340px;
  width: auto;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}

.custom-node.owner {
  border-color: #10b981;
  background: #f0fdf4;
}

.owner-badge {
  background: #10b981;
  color: white;
  padding: 3px 8px;
  border-radius: 999px;
  margin-left: 8px;
  font-weight: 700;
  font-size: 11px;
}

/* connecting highlight removed to restore default behavior */

.image-wrapper {
  margin-bottom: 8px;
}

.image-wrapper img {
  width: 100%;
  height: auto;
  max-height: 120px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.meta-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #111827;
  font-weight: 700;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.initials { font-size: 13px; }
.spacer { flex: 1; }
.node-actions { margin-top: 6px; }
.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.pdf-link {
  display: inline-block;
  padding: 8px 10px;
  background: #f5f5f5;
  border-radius: 6px;
  color: #333;
  text-decoration: none;
  font-weight: 600;
}

.label-wrapper {
  font-size: 13px;
  font-family: 'Helvetica', Arial, sans-serif;
  display: inline-block;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 320px;
  text-align: left;
}
.author-wrapper {
  margin-top: 6px;
  color: #555;
}
.owner-badge {
  background: #fde68a;
  color: #92400e;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 600;
  font-size: 11px;
}
</style>