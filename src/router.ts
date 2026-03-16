import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/agents',
    name: 'agents',
    component: () => import('@/views/Agents.vue')
  },
  {
    path: '/digital-employee',
    name: 'digital-employee',
    component: () => import('@/views/DigitalEmployee.vue')
  },
  {
    path: '/task-center',
    name: 'task-center',
    component: () => import('@/views/TaskCenter.vue')
  },
  {
    path: '/task-center-2',
    name: 'task-center-2',
    component: () => import('@/views/TaskCenter2.vue')
  },
  {
    path: '/configs',
    name: 'configs',
    component: () => import('@/views/Configs.vue')
  },
  {
    path: '/logs',
    name: 'logs',
    component: () => import('@/views/Logs.vue')
  },
  {
    path: '/status',
    name: 'status',
    component: () => import('@/views/Status.vue')
  },
  {
    path: '/tools',
    name: 'tools',
    component: () => import('@/views/Tools.vue')
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/views/Chat.vue')
  },
  {
    path: '/group-chat',
    name: 'group-chat',
    component: () => import('@/views/GroupChat.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
