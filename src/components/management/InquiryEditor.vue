<template>
  <!-- EN: Inquiry create/edit form. UI only: submission and validation stay in App.vue. -->
  <!-- 中文：咨询新增/编辑表单。只负责界面：提交与校验均留在 App.vue。 -->
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>{{ t(editing ? 'edit' : 'add_new') }} · {{ t(page) }}</h3>
        <button class="icon" :aria-label="t('close')" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <label>
          {{ t('customer_email') }}
          <input v-model.trim="editor.customer_email" type="email" required />
        </label>
        <label>
          {{ t('subject') }}
          <input v-model.trim="editor.subject" required />
        </label>
        <label>
          {{ t('body') }}
          <textarea v-model.trim="editor.body" rows="4" required></textarea>
        </label>
        <label v-if="editing">
          {{ t('category') }}
          <select v-model="editor.category">
            <option v-for="category in inquiryCategories" :key="category" :value="category">
              {{ t(category) }}
            </option>
          </select>
        </label>
      </div>

      <div class="modal-foot">
        <button @click="$emit('save')" :disabled="busy">{{ t('save') }}</button>
        <button class="secondary" @click="$emit('close')">{{ t('cancel') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
// EN: Presentation-only inquiry editor; save/close are emitted to App.vue.
// 中文：纯展示的咨询编辑器；保存/关闭通过事件交回 App.vue。
import { translate } from '../../i18n'

export default {
  name: 'InquiryEditor',
  props: {
    locale: { type: String, default: 'zh' },
    page: { type: String, default: 'inquiries' },
    busy: { type: Boolean, default: false },
    editing: { type: Boolean, default: false },
    editor: { type: Object, required: true },
    inquiryCategories: { type: Array, default: () => [] }
  },
  methods: {
    t(key) {
      return translate(this.locale, key)
    }
  }
}
</script>
