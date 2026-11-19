<template>
  <!-- EN: Inventory management list: filters, table with linked-order count, pagination and actions. -->
  <!-- 中文：库存管理列表：筛选、带关联订单数的表格、分页与操作入口。 -->
  <!-- EN: Root class and DOM mirror the original generic management section exactly. -->
  <!-- 中文：根节点 class 与 DOM 与原通用管理区完全一致，保证样式不变。 -->
  <section class="card management">
    <div class="management-heading">
      <h2>{{ t('inventory') }}</h2>
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
              <!-- EN: Keep the delete guard here: a product already referenced by orders is immutable. -->
              <!-- 中文：保留删除保护：已被订单引用的商品不允许删除。 -->
              <button
                class="danger"
                :disabled="row.order_count > 0"
                :title="row.order_count > 0 ? t('productLinked') : ''"
                @click="$emit('delete', row)"
              >
                {{ t('delete') }}
              </button>
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
// EN: Presentation-only view. All API calls, stock adjustment, filters, paging and CRUD stay in App.vue.
// 中文：纯展示视图。所有 API 调用、库存调整、筛选、分页与增删改都留在 App.vue。
import { translate } from '../i18n'
import { formatCell } from '../utils/format'

export default {
  name: 'InventoryView',
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
    // EN: Same shared formatter App.vue uses; inventory's columns include the linked-order count.
    // 中文：复用 App.vue 同一个格式化工具；库存列包含关联订单数量。
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
