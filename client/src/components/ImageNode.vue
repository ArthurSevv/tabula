<script setup>
import { Handle, Position } from '@vue-flow/core';

defineProps({
    data: {
        type: Object,
        required: true,
    },
});
</script>

<template>
    <div class="custom-node">
        <Handle type="target" :position="Position.Top" />
        <Handle type="source" :position="Position.Bottom" />

        <div v-if="data.imageUrl" class="image-wrapper">
            <img :src="data.imageUrl" alt="Image da nota" @error.once="e => e.target.style.display='none'" />
        </div>

        <div v-if="data.label" class="label-wrapper">
            {{ data.label }}
        </div>
    </div>
</template>

<style scoped>
.custom-node {
  border: 1px solid #777;
  border-radius: 8px;
  background: white;
  padding: 10px;
  min-width: 150px;
  max-width: 200px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}

.image.wrapper {
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

.label-wrapper {
  font-size: 12px;
  font-family: 'Helvetica', sans-serif;
  word-wrap: break-word;
}
</style>