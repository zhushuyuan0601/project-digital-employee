import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import 'vant/lib/index.css'
import './assets/style.css'

createApp(App).use(router).mount('#app')