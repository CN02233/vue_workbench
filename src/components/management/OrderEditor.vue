<template>
  <!-- EN: Order create/edit form. UI only: App.vue owns editor state, API calls and validation. -->
  <!-- 中文：订单新增/编辑表单。只负责界面：editor 状态、API 请求与校验均归 App.vue。 -->
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>{{ t(editing ? 'edit' : 'add_new') }} · {{ t(page) }}</h3>
        <button class="icon" :aria-label="t('close')" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- EN: Customers and products are chosen from the options loaded by App.vue. -->
        <!-- 中文：客户与商品从 App.vue 加载的选项中选取。 -->
        <div class="form-grid">
          <label>
            {{ t('order_number') }}
            <input v-model.trim="editor.order_number" required :disabled="editing" />
          </label>
          <label>
            {{ t('customer') }}
            <select v-model.number="editor.customer_id" :disabled="editing">
              <option value="">{{ t('selectCustomer') }}</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">
                {{ c.name }} · {{ c.email }}
              </option>
            </select>
          </label>
        </div>

        <template v-if="!editing">
          <div class="section-title">{{ t('items') }}</div>
          <div v-for="(line, index) in editor.items" :key="index" class="item-line">
            <label>
              {{ t('product') }}
              <select v-model="line.sku">
                <option value="">{{ t('selectProduct') }}</option>
                <option v-for="p in productOptions" :key="p.sku" :value="p.sku">
                  {{ p.sku }} · {{ p.name }} · ¥{{ p.price }} · {{ t('stock') }} {{ p.stock }}
                </option>
              </select>
            </label>
            <label class="qty">
              {{ t('quantity') }}
              <input v-model.number="line.quantity" type="number" min="1" step="1" />
            </label>
            <span class="hint">
              {{
                selectedProduct(line.sku)
                  ? `${t('availableStock')} ${selectedProduct(line.sku).stock}`
                  : ''
              }}
            </span>
            <button class="danger remove-line" @click="$emit('remove-item', index)">
              {{ t('remove') }}
            </button>
          </div>
          <button class="secondary" @click="$emit('add-item')">+ {{ t('addItem') }}</button>
          <label>
            {{ t('tracking_number') }}
            <input v-model.trim="editor.tracking_number" />
          </label>
        </template>

        <!-- EN: Edit mode shows the order detail loaded by App.vue, plus editable status/tracking. -->
        <!-- 中文：编辑态展示 App.vue 加载的订单详情，以及可编辑的状态/物流单号。 -->
        <template v-else>
          <div class="section-title">{{ t('items') }}</div>
          <table class="mini-table">
            <thead>
              <tr>
                <th>{{ t('product') }}</th>
                <th>{{ t('quantity') }}</th>
                <th>{{ t('shippedQuantity') }}</th>
                <th>{{ t('unitPrice') }}</th>
                <th>{{ t('lineTotal') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in orderDetail?.items || []" :key="i.id">
                <td>{{ i.name }} ({{ i.sku }})</td>
                <td>{{ i.quantity }}</td>
                <td>{{ i.shipped_quantity || 0 }}</td>
                <td>¥{{ i.unit_price }}</td>
                <td>¥{{ i.line_total }}</td>
              </tr>
            </tbody>
          </table>
          <div class="form-grid">
            <label>
              {{ t('status') }}
              <select v-model="editor.status">
                <option v-for="s in orderStatuses" :key="s" :value="s">{{ t(s) }}</option>
              </select>
            </label>
            <label>
              {{ t('tracking_number') }}
              <input v-model.trim="editor.tracking_number" />
            </label>
          </div>
          <div class="readonly">
            {{ t('refundable') }}: ¥{{ orderDetail?.refundable_amount ?? '—' }} ·
            {{ t('pendingRefund') }}: ¥{{ orderDetail?.pending_refund_amount ?? '—' }}
          </div>
          <div v-if="orderDetail?.shipments?.length" class="section-title">
            {{ t('orderShipments') }}
          </div>
          <table v-if="orderDetail?.shipments?.length" class="mini-table">
            <thead>
              <tr>
                <th>{{ t('carrier') }}</th>
                <th>{{ t('tracking_number') }}</th>
                <th>{{ t('shipmentStatus') }}</th>
                <th>{{ t('deliveredAt') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in orderDetail.shipments" :key="s.id">
                <td>{{ s.carrier }}</td>
                <td>{{ s.tracking_number }}</td>
                <td>{{ t(s.status) }}</td>
                <td>{{ formatTime(s.delivered_at) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="orderDetail?.refunds?.length" class="section-title">
            {{ t('refunds') }}
          </div>
          <div v-for="r in orderDetail?.refunds || []" :key="r.id" class="readonly">
            #{{ r.id }} · {{ t(r.status) }} · ¥{{ r.amount }} · {{ r.reason }}
          </div>
        </template>
      </div>

      <div class="modal-foot">
        <button @click="$emit('save')" :disabled="busy">{{ t('save') }}</button>
        <button class="secondary" @click="$emit('close')">{{ t('cancel') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
// EN: Presentation-only order editor; emits add/remove item and save/close actions to App.vue.
// 中文：纯展示的订单编辑器；商品行增删与保存/关闭通过事件交回 App.vue。
import { translate } from '../../i18n'
import { formatTime } from '../../utils/format'

export default {
  name: 'OrderEditor',
  props: {
    locale: { type: String, default: 'zh' },
    page: { type: String, default: 'orders' },
    busy: { type: Boolean, default: false },
    editing: { type: Boolean, default: false },
    editor: { type: Object, required: true },
    // EN: Accept object maps too, matching the original v-for which iterated either shape.
    // 中文：同时接受对象映射，保持原模板 v-for 对两种数据形态的兼容。
    customers: { type: [Array, Object], default: () => [] },
    productOptions: { type: Array, default: () => [] },
    orderDetail: { type: Object, default: null },
    orderStatuses: { type: Array, default: () => [] }
  },
  methods: {
    t(key) {
      return translate(this.locale, key)
    },
    // EN: Stock hint reads the product options owned by App.vue; no state is copied here.
    // 中文：库存提示读取 App.vue 持有的商品选项；此处不复制任何业务状态。
    selectedProduct(sku) {
      return this.productOptions.find(p => p.sku === sku)
    },
    formatTime(value) {
      return formatTime(value)
    }
  }
}
</script>
