<template>
    <div class="auth-container">
        <Card style="width: 25rem; overflow: hidden;">
            <template #title>
                <!--AQUI TEMOS ESSA COISA LINDA QUE MUDA A TELA CONFORME O ESTADO DE LOGIN-->
                {{ isLoginMode ? 'Entrar na sua conta' : 'Criar uma nova conta' }}
            </template>

            <template #subtitle>
                {{ isLoginMode ? 'Bem-vindo de volta!' : 'Preencha os campos para se cadastrar.'}}
            </template>

            <template #content>
                <div class="flex flex-col gap-4">

                    <div v-if="!isLoginMode" class="flex flex-col gap-2">
                        <label for="name">Nome</label>
                        <InputText id="name" v-model="name" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="email">Email</label>
                        <InputText id="email" v-model="email" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="password">Senha</label>
                        <InputText type="password" id="password" v-model="password" />
                    </div>

                    <div v-if="!isLoginMode" class="flex flex-col gap-2">
                        <label for="confPassword">Confirmar Senha:</label>
                        <InputText type="password" id="confPassword" v-model="confPassword" />
                    </div>

                </div>
            </template>

            <template #footer>
                <div class="flex flex-col gap-3">
                    
                    <Button  
                        :label="isLoginMode ? 'Entrar' : 'Cadastrar'"
                        @click="handleSubmit"
                        class="w-full"
                    />
                    
                    <Button 
                        :label="isLoginMode ? 'Ainda não tenho uma conta' : 'Já tenho uma conta'"
                        @click="toggleMode"
                        severity="secondary"
                        variant="text"
                        class="w-full"
                    />
                </div>
            </template>
        </Card>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { register, login } from '@/services/api';

//controla o tipo de formulario, por padrao tela de login
const isLoginMode = ref(true)

const name = ref('');
const email = ref('');
const password = ref('');
const confPassword = ref('');

function toggleMode(){
    isLoginMode.value = !isLoginMode.value;
}

async function handleSubmit() {
    try{
        if (isLoginMode.value) {
            console.log('logado')
            return await login({ email: email.value, password: password.value });
        } else {
            console.log('cadastrado')
            return await register({ name: name.value, email: email.value, password: password.value });
        }
    } catch (error) {
        console.error('email ou senha invalidos')
    }
}

</script>

<style>
body {
    background-color: #f0f2f5;
}
.auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
}
.flex-col {
    display: flex;
    flex-direction: column;
}
.gap-2 {
    gap: 0.5rem;
}
.gap-3 {
    gap: 0.75rem;
}
.gap-4 {
    gap: 1rem;
}
</style>