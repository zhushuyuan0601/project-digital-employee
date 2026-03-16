import { ref, watch, computed } from 'vue'
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', () => {
  // 主题状态：'dark' | 'light'
  const currentTheme = ref<'dark' | 'light'>('dark')

  // 初始化主题
  function initTheme() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark') {
        currentTheme.value = saved
        return
      }
      // 检测系统偏好
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        currentTheme.value = 'light'
        return
      }
    }
    currentTheme.value = 'dark'
  }

  initTheme()

  // 是否是亮色主题
  const isLight = computed(() => currentTheme.value === 'light')

  // 切换主题
  function toggle() {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  }

  // 设置为暗色主题
  function setDark() {
    currentTheme.value = 'dark'
  }

  // 设置为亮色主题
  function setLight() {
    currentTheme.value = 'light'
  }

  // 监听主题变化，同步到 localStorage 和 HTML class
  watch(
    currentTheme,
    (newTheme) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', newTheme)
      }
      // 更新 HTML 元素的 class
      if (newTheme === 'light') {
        document.documentElement.classList.add('light-theme')
        document.documentElement.classList.remove('dark-theme')
      } else {
        document.documentElement.classList.add('dark-theme')
        document.documentElement.classList.remove('light-theme')
      }
    },
    { immediate: true }
  )

  return {
    currentTheme,
    isLight,
    toggle,
    setDark,
    setLight
  }
})
