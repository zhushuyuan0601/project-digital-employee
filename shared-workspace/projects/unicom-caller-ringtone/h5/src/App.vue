<template>
  <div class="app">
    <router-view />
    <van-tabbar v-model="active" fixed route>
      <van-tabbar-item icon="video-o" to="/">创作</van-tabbar-item>
      <van-tabbar-item icon="apps-o" to="/templates">模板</van-tabbar-item>
      <van-tabbar-item icon="photo-o" to="/ip">IP库</van-tabbar-item>
      <van-tabbar-item icon="clock-o" to="/history">历史</van-tabbar-item>
      <van-tabbar-item icon="user-o" to="/mine">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const active = ref(0)
</script>

<style>
.app { 
  min-height: 100vh; 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 60px;
}
</style>