import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import History from './views/History.vue'
import Profile from './views/Profile.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/history', component: History },
  { path: '/profile', component: Profile }
]

export default createRouter({
  history: createWebHistory(),
  routes
})