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

        <!-- EN: Read-only AI snapshot from the server. It is never edited or reconstructed here. -->
        <!-- 中文：服务端下发的只读 AI 快照。此处不编辑、不推算。 -->
        <div v-if="editing && aiDetail" class="ai-analysis">
          <div class="section-title">{{ t('aiAnalysis') }}</div>
          <div v-if="hasAiData" class="ai-grid">
            <div>
              <span>{{ t('aiCategory') }}</span>
              <strong>{{ aiCategoryText }}</strong>
            </div>
            <div>
              <span>{{ t('businessCategory') }}</span>
              <strong>{{ categoryText }}</strong>
            </div>
            <div>
              <span>{{ t('confidence') }}</span>
              <strong>{{ confidenceText }}</strong>
            </div>
            <div>
              <span>{{ t('analysisSource') }}</span>
              <strong>{{ sourceText }}</strong>
            </div>
            <div>
              <span>{{ t('needsHumanReview') }}</span>
              <strong>{{ reviewText }}</strong>
            </div>
          </div>
          <div v-else class="hint">{{ t('noAiData') }}</div>

          <div v-if="hasAiData" class="reply-block">
            <div class="section-title">{{ t('suggestedReply') }}</div>
            <div class="reply-text">{{ replyText }}</div>
            <button
              class="secondary copy-reply"
              :disabled="!aiDetail.suggested_reply"
              @click="copyReply"
            >
              {{ t('copyReply') }}
            </button>
          </div>
        </div>
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
    inquiryCategories: { type: Array, default: () => [] },
    // EN: AI snapshot from the server; no local state is used to fake ai_category.
    // 中文：来自服务端的 AI 快照；不用任何本地状态伪造 ai_category。
    aiDetail: { type: Object, default: null }
  },
  computed: {
    hasAiData() {
      const detail = this.aiDetail || {}
      return Boolean(
        detail.ai_category ||
          detail.analysis_source ||
          (detail.confidence !== null && detail.confidence !== undefined)
      )
    },
    aiCategoryText() {
      return this.aiDetail && this.aiDetail.ai_category ? this.t(this.aiDetail.ai_category) : '—'
    },
    categoryText() {
      return this.editor.category ? this.t(this.editor.category) : '—'
    },
    confidenceText() {
      const value = this.aiDetail && this.aiDetail.confidence
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
      return `${Math.round(Number(value) * 100)}%`
    },
    sourceText() {
      return this.aiDetail && this.aiDetail.analysis_source
        ? this.t(this.aiDetail.analysis_source)
        : '—'
    },
    reviewText() {
      if (!this.aiDetail) return '—'
      if (this.aiDetail.needs_human_review === true) return this.t('needsHumanReview')
      if (this.aiDetail.needs_human_review === false) return this.t('noReviewNeeded')
      return '—'
    },
    replyText() {
      return this.aiDetail && this.aiDetail.suggested_reply
        ? this.aiDetail.suggested_reply
        : this.t('noSuggestedReply')
    }
  },
  methods: {
    t(key) {
      return translate(this.locale, key)
    },
    // EN: Copy the full reply. Clipboard API first, then a textarea/execCommand fallback.
    //     Never sends a reply or changes the inquiry status; only reports success/failure.
    // 中文：复制完整建议回复。优先使用剪贴板 API，失败时降级到 textarea/execCommand。
    //     不会发送回复，也不会修改咨询状态，只上报成功或失败。
    async copyReply() {
      const text = this.aiDetail && this.aiDetail.suggested_reply
      if (!text) return
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const area = document.createElement('textarea')
          area.value = text
          area.setAttribute('readonly', '')
          area.style.position = 'fixed'
          area.style.opacity = '0'
          document.body.appendChild(area)
          area.select()
          const copied = document.execCommand('copy')
          document.body.removeChild(area)
          if (!copied) throw new Error('copy unavailable')
        }
        this.$emit('feedback', { success: this.t('copySuccess') })
      } catch (error) {
        this.$emit('feedback', { error: this.t('copyFailed') })
      }
    }
  }
}
</script>
