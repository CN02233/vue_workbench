<template>
  <!-- EN: Primary navigation. Active state is derived from the page prop supplied by App.vue. -->
  <!-- 中文：主导航。激活状态由 App.vue 传入的 page prop 推导。 -->
  <nav class="menu">
    <button
      v-for="item in menu"
      :key="item.id"
      :class="{ active: page === item.id }"
      @click="$emit('navigate', item.id)"
    >
      {{ t(item.id) }}
    </button>
  </nav>
</template>

<script>
// EN: Same i18n lookup as App.vue; menu ids double as translation keys.
// 中文：与 App.vue 使用相同的 i18n 查询；菜单 id 同时作为翻译键。
import { translate } from '../../i18n'

export default {
  name: 'AppNavigation',
  props: {
    // EN: Menu items in their original order; each id is also a route name.
    // 中文：保持原顺序的菜单项；每个 id 同时也是路由名称。
    menu: { type: Array, required: true },
    // EN: Currently active page id, used only for highlighting.
    // 中文：当前页面 id，仅用于高亮显示。
    page: { type: String, default: 'dashboard' },
    locale: { type: String, default: 'zh' }
  },
  methods: {
    // EN: Navigation stays a pure event; route and data loading remain in App.vue.
    // 中文：导航只发出事件；路由跳转与数据加载仍由 App.vue 负责。
    t(key) {
      return translate(this.locale, key)
    }
  }
}
</script>
