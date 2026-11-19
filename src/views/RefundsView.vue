<template>
  <!-- EN: Refunds management list: filters, table, status-driven actions and pagination. -->
  <!-- 中文：退款管理列表：筛选、表格、按状态显示的操作与分页。 -->
  <!-- EN: Root class and DOM mirror the original generic management section exactly. -->
  <!-- 中文：根节点 class 与 DOM 与原通用管理区完全一致，保证样式不变。 -->
  <section class="card management">
    <div class="management-heading">
      <h2>{{ t('refunds') }}</h2>
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
              <!-- EN: Visibility conditions mirror the previous generic management section exactly. -->
              <!-- 中文：按钮显示条件与原通用管理区逐条保持一致。 -->
              <button
                v-if="row.status === 'PENDING_MANUAL_APPROVAL'"
                class="secondary"
                @click="$emit('edit', row)"
              >
                {{ t('edit') }}
              </button>
              <button
                v-if="row.status === 'PENDING_MANUAL_APPROVAL'"
                class="warm"
                @click="$emit('approve', row)"
              >
                {{ t('approve') }}
              </button>
              <button
                v-if="row.status === 'PENDING_MANUAL_APPROVAL'"
                class="secondary"
                @click="$emit('reject', row)"
              >
                {{ t('reject') }}
              </button>
              <button
                v-if="
                  row.status === 'APPROVED_MANUALLY' &&
                  row.refund_type === 'RETURN_AND_REFUND' &&
                  !row.inventory_received
                "
                class="warm"
                @click="$emit('receive', row)"
              >
                {{ t('receive') }}
              </button>
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
// EN: Presentation-only view. All API calls, approval, rejection, receiving and CRUD stay in App.vue.
// 中文：纯展示视图。所有 API 调用、审批、拒绝、验收入库与增删改都留在 App.vue。
import { translate } from '../i18n'
import { formatCell } from '../utils/format'

export default {
  name: 'RefundsView',
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
    // EN: Same shared formatter App.vue uses, including the refund created_at date column.
    // 中文：复用 App.vue 同一个格式化工具，包含退款 created_at 日期列。
    cell(row, key) {
      return formatCell(row, key, this.t, ['created_at', 'shipped_at', 'delivered_at'])
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
