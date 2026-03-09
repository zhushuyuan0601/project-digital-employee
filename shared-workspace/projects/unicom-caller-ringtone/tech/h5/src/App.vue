<template>
  <div class="app">
    <router-view />
    <van-tabbar v-model="active" fixed>
      <van-tabbar-item icon="video-o" to="/">创作</van-tabbar-item>
      <van-tabbar-item icon="clock-o" to="/history">历史</van-tabbar-item>
      <van-tabbar-item icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const active = ref(0)
</script>

<style>
.app { padding-bottom: 50px; }
</style>