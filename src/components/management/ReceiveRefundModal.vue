<template>
  <!-- EN: Receive-into-stock modal. UI only: receiveLines state and the receive API stay in App.vue. -->
  <!-- 中文：退货验收入库弹窗。只负责界面：receiveLines 状态与验收 API 均留在 App.vue。 -->
  <!-- EN: Quantity input keeps the original min/max/step constraints; App.vue validates before calling the API. -->
  <!-- 中文：数量输入保留原有 min/max/step 约束；API 调用前由 App.vue 做业务校验。 -->
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal small" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>{{ t('receive') }}</h3>
        <button class="icon" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div v-for="line in lines" :key="line.order_item_id" class="item-line">
          <div class="line-info">
            <div class="line-name">{{ line.name }} ({{ line.sku }})</div>
            <!-- EN: Show the requested total, the quantity already received and the remainder. -->
            <!-- 中文：展示申请退货总量、此前已验收数量与剩余可验收数量。 -->
            <div class="hint">
              {{ t('requestedQuantity') }}: {{ line.quantity }} · {{ t('receivedQuantity') }}:
              {{ line.received_quantity }} · {{ t('remainingQuantity') }}: {{ line.max }}
            </div>
          </div>
          <!-- EN: The editable value defaults to the full remaining amount and keeps max = remaining. -->
          <!-- 中文：可编辑值默认为全部剩余量，max 仍为剩余可验收数量。 -->
          <label class="qty">
            {{ t('receiveNow') }}
            <input
              v-model.number="line.accepted_quantity"
              type="number"
              min="0"
              :max="line.max"
              step="1"
            />
          </label>
        </div>
      </div>
      <div class="modal-foot">
        <button @click="$emit('receive')" :disabled="busy">{{ t('save') }}</button>
        <button class="secondary" @click="$emit('close')">{{ t('cancel') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
// EN: Presentation-only receive modal; the receive request and inventory return remain server-side.
// 中文：纯展示的验收弹窗；验收请求与库存回收仍由服务端完成。
import { translate } from '../../i18n'

export default {
  name: 'ReceiveRefundModal',
  props: {
    locale: { type: String, default: 'zh' },
    busy: { type: Boolean, default: false },
    lines: { type: Array, default: () => [] }
  },
  methods: {
    t(key) {
      return translate(this.locale, key)
    }
  }
}
</script>
