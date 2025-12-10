import { createRouter, createWebHistory } from 'vue-router';

// importacao das views
import HomeView from '@/views/HomeView.vue';
import AuthView from '@/views/AuthView.vue';
import MapView from '@/views/MapView.vue';
import PublicWallView from '@/views/PublicWallView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView
    },
    {
      path: '/map/:id',
      name: 'map',
      component: MapView
      // esta rota serve tanto para o dono (logado) quanto para visitantes (via token)
    },
    {
      path: '/walls/share/:id',
      name: 'public-wall',
      component: PublicWallView
      // rota exclusiva para visualizacao somente leitura
    },
  ],
})

// guarda de navegacao (protecao de rotas)
router.beforeEach((to, from, next) => {
  const loggedIn = localStorage.getItem('userData');
  
  // definicao de rotas publicas
  const isAuthPage = to.path === '/auth';
  const isPublicShare = to.path.startsWith('/walls/share');
  
  // excecao especial: a rota /map/:id pode ser acessada sem login SE tiver token na url
  const isMapWithToken = to.name === 'map' && to.query.token;

  // 1. se nao esta logado e tenta acessar pagina privada
  if (!loggedIn && !isAuthPage && !isPublicShare && !isMapWithToken) {
    return next('/auth');
  }

  // 2. se esta logado e tenta acessar a pagina de login, manda para home
  if (loggedIn && isAuthPage) {
    return next('/');
  }

  // permite a navegacao normal
  // nota: se o usuario estiver logado, ele PODE acessar links publicos normalmente
  next();
});

export default router;