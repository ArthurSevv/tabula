<script setup>
import { ref } from "vue";

const message = ref('Ainda não conectado no backend');

async function fetchData() {
    try {
        message.value = 'Conectando...';
        
        const response = await fetch('http://192.168.1.106:3000/api/test');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        message.value = data.message;

    } catch (error) {
        message.value = 'Erro ao conectar com o backend.'
        console.error("Detalhe do erro:", error);
    }
}
</script>

<template>
    <main>
        <h1>Teste de Conexão com o Back-end</h1>
        <button @click="fetchData">Conectar com a API</button>
        <p><strong>Mensagem do Servidor:</strong> {{ message }}</p>
    </main>
</template>