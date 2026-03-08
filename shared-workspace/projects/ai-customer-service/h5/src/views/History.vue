<template>
  <div>
    <van-nav-bar title="历史记录" left-arrow @click-left="$router.back()" fixed placeholder />
    <div class="history-list">
      <van-cell-group>
        <van-cell v-for="(item, i) in history" :key="i" :title="item.title" :label="item.time" is-link @click="loadHistory(item)" />
      </van-cell-group>
      <van-empty v-if="!history.length" description="暂无历史记录" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const history = ref([])

function loadHistory(item) {
  localStorage.setItem('chatHistory', JSON.stringify(item.messages))
  router.push('/')
}

onMounted(() => {
  const saved = localStorage.getItem('chatHistoryFull')
  if (saved) history.value = JSON.parse(saved)
})
</script>

<style scoped>
.history-list { padding: 16px; }
</style>