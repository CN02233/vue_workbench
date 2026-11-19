<template>
  <!-- EN: Refund create/edit form. UI only: order/refund loading, rules and API stay in App.vue. -->
  <!-- 中文：退款新增/编辑表单。只负责界面：订单/退款加载、规则与 API 均留在 App.vue。 -->
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>{{ t(editing ? 'edit' : 'add_new') }} · {{ t(page) }}</h3>
        <button class="icon" :aria-label="t('close')" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <label>
          {{ t('orderNumber') }}
          <select v-model="editor.order_number" :disabled="editing" @change="$emit('order-change')">
            <option value="">{{ t('selectOrder') }}</option>
            <option v-for="o in refundableOrders" :key="o.order_number" :value="o.order_number">
              {{ o.order_number }} · {{ t(o.status) }}
            </option>
          </select>
        </label>
        <div v-if="orderDetail" class="readonly">
          {{ t('totalAmount') }} ¥{{ orderDetail.total_amount }} · {{ t('refundable') }} ¥{{
            orderDetail.refundable_amount
          }}
        </div>
        <div class="form-grid">
          <label>
            {{ t('refundType') }}
            <select
              v-model="editor.refund_type"
              :disabled="editing"
              @change="$emit('refund-type-change')"
            >
              <option v-for="type in refundTypes" :key="type" :value="type">
                {{ t(type) }}
              </option>
            </select>
          </label>
          <label>
            {{ t('amount') }}
            <input
              v-model.number="editor.amount"
              type="number"
              min="0"
              step="0.01"
              :max="orderDetail?.refundable_amount"
              :disabled="editing"
            />
          </label>
        </div>
        <label>
          {{ t('reason') }}
          <textarea v-model.trim="editor.reason" rows="3" required></textarea>
        </label>

        <template v-if="editor.refund_type === 'RETURN_AND_REFUND'">
          <div class="section-title">{{ t('returnItems') }}</div>
          <div v-if="!orderDetail" class="hint">{{ t('selectOrderFirst') }}</div>
          <div v-for="r in editor.return_items" :key="r.orderItemId" class="item-line">
            <div class="line-name">{{ r.name }} ({{ r.sku }})</div>
            <label class="qty">
              {{ t('quantity') }}
              <input
                v-model.number="r.quantity"
                type="number"
                min="0"
                :max="r.max"
                step="1"
                :disabled="editing"
              />
            </label>
            <span class="hint">/ {{ r.max }}</span>
          </div>
        </template>

        <template v-if="editing && refundDetail">
          <div class="section-title">{{ t('reviewStatus') }}</div>
          <div class="readonly">
            {{ t(refundDetail.status) }} · {{ t('inventoryReceived') }}:
            {{ refundDetail.inventory_received ? t('yes') : t('no') }}
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
// EN: Presentation-only refund editor; selection/type changes and save/close are emitted to App.vue.
// 中文：纯展示的退款编辑器；订单/类型切换与保存/关闭通过事件交回 App.vue。
import { translate } from '../../i18n'

export default {
  name: 'RefundEditor',
  props: {
    locale: { type: String, default: 'zh' },
    page: { type: String, default: 'refunds' },
    busy: { type: Boolean, default: false },
    editing: { type: Boolean, default: false },
    editor: { type: Object, required: true },
    refundableOrders: { type: Array, default: () => [] },
    orderDetail: { type: Object, default: null },
    refundTypes: { type: Array, default: () => [] },
    refundDetail: { type: Object, default: null }
  },
  methods: {
    t(key) {
      return translate(this.locale, key)
    }
  }
}
</script>
