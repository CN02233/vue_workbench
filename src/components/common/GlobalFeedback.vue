<template>
  <!-- EN: Global error toast. Only the feedback already implemented in App.vue is extracted. -->
  <!-- 中文：全局错误提示。仅提取 App.vue 中已有的反馈，不新增任何界面元素。 -->
  <div v-if="error" class="toast">{{ error }}</div>
</template>

<script>
export default {
  name: 'GlobalFeedback',
  props: {
    // EN: Message written by App.vue's run() helper when a request fails.
    // 中文：App.vue 的 run() 在请求失败时写入的消息。
    error: { type: String, default: '' }
  }
}
</script>
