<script setup>
// imports de bibliotecas
import { ref } from 'vue';
import { useRouter } from 'vue-router';

// api
import { register, login } from '@/services/api';

// componentes primevue
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';

// ---------------------------------------------------------
// estado e configuracao
// ---------------------------------------------------------

const router = useRouter();
const isLoginMode = ref(true);
const isLoading = ref(false);

const name = ref('');
const email = ref('');
const password = ref('');
const confPassword = ref('');
const errorMessage = ref('');

// ---------------------------------------------------------
// funcoes de acao
// ---------------------------------------------------------

// alterna entre login e cadastro
function toggleMode(){
    isLoginMode.value = !isLoginMode.value;
    errorMessage.value = '';
    
    // limpa senhas por seguranca ao trocar de modo
    password.value = '';
    confPassword.value = '';
}

// envio do formulario
async function handleSubmit() {
    errorMessage.value = '';

    // validacao basica
    if (!isLoginMode.value && password.value !== confPassword.value) {
        errorMessage.value = "as senhas nao coincidem.";
        return;
    }

    isLoading.value = true;

    try{
        let response;
        if (isLoginMode.value) {
            response = await login({ email: email.value, password: password.value });
        } else {
            response = await register({ name: name.value, email: email.value, password: password.value });
        }
        
        // sucesso: salva dados e redireciona
        localStorage.setItem('userData', JSON.stringify(response));
        router.push('/');

    } catch (error) {
        console.error('falha na autenticacao:', error.message);
        errorMessage.value = error.message || "ocorreu um erro. tente novamente.";
    } finally {
        isLoading.value = false;
    }
}
</script>

<template>
    <div class="auth-wrapper">
        <div class="auth-box">
            
            <div class="auth-header">
                <div class="brand-logo">T</div>
                <h1>Tabula</h1>
                <p class="subtitle">
                    {{ isLoginMode ? 'bem-vindo de volta!' : 'crie sua conta gratuitamente' }}
                </p>
            </div>

            <div class="auth-form">
                
                <div v-if="!isLoginMode" class="input-group slide-in">
                    <label for="name">nome completo</label>
                    <span class="p-input-icon-left w-full">
                        <i class="pi pi-user" />
                        <InputText id="name" v-model="name" class="w-full" placeholder="seu nome" />
                    </span>
                </div>

                <div class="input-group">
                    <label for="email">e-mail</label>
                    <span class="p-input-icon-left w-full">
                        <i class="pi pi-envelope" />
                        <InputText id="email" v-model="email" class="w-full" placeholder="exemplo@email.com" />
                    </span>
                </div>

                <div class="input-group">
                    <label for="password">senha</label>
                    <span class="p-input-icon-left w-full">
                        <i class="pi pi-lock z-1" /> 
                        <Password 
                            id="password" 
                            v-model="password" 
                            class="w-full" 
                            :feedback="!isLoginMode" 
                            toggleMask 
                            placeholder="••••••••"
                            inputClass="w-full pl-5" 
                        />
                    </span>
                </div>

                <div v-if="!isLoginMode" class="input-group slide-in">
                    <label for="confPassword">confirmar senha</label>
                    <span class="p-input-icon-left w-full">
                        <i class="pi pi-lock z-1" />
                        <Password 
                            id="confPassword" 
                            v-model="confPassword" 
                            class="w-full" 
                            :feedback="false" 
                            toggleMask 
                            placeholder="••••••••"
                            inputClass="w-full pl-5"
                        />
                    </span>
                </div>

                <div v-if="errorMessage" class="error-banner">
                    <i class="pi pi-exclamation-circle"></i>
                    <span>{{ errorMessage }}</span>
                </div>

                <Button  
                    :label="isLoginMode ? 'Entrar' : 'Criar Conta'"
                    @click="handleSubmit"
                    class="w-full mt-2 submit-btn"
                    :loading="isLoading"
                />

                <div class="divider">
                    <span>ou</span>
                </div>

                <div class="toggle-container">
                    <span class="text-gray-600">
                        {{ isLoginMode ? 'nao tem uma conta?' : 'ja tem uma conta?' }}
                    </span>
                    <a href="#" @click.prevent="toggleMode" class="toggle-link">
                        {{ isLoginMode ? 'cadastre-se' : 'faca login' }}
                    </a>
                </div>

            </div>
        </div>
        
        <div class="footer-copy">
            &copy; 2024 tabula. todos os direitos reservados.
        </div>
    </div>
</template>

<style scoped>
/* layout e fundo */
.auth-wrapper {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #f8fafc; /* slate-50 */
    background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
    background-size: 20px 20px;
    padding: 1rem;
}

/* card de autenticacao */
.auth-box {
    width: 100%;
    max-width: 400px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 2.5rem;
    border: 1px solid #e2e8f0;
}

/* cabecalho */
.auth-header { text-align: center; margin-bottom: 2rem; }

.brand-logo {
    width: 48px; height: 48px;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white; font-size: 1.5rem; font-weight: 800;
    border-radius: 12px; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1rem auto;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.auth-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0 0 0.5rem 0; }
.subtitle { color: #64748b; font-size: 0.9rem; margin: 0; }

/* formulario */
.auth-form { display: flex; flex-direction: column; gap: 1rem; }

.input-group label {
    display: block; margin-bottom: 0.4rem; color: #334155;
    font-weight: 500; font-size: 0.9rem;
}

.w-full { width: 100%; }
.p-input-icon-left > i { z-index: 10; margin-top: -0.5rem; }
:deep(.p-password-input) { width: 100%; padding-left: 2.5rem; }

/* botoes */
.submit-btn { background-color: #4f46e5; border: none; padding: 0.8rem; font-weight: 600; }
.submit-btn:hover { background-color: #4338ca; }

/* mensagem de erro */
.error-banner {
    background-color: #fee2e2; color: #b91c1c; padding: 0.75rem;
    border-radius: 6px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;
}

/* rodape do form */
.toggle-container { text-align: center; font-size: 0.9rem; margin-top: 0.5rem; }
.text-gray-600 { color: #64748b; }

.toggle-link {
    color: #4f46e5; font-weight: 600; text-decoration: none; margin-left: 4px; transition: color 0.2s;
}
.toggle-link:hover { color: #4338ca; text-decoration: underline; }

.divider {
    display: flex; align-items: center; text-align: center; margin: 0.5rem 0;
    color: #94a3b8; font-size: 0.8rem;
}
.divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; }
.divider span { padding: 0 10px; }

.footer-copy { margin-top: 2rem; color: #94a3b8; font-size: 0.75rem; }

/* animacoes e utilitarios */
.slide-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}
.z-1 { z-index: 1; }
</style>