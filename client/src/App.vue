<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* estilos globais aplicados a todo o projeto */

body {
  /* fonte moderna para combinar com o visual slate/indigo */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  
  /* cor de fundo padrao caso alguma view nao tenha fundo */
  background-color: #f8fafc; 
  
  /* remove margens padrao do navegador */
  margin: 0;
  
  /* importante: padding 0 para que o mapa ocupe a tela toda sem scrollbar */
  padding: 0;
  
  /* evita scroll horizontal acidental */
  overflow-x: hidden;
}

/* reset basico para garantir calculo correto de tamanhos */
*, *::before, *::after {
  box-sizing: border-box;
}

/* estilizacao da barra de rolagem (opcional, deixa mais bonito) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>