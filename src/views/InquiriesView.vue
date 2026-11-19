<template>
  <!-- EN: Inquiries management list: filters, table, pagination and action entry points. -->
  <!-- 中文：咨询管理列表：筛选、表格、分页与操作入口。 -->
  <!-- EN: Root class and DOM mirror the original generic management section exactly. -->
  <!-- 中文：根节点 class 与 DOM 与原通用管理区完全一致，保证样式不变。 -->
  <section class="card management">
    <div class="management-heading">
      <h2>{{ t('inquiries') }}</h2>
      <button @click="$emit('create')">{{ t('add_new') }}</button>
    </div>

    <div class="filters">
      <label v-for="field in filterFields" :key="field.key">
        {{ t(field.key) }}
        <select
          v-if="field.options"
          :value="filters[field.key]"
          @change="onFilterInput(field.key, $event)"
        >
          <option value="">{{ t('all') }}</option>
          <option v-for="option in field.options" :key="option" :value="option">
            {{ t(option) }}
          </option>
        </select>
        <input
          v-else
          :value="filters[field.key]"
          @input="onFilterInput(field.key, $event)"
          :type="field.type || 'text'"
          :min="field.min"
          :step="field.step"
        />
      </label>
      <button @click="$emit('search')">{{ t('search') }}</button>
      <button class="secondary" @click="$emit('reset')">{{ t('reset') }}</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column">{{ t(column) }}</th>
            <th>{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id || row.order_number || row.sku">
            <td v-for="column in columns" :key="column">{{ cell(row, column) }}</td>
            <td class="action-cell">
              <button class="secondary" @click="$emit('edit', row)">{{ t('edit') }}</button>
              <button class="danger" @click="$emit('delete', row)">{{ t('delete') }}</button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="columns.length + 1" class="empty">{{ t('empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <label>
        {{ t('page_size') }}
        <select :value="pageSize" @change="onPageSizeChange">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </label>
      <button class="secondary" :disabled="pageNumber === 0" @click="$emit('page', pageNumber - 1)">
        {{ t('previous') }}
      </button>
      <span>{{ pageNumber + 1 }} / {{ totalPages || 1 }} · {{ totalElements }}</span>
      <button
        class="secondary"
        :disabled="pageNumber + 1 >= totalPages"
        @click="$emit('page', pageNumber + 1)"
      >
        {{ t('next') }}
      </button>
    </div>
  </section>
</template>

<script>
// EN: Presentation-only view. All API calls, filters, paging and CRUD stay in App.vue.
// 中文：纯展示视图。所有 API 调用、筛选、分页与增删改都留在 App.vue。
import { translate } from '../i18n'
import { formatCell } from '../utils/format'

export default {
  name: 'InquiriesView',
  props: {
    locale: { type: String, default: 'zh' },
    // EN: Rows come from App.vue's filteredRows; this view never fetches them itself.
    // 中文：行数据来自 App.vue 的 filteredRows；本视图不自行请求。
    rows: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    filters: { type: Object, default: () => ({}) },
    filterFields: { type: Array, default: () => [] },
    pageNumber: { type: Number, default: 0 },
    pageSize: { type: Number, default: 10 },
    totalPages: { type: Number, default: 0 },
    totalElements: { type: Number, default: 0 }
  },
  methods: {
    t(key) {
      return translate(this.locale, key)
    },
    // EN: Same shared formatter App.vue uses, with the inquiry page's date columns.
    // 中文：复用 App.vue 同一个格式化工具，日期列与咨询页保持一致。
    cell(row, key) {
      // EN: AI fields come from the server only; never infer or reconstruct them locally.
      //     Missing values render as a dash so historical rows show no false numbers.
      // 中文：AI 字段一律来自服务端，不在本地推算或伪造；
      //     缺失值显示短横线，历史记录不会显示错误数字。
      if (key === 'ai_category') return row.ai_category ? this.t(row.ai_category) : '—'
      if (key === 'analysis_source') return row.analysis_source ? this.t(row.analysis_source) : '—'
      if (key === 'confidence') return this.confidenceText(row.confidence)
      if (key === 'needs_human_review') {
        if (row.needs_human_review === true) return this.t('needsHumanReview')
        if (row.needs_human_review === false) return this.t('noReviewNeeded')
        return '—'
      }
      return formatCell(row, key, this.t, ['created_at'])
    },
    // EN: 0.92 -> 92%; nullish or non-finite values become a dash instead of NaN%.
    // 中文：0.92 显示为 92%；空值或非有限值显示短横线，避免出现 NaN%。
    confidenceText(value) {
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
      return `${Math.round(Number(value) * 100)}%`
    },
    onFilterInput(key, event) {
      this.$emit('update-filter', { key, value: event.target.value })
    },
    onPageSizeChange(event) {
      this.$emit('page-size', Number(event.target.value))
    }
  }
}
</script>
