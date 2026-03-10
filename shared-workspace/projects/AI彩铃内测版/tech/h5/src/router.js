import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Chat from './views/Chat.vue'
import Progress from './views/Progress.vue'
import Preview from './views/Preview.vue'
import MyWorks from './views/MyWorks.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/chat', component: Chat },
    { path: '/progress', component: Progress },
    { path: '/preview', component: Preview },
    { path: '/myworks', component: MyWorks }
  ]
})