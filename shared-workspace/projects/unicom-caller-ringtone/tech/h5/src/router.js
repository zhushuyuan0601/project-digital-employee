import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import History from './views/History.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/history', component: History }
  ]
})