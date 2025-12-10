import { createApp } from 'vue'
import { createPinia } from 'pinia'

// componente principal e rotas
import App from './App.vue'
import router from './router'

// estilos globais
import './assets/main.css'

// configuracao do primevue
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

// componentes do primevue para registro global
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Password from 'primevue/password';
import ProgressSpinner from 'primevue/progressspinner';
import ConfirmDialog from 'primevue/confirmdialog';

const app = createApp(App)

// plugins essenciais
app.use(createPinia());
app.use(router);
app.use(ConfirmationService);

// inicializacao do primevue com tema aura
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            // garante que nao conflite com estilos tailwind/customizados se houver
            cssLayer: {
                name: 'primevue',
                order: 'tailwind-base, primevue, tailwind-utilities'
            }
        }
    }
});

// registro de componentes globais
// isso evita ter que importar em cada arquivo .vue
app.component('Card', Card);
app.component('Button', Button);
app.component('InputText', InputText);
app.component('Dialog', Dialog);
app.component('Textarea', Textarea);
app.component('Password', Password);
app.component('ProgressSpinner', ProgressSpinner);
app.component('ConfirmDialog', ConfirmDialog);

// diretivas
app.directive('tooltip', Tooltip);

// montagem da aplicacao
app.mount('#app');