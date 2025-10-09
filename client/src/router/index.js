import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import AuthView from '@/views/AuthView.vue';
import MapView from '../views/MapView.vue'

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
    },
  ],
})

router.beforeEach((to, from, next) => {
  const publicPages = ['/auth']
  const authRequired = !publicPages.includes(to.path);
  const loggedIn = localStorage.getItem('userData');

  if (authRequired && !loggedIn) {
    return next('/auth');
  }

  if (!authRequired && loggedIn) {
    return next('/');
  }

  next();
});

export default router
