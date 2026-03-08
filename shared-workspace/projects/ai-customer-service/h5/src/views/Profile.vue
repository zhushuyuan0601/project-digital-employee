<template>
  <div>
    <van-nav-bar title="个人中心" fixed placeholder />
    <van-cell-group>
      <van-cell title="用户名" value="联通用户" icon="user-o" />
      <van-cell title="手机号" value="138****8888" icon="phone-o" />
      <van-cell title="套餐" value="5G畅享套餐" icon="coupon-o" />
    </van-cell-group>
    <van-cell-group style="margin-top: 12px;">
      <van-cell title="我的工单" is-link icon="orders-o" />
      <van-cell title="意见反馈" is-link icon="comment-o" />
      <van-cell title="关于我们" is-link icon="info-o" />
    </van-cell-group>
    <div style="padding: 32px 16px;">
      <van-button type="danger" block round @click="clearData">清空对话记录</van-button>
    </div>
  </div>
</template>

<script setup>
import { showDialog } from 'vant'

function clearData() {
  showDialog({ title: '确认', message: '确定清空所有对话记录？' }).then(() => {
    localStorage.removeItem('chatHistory')
    location.reload()
  })
}
</script>