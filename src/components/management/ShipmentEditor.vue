<template>
  <!-- EN: Shipment create/edit form. UI only: calculations, rules and API stay in App.vue. -->
  <!-- 中文：物流新增/编辑表单。只负责界面：计算、规则与 API 均留在 App.vue。 -->
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>{{ t(editing ? 'edit' : 'add_new') }} · {{ t(page) }}</h3>
        <button class="icon" :aria-label="t('close')" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <label>
          {{ t('order_number') }}
          <select
            v-model="editor.order_number"
            :disabled="editing"
            @change="$emit('shipment-order-change')"
          >
            <option value="">{{ t('selectOrder') }}</option>
            <option v-for="o in shippableOrders" :key="o.order_number" :value="o.order_number">
              {{ o.order_number }} · {{ t(o.status) }}
            </option>
          </select>
        </label>
        <div v-if="orderDetail" class="readonly">
          {{ t('customer') }} {{ orderDetail.customer_email || '—' }} · {{ t('status') }}
          {{ t(orderDetail.status) }} · {{ t('shippedQuantity') }} {{ shippedTotal }} /
          {{ orderedTotal }}
        </div>

        <div class="form-grid">
          <label>
            {{ t('carrier') }}
            <input v-model.trim="editor.carrier" list="carrier-options" required />
            <datalist id="carrier-options">
              <option v-for="c in carriers" :key="c" :value="c"></option>
            </datalist>
          </label>
          <label>
            {{ t('tracking_number') }}
            <input v-model.trim="editor.tracking_number" required />
          </label>
        </div>
        <div class="form-grid">
          <label>
            {{ t('estimatedDelivery') }}
            <input v-model="editor.estimated_delivery" type="date" />
          </label>
          <label>
            {{ t('receiverName') }}
            <input v-model.trim="editor.receiver_name" />
          </label>
        </div>

        <template v-if="!editing">
          <div class="section-title">{{ t('items') }}</div>
          <div v-if="!orderDetail" class="hint">{{ t('selectOrderFirst') }}</div>
          <div v-else-if="!shipmentLines.length" class="hint">{{ t('nothingToShip') }}</div>
          <div v-for="line in shipmentLines" :key="line.id" class="item-line">
            <div class="line-name">{{ line.name }} ({{ line.sku }})</div>
            <label class="qty">
              {{ t('quantity') }}
              <input
                v-model.number="line.quantity"
                type="number"
                min="0"
                :max="line.remaining"
                step="1"
              />
            </label>
            <span class="hint">/ {{ line.remaining }}</span>
          </div>
          <div v-if="shipmentLines.length" class="hint">{{ t('shipAllHint') }}</div>
        </template>

        <template v-else>
          <div class="form-grid">
            <label>
              {{ t('shipmentStatus') }}
              <select v-model="editor.status">
                <option v-for="s in shipmentStatusOptions" :key="s" :value="s">
                  {{ t(s) }}
                </option>
              </select>
            </label>
            <label>
              {{ t('location') }}
              <input v-model.trim="editor.location" :placeholder="t('locationPlaceholder')" />
            </label>
          </div>
          <label>
            {{ t('description') }}
            <input v-model.trim="editor.description" :placeholder="t('eventPlaceholder')" />
          </label>

          <div class="section-title">{{ t('shipmentItems') }}</div>
          <table class="mini-table">
            <thead>
              <tr>
                <th>{{ t('product') }}</th>
                <th>{{ t('quantity') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in shipmentDetail?.items || []" :key="i.id">
                <td>{{ i.name }} ({{ i.sku }})</td>
                <td>{{ i.quantity }}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">{{ t('trackingEvents') }}</div>
          <table class="mini-table">
            <thead>
              <tr>
                <th>{{ t('occurredAt') }}</th>
                <th>{{ t('status') }}</th>
                <th>{{ t('location') }}</th>
                <th>{{ t('description') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in shipmentDetail?.events || []" :key="e.id">
                <td>{{ formatTime(e.occurred_at) }}</td>
                <td>{{ t(e.status) }}</td>
                <td>{{ e.location || '—' }}</td>
                <td>{{ e.description || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!shipmentDetail?.events?.length" class="hint">{{ t('empty') }}</div>
        </template>

        <label>
          {{ t('note') }}
          <input v-model.trim="editor.note" />
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
// EN: Presentation-only shipment editor; order selection and save/close are emitted to App.vue.
// 中文：纯展示的物流编辑器；订单选择与保存/关闭通过事件交回 App.vue。
import { translate } from '../../i18n'
import { formatTime } from '../../utils/format'

export default {
  name: 'ShipmentEditor',
  props: {
    locale: { type: String, default: 'zh' },
    page: { type: String, default: 'shipments' },
    busy: { type: Boolean, default: false },
    editing: { type: Boolean, default: false },
    editor: { type: Object, required: true },
    shippableOrders: { type: Array, default: () => [] },
    orderDetail: { type: Object, default: null },
    shippedTotal: { type: Number, default: 0 },
    orderedTotal: { type: Number, default: 0 },
    carriers: { type: Array, default: () => [] },
    shipmentLines: { type: Array, default: () => [] },
    shipmentStatusOptions: { type: Array, default: () => [] },
    shipmentDetail: { type: Object, default: null }
  },
  methods: {
    t(key) {
      return translate(this.locale, key)
    },
    formatTime(value) {
      return formatTime(value)
    }
  }
}
</script>
