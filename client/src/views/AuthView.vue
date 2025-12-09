<template>
        <div class="auth-page">
            <div class="auth-container">
                <Card class="auth-card" style="width: 100%; overflow: hidden;">
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

                    <div v-if="errorMessage" class="error-message">
                        {{ errorMessage }}
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
        </div>
</template>

<script setup>
import { ref } from 'vue';
import { register, login } from '@/services/api';
import { useRouter } from 'vue-router';

//controla o tipo de formulario, por padrao tela de login
const router = useRouter();
const isLoginMode = ref(true);

const name = ref('');
const email = ref('');
const password = ref('');
const confPassword = ref('');
const errorMessage = ref('');

function toggleMode(){
    isLoginMode.value = !isLoginMode.value;
    errorMessage.value = '';
}

async function handleSubmit() {
    errorMessage.value = '';

    if (!isLoginMode.value && password.value !== confPassword.value) {
        errorMessage.value = "As senhas não coincidem.";
        return;
    }

    try{
        let response;
        if (isLoginMode.value) {
            response = await login({ email: email.value, password: password.value });
        } else {
            response = await register({ name: name.value, email: email.value, password: password.value });
        }
        
        //se tiver sucesso
        localStorage.setItem('userData', JSON.stringify(response));
        router.push('/');

    } catch (error) {
        console.error('Falha na autenticação:', error.message);
        errorMessage.value = error.message;
    }
}

</script>

<style>
.auth-page {
    min-height: calc(100vh - 40px);
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    padding: 2rem;
}
.auth-container {
    width: 100%;
    max-width: 420px;
}
.auth-card {
    padding: 1rem;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(2,6,23,0.06);
    background: #ffffff;
}
.error-message { color: #dc2626; }
.flex-col { display:flex; flex-direction:column; }
.gap-2 { gap:0.5rem; }
.gap-3 { gap:0.75rem; }
.gap-4 { gap:1rem; }
.auth-footer .p-button { font-weight:700 }
</style>