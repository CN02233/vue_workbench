<template>
  <!-- EN: Inventory create/edit form. UI only: adjustStock, linked orders and logs stay in App.vue. -->
  <!-- 中文：库存新增/编辑表单。只负责界面：adjustStock、关联订单与流水均留在 App.vue。 -->
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>{{ t(editing ? 'edit' : 'add_new') }} · {{ t(page) }}</h3>
        <button class="icon" :aria-label="t('close')" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div class="form-grid">
          <label>
            {{ t('sku') }}
            <input v-model.trim="editor.sku" required :disabled="editing" />
          </label>
          <label>
            {{ t('name') }}
            <input v-model.trim="editor.name" required />
          </label>
        </div>
        <div class="form-grid">
          <label>
            {{ t('price') }}
            <input v-model.number="editor.price" type="number" min="0" step="0.01" required />
          </label>
          <label v-if="!editing">
            {{ t('stock') }}
            <input v-model.number="editor.stock" type="number" min="0" step="1" required />
          </label>
          <label v-else>
            {{ t('stock') }}
            <input :value="editor.stock" type="number" disabled />
            <span class="hint">{{ t('stockHint') }}</span>
          </label>
        </div>

        <!-- EN: Editing never writes stock through the product update API; delta uses adjustStock. -->
        <!-- 中文：编辑时不通过商品更新接口改库存；delta 统一走 adjustStock。 -->
        <template v-if="editing">
          <div class="section-title">{{ t('stockAdjustment') }}</div>
          <div class="form-grid">
            <label>
              {{ t('delta') }}
              <input v-model.number="editor.delta" type="number" step="1" placeholder="-3 / +5" />
            </label>
            <label>
              {{ t('note') }}
              <input v-model.trim="editor.note" />
            </label>
          </div>
          <div class="section-title">{{ t('linkedOrders') }}</div>
          <table class="mini-table">
            <thead>
              <tr>
                <th>{{ t('order_number') }}</th>
                <th>{{ t('status') }}</th>
                <th>{{ t('quantity') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in linkedOrders" :key="o.order_number">
                <td>{{ o.order_number }}</td>
                <td>{{ t(o.order_status) }}</td>
                <td>{{ o.quantity }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!linkedOrders.length" class="hint">{{ t('noLinked') }}</div>
          <div class="section-title">{{ t('stockMovements') }}</div>
          <table class="mini-table">
            <thead>
              <tr>
                <th>{{ t('movementType') }}</th>
                <th>{{ t('delta') }}</th>
                <th>{{ t('balanceAfter') }}</th>
                <th>{{ t('reference') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movements" :key="m.id">
                <td>{{ m.movement_type }}</td>
                <td>{{ m.delta }}</td>
                <td>{{ m.balance_after }}</td>
                <td>{{ m.reference }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!movements.length" class="hint">{{ t('noLinked') }}</div>
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
// EN: Presentation-only inventory editor; stock adjustments and related data stay in App.vue.
// 中文：纯展示的库存编辑器；库存调整与关联数据均留在 App.vue。
import { translate } from '../../i18n'

export default {
  name: 'InventoryEditor',
  props: {
    locale: { type: String, default: 'zh' },
    page: { type: String, default: 'inventory' },
    busy: { type: Boolean, default: false },
    editing: { type: Boolean, default: false },
    editor: { type: Object, required: true },
    linkedOrders: { type: Array, default: () => [] },
    movements: { type: Array, default: () => [] }
  },
  methods: {
    t(key) {
      return translate(this.locale, key)
    }
  }
}
</script>
