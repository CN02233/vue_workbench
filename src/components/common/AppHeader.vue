<template>
  <!-- EN: Application header shell: title, language selector and service status. -->
  <!-- 中文：应用头部外壳：标题、语言选择与服务状态。 -->
  <header>
    <div>
      <small>ORDER AI · CUSTOMER OPERATIONS</small>
      <h1>{{ t('title') }}</h1>
      <p>{{ t('subtitle') }}</p>
    </div>
    <div class="header-actions">
      <label class="language-label">
        {{ t('language') }}
        <select v-model="selectedLocale">
          <option value="zh">中文</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </label>
      <span class="status">
        <i></i>
        {{ t('service') }} {{ health ? t('online') : t('offline') }}
      </span>
    </div>
  </header>
</template>

<script>
// EN: Reuses the existing i18n lookup so language behavior is identical to the original header.
// 中文：复用现有 i18n 查询，保证语言行为与原头部完全一致。
import { translate } from '../../i18n'

export default {
  name: 'AppHeader',
  props: {
    // EN: Current locale; the child emits change-locale instead of mutating the prop directly.
    // 中文：当前语言；子组件通过 change-locale 事件回传，而不直接修改 prop。
    locale: { type: String, default: 'zh' },
    // EN: Health flag from the /health check still performed by App.vue.
    // 中文：健康状态标记，仍由 App.vue 的 /health 检查提供。
    health: { type: Boolean, default: false }
  },
  computed: {
    selectedLocale: {
      get() {
        return this.locale
      },
      set(value) {
        // EN: App.vue owns the locale and persists it in its existing watcher.
        // 中文：locale 归 App.vue 所有，并由其现有的 watcher 负责持久化。
        this.$emit('change-locale', value)
      }
    }
  },
  methods: {
    // EN: Missing keys fall back to the key itself, matching App.vue's original t().
    // 中文：缺失的 key 原样显示，与 App.vue 原有的 t() 一致。
    t(key) {
      return translate(this.locale, key)
    }
  }
}
</script>
