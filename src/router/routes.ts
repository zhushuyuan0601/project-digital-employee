import type { RouteRecordRaw } from 'vue-router'
import type { UserRole } from '@/stores/auth'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true, layout: 'blank' },
  },
  {
    path: '/',
    redirect: '/task-board',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    redirect: '/task-board',
  },
  {
    path: '/task-board',
    name: 'task-board',
    component: () => import('@/views/TaskBoard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/task-center-2',
    name: 'task-center-2',
    component: () => import('@/views/TaskCenter2.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] },
  },
  {
    path: '/agent-console',
    name: 'agent-console',
    component: () => import('@/views/AgentConsole.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] },
  },
  {
    path: '/agent-market',
    name: 'agent-market',
    component: () => import('@/views/AgentMarket.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] },
  },
  {
    path: '/configs',
    name: 'configs',
    component: () => import('@/views/Configs.vue'),
    meta: { requiresAuth: true, roles: ['admin'] as UserRole[] },
  },
  {
    path: '/mail-center',
    name: 'mail-center',
    component: () => import('@/views/MailCenter.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] },
  },
  {
    path: '/automation',
    name: 'automation',
    component: () => import('@/views/AutomationIntegrationCenter.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] },
  },
  {
    path: '/analysis',
    name: 'analysis',
    component: () => import('@/views/AnalysisWorkbench.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] },
  },
  {
    path: '/ai-terminal',
    name: 'ai-terminal',
    component: () => import('@/views/AiTerminal.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] },
  },
  {
    path: '/risk-management',
    name: 'risk-management',
    component: () => import('@/views/RiskManagement.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] },
  },
]
