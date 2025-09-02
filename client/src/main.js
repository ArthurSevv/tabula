import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import PrimeVue from 'primevue/config';

//components
import Card from 'primevue/card';
import Button from 'primevue/button';

//temas
import Aura from '@primeuix/themes/aura';

const app = createApp(App)

app.use(createPinia());
app.use(router);

app.component('Card', Card);
app.component('Button', Button)

app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});

app.mount('#app');