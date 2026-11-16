<template>
  <main class="shell">
    <header>
      <div>
        <small>ORDER AI · CUSTOMER OPERATIONS</small>
        <h1>{{ t('title') }}</h1>
        <p>{{ t('subtitle') }}</p>
      </div>
      <div class="header-actions">
        <label class="language-label">
          {{ t('language') }}
          <select v-model="locale">
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        <span class="status">
          <i></i>
          {{ t('service') }} {{ health ? t('online') : t('offline') }}
        </span>
      </div>
    </header>

    <nav class="menu">
      <button
        v-for="item in menu"
        :key="item.id"
        :class="{ active: page === item.id }"
        @click="openPage(item.id)"
      >
        {{ t(item.id) }}
      </button>
    </nav>

    <section v-if="page === 'dashboard'" class="grid">
      <article class="card inquiry">
        <h2>{{ t('inquiryTitle') }}</h2>
        <p class="muted">{{ t('inquiryHelp') }}</p>
        <label>
          {{ t('customerEmail') }}
          <input v-model="form.customer_email" placeholder="customer@example.com" />
        </label>
        <label>
          {{ t('subject') }}
          <input v-model="form.subject" :placeholder="t('subjectPlaceholder')" />
        </label>
        <label>
          {{ t('inquiryContent') }}
          <textarea v-model="form.body" rows="5" :placeholder="t('inquiryPlaceholder')"></textarea>
        </label>
        <button @click="classify" :disabled="busy">{{ t('classify') }}</button>
        <div v-if="inquiryResult" class="result">
          <span class="tag">{{ t(inquiryResult.category) }}</span>
          {{ t('inquirySaved') }}
        </div>
      </article>

      <article class="card">
        <h2>{{ t('customerOrders') }}</h2>
        <p class="muted">{{ t('customerHelp') }}</p>
        <div class="row">
          <input v-model="email" placeholder="john@example.com" />
          <button class="secondary" @click="lookupCustomer">
            {{ t('search') }}
          </button>
        </div>
        <div class="customer-form">
          <h3>{{ t('newCustomer') }}</h3>
          <label>
            {{ t('customerName') }}
            <input v-model="newCustomer.name" :placeholder="t('customerName')" />
          </label>
          <label>
            {{ t('customerEmail') }}
            <input v-model="newCustomer.email" type="email" placeholder="customer@example.com" />
          </label>
          <button class="secondary" @click="createCustomer" :disabled="busy">
            {{ t('createCustomer') }}
          </button>
        </div>
        <div v-if="customerCreated" class="result">{{ t('customerCreated') }}</div>
        <div v-if="customer" class="result">
          <b>{{ customer.name }}</b>
          <div>{{ customer.email }}</div>
        </div>
        <div v-for="o in orders" :key="o.order_number" class="order">
          <b>{{ o.order_number }}</b>
          <span>{{ t(o.status) }}</span>
          <div>{{ t('tracking') }} {{ o.tracking_number || t('notAvailable') }}</div>
          <div v-for="i in o.items" :key="i.id">{{ i.name }} × {{ i.quantity }}</div>
          <button class="link" @click="openRefundFor(o.order_number)">
            {{ t('requestRefund') }}
          </button>
        </div>
      </article>

      <article class="card">
        <h2>{{ t('productLookup') }}</h2>
        <div class="row">
          <input v-model="sku" :placeholder="t('skuPlaceholder')" />
          <button class="secondary" @click="lookupProduct">
            {{ t('search') }}
          </button>
        </div>
        <div v-if="product" class="result">
          <b>{{ product.name }}</b>
          <div>
            SKU {{ product.sku }} · {{ t('stock') }} {{ product.stock }} · ¥{{ product.price }}
          </div>
        </div>
      </article>

      <article class="card">
        <h2>{{ t('refundTitle') }}</h2>
        <p class="muted">{{ t('refundHelp') }}</p>
        <label>
          {{ t('orderNumber') }}
          <select v-model="refund.order_number">
            <option value="">{{ t('selectOrder') }}</option>
            <option v-for="o in refundableOrders" :key="o.order_number" :value="o.order_number">
              {{ o.order_number }} · {{ t(o.status) }}
            </option>
          </select>
        </label>
        <button
          class="warm"
          :disabled="!refund.order_number"
          @click="openRefundFor(refund.order_number)"
        >
          {{ t('requestRefund') }}
        </button>
      </article>
    </section>

    <section v-else class="card management">
      <div class="management-heading">
        <h2>{{ t(page) }}</h2>
        <button @click="beginCreate">{{ t('add_new') }}</button>
      </div>
      <div class="filters">
        <label v-for="field in filterFields" :key="field.key">
          {{ t(field.key) }}
          <select v-if="field.options" v-model="filters[field.key]">
            <option value="">{{ t('all') }}</option>
            <option v-for="option in field.options" :key="option" :value="option">
              {{ t(option) }}
            </option>
          </select>
          <input
            v-else
            v-model="filters[field.key]"
            :type="field.type || 'text'"
            :min="field.min"
            :step="field.step"
          />
        </label>
        <button @click="searchPage">{{ t('search') }}</button>
        <button class="secondary" @click="resetFilters">{{ t('reset') }}</button>
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
            <tr v-for="row in filteredRows" :key="row.id || row.order_number || row.sku">
              <td v-for="column in columns" :key="column">{{ cell(row, column) }}</td>
              <td class="action-cell">
                <button
                  v-if="page !== 'refunds' || row.status === 'PENDING_MANUAL_APPROVAL'"
                  class="secondary"
                  @click="beginEdit(row)"
                >
                  {{ t('edit') }}
                </button>
                <button
                  v-if="page === 'refunds' && row.status === 'PENDING_MANUAL_APPROVAL'"
                  class="warm"
                  @click="approveRefund(row.id)"
                >
                  {{ t('approve') }}
                </button>
                <button
                  v-if="page === 'refunds' && row.status === 'PENDING_MANUAL_APPROVAL'"
                  class="secondary"
                  @click="rejectRefund(row.id)"
                >
                  {{ t('reject') }}
                </button>
                <button
                  v-if="
                    page === 'refunds' &&
                    row.status === 'APPROVED_MANUALLY' &&
                    row.refund_type === 'RETURN_AND_REFUND' &&
                    !row.inventory_received
                  "
                  class="warm"
                  @click="openReceive(row)"
                >
                  {{ t('receive') }}
                </button>
                <button
                  v-if="page === 'orders' && row.status === 'PROCESSING'"
                  class="secondary"
                  @click="cancelOrder(row)"
                >
                  {{ t('cancelOrder') }}
                </button>
                <button
                  class="danger"
                  v-if="
                    page !== 'shipments' ||
                    !['DELIVERED', 'IN_TRANSIT', 'PICKED_UP'].includes(row.status)
                  "
                  :disabled="page === 'inventory' && row.order_count > 0"
                  :title="page === 'inventory' && row.order_count > 0 ? t('productLinked') : ''"
                  @click="removeRow(row)"
                >
                  {{ t('delete') }}
                </button>
              </td>
            </tr>
            <tr v-if="!filteredRows.length">
              <td :colspan="columns.length + 1" class="empty">{{ t('empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <label>
          {{ t('page_size') }}
          <select v-model.number="pageSize" @change="changePageSize">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </label>
        <button class="secondary" :disabled="pageNumber === 0" @click="loadPage(pageNumber - 1)">
          {{ t('previous') }}
        </button>
        <span>{{ pageNumber + 1 }} / {{ totalPages || 1 }} · {{ totalElements }}</span>
        <button
          class="secondary"
          :disabled="pageNumber + 1 >= totalPages"
          @click="loadPage(pageNumber + 1)"
        >
          {{ t('next') }}
        </button>
      </div>
    </section>

    <!-- 新增 / 编辑 弹窗 -->
    <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>{{ t(editing ? 'edit' : 'add_new') }} · {{ t(page) }}</h3>
          <button class="icon" :aria-label="t('close')" @click="closeForm">×</button>
        </div>

        <div class="modal-body">
          <!-- 订单：客户与商品都从关联数据中选择 -->
          <template v-if="page === 'orders'">
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
                <button class="danger remove-line" @click="removeItemLine(index)">
                  {{ t('remove') }}
                </button>
              </div>
              <button class="secondary" @click="addItemLine">+ {{ t('addItem') }}</button>
              <label>
                {{ t('tracking_number') }}
                <input v-model.trim="editor.tracking_number" />
              </label>
            </template>

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
          </template>

          <!-- 物流：一个订单可以拆成多个包裹，发货数量受订单行剩余量约束 -->
          <template v-else-if="page === 'shipments'">
            <label>
              {{ t('order_number') }}
              <select
                v-model="editor.order_number"
                :disabled="editing"
                @change="onShipmentOrderChange"
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
          </template>

          <!-- 退款：订单、退款类型、退货商品都从关联数据中选择 -->
          <template v-else-if="page === 'refunds'">
            <label>
              {{ t('orderNumber') }}
              <select
                v-model="editor.order_number"
                :disabled="editing"
                @change="onRefundOrderChange"
              >
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
                  @change="onRefundTypeChange"
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
          </template>

          <!-- 库存：编辑时库存只能走调整接口，并展示关联订单与流水 -->
          <template v-else-if="page === 'inventory'">
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

            <template v-if="editing">
              <div class="section-title">{{ t('stockAdjustment') }}</div>
              <div class="form-grid">
                <label>
                  {{ t('delta') }}
                  <input
                    v-model.number="editor.delta"
                    type="number"
                    step="1"
                    placeholder="-3 / +5"
                  />
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
          </template>

          <!-- 咨询 -->
          <template v-else>
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
          </template>
        </div>

        <div class="modal-foot">
          <button @click="saveManagement" :disabled="busy">{{ t('save') }}</button>
          <button class="secondary" @click="closeForm">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- 退货验收弹窗 -->
    <div v-if="showReceive" class="modal-backdrop" @click.self="showReceive = false">
      <div class="modal small" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>{{ t('receive') }}</h3>
          <button class="icon" @click="showReceive = false">×</button>
        </div>
        <div class="modal-body">
          <div v-for="line in receiveLines" :key="line.order_item_id" class="item-line">
            <div class="line-name">{{ line.name }} ({{ line.sku }})</div>
            <label class="qty">
              {{ t('quantity') }}
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
          <button @click="confirmReceive" :disabled="busy">{{ t('save') }}</button>
          <button class="secondary" @click="showReceive = false">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>

    <div v-if="error" class="toast">{{ error }}</div>
  </main>
</template>

<script>
import axios from 'axios'

const messages = {
  zh: {
    title: '客服工作台',
    subtitle: '咨询处理 · 订单查询 · 退款审核',
    language: '语言',
    service: '业务服务',
    online: '在线',
    offline: '未连接',
    inquiryTitle: '处理客户咨询',
    inquiryHelp: '提交后系统将按规则分类并记录，不使用 LLM。',
    customerEmail: '客户邮箱',
    subject: '主题',
    subjectPlaceholder: 'Where is my order?',
    inquiryContent: '咨询内容',
    inquiryPlaceholder: '请输入客户邮件内容',
    classify: '分类并记录',
    inquirySaved: '咨询已记录',
    customerOrders: '客户与订单',
    customerHelp: '使用客户邮箱查找客户及订单。',
    newCustomer: '新增客户',
    customerName: '客户姓名',
    createCustomer: '保存客户',
    customerCreated: '客户已创建',
    customerNotFound: '未找到该客户',
    customerAlreadyExists: '该邮箱已注册',
    search: '查询',
    tracking: '物流：',
    notAvailable: '暂无',
    requestRefund: '申请退款',
    productLookup: '商品库存查询',
    skuPlaceholder: '例如 MUG-001',
    stock: '库存',
    refundTitle: '退款申请',
    refundHelp: '此操作只创建申请，退款必须由人工审批。',
    orderNumber: '订单号',
    reason: '申请原因',
    reasonPlaceholder: '请描述退款原因',
    submitReview: '提交人工审核',
    refundSubmitted: '已提交审核',
    requestFailed: '请求失败',
    ORDER_QUERY: '订单查询',
    PRODUCT_INQUIRY: '商品咨询',
    REFUND: '退款申请',
    COMPLAINT: '投诉',
    OTHER: '其他',
    SHIPPED: '已发货',
    PROCESSING: '处理中',
    DELIVERED: '已送达',
    CANCELLED: '已取消',
    PENDING_MANUAL_APPROVAL: '待人工审核',
    APPROVED_MANUALLY: '已人工批准'
  },
  en: {
    title: 'Customer Support Workbench',
    subtitle: 'Inquiries · Orders · Refund Review',
    language: 'Language',
    service: 'Business API',
    online: 'Online',
    offline: 'Offline',
    inquiryTitle: 'Handle an Inquiry',
    inquiryHelp: 'Inquiries are classified by rules. No LLM is used.',
    customerEmail: 'Customer email',
    subject: 'Subject',
    subjectPlaceholder: 'Where is my order?',
    inquiryContent: 'Message',
    inquiryPlaceholder: 'Enter the customer message',
    classify: 'Classify and Save',
    inquirySaved: 'Inquiry saved',
    customerOrders: 'Customer and Orders',
    customerHelp: 'Find a customer and their orders by email.',
    newCustomer: 'Add customer',
    customerName: 'Customer name',
    createCustomer: 'Save customer',
    customerCreated: 'Customer created',
    customerNotFound: 'Customer not found',
    customerAlreadyExists: 'This email is already registered',
    search: 'Search',
    tracking: 'Tracking:',
    notAvailable: 'Not available',
    requestRefund: 'Request refund',
    productLookup: 'Product Stock Lookup',
    skuPlaceholder: 'For example, MUG-001',
    stock: 'Stock:',
    refundTitle: 'Refund Request',
    refundHelp: 'This creates a request only. A person must approve any refund.',
    orderNumber: 'Order number',
    reason: 'Reason',
    reasonPlaceholder: 'Describe the reason for the refund',
    submitReview: 'Submit for Review',
    refundSubmitted: 'Submitted for review',
    requestFailed: 'Request failed',
    ORDER_QUERY: 'Order inquiry',
    PRODUCT_INQUIRY: 'Product inquiry',
    REFUND: 'Refund request',
    COMPLAINT: 'Complaint',
    OTHER: 'Other',
    SHIPPED: 'Shipped',
    PROCESSING: 'Processing',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    PENDING_MANUAL_APPROVAL: 'Pending manual approval',
    APPROVED_MANUALLY: 'Manually approved'
  },
  es: {
    title: 'Panel de Atención al Cliente',
    subtitle: 'Consultas · Pedidos · Revisión de reembolsos',
    language: 'Idioma',
    service: 'Servicio de negocio',
    online: 'En línea',
    offline: 'Desconectado',
    inquiryTitle: 'Gestionar consulta',
    inquiryHelp: 'Las consultas se clasifican mediante reglas, sin usar un LLM.',
    customerEmail: 'Correo del cliente',
    subject: 'Asunto',
    subjectPlaceholder: '¿Dónde está mi pedido?',
    inquiryContent: 'Mensaje',
    inquiryPlaceholder: 'Escribe el mensaje del cliente',
    classify: 'Clasificar y guardar',
    inquirySaved: 'Consulta guardada',
    customerOrders: 'Cliente y pedidos',
    customerHelp: 'Busca un cliente y sus pedidos por correo.',
    newCustomer: 'Añadir cliente',
    customerName: 'Nombre del cliente',
    createCustomer: 'Guardar cliente',
    customerCreated: 'Cliente creado',
    customerNotFound: 'No se encontró el cliente',
    customerAlreadyExists: 'Este correo ya está registrado',
    search: 'Buscar',
    tracking: 'Seguimiento:',
    notAvailable: 'No disponible',
    requestRefund: 'Solicitar reembolso',
    productLookup: 'Consulta de inventario',
    skuPlaceholder: 'Por ejemplo, MUG-001',
    stock: 'Existencias:',
    refundTitle: 'Solicitud de reembolso',
    refundHelp: 'Esto solo crea una solicitud. Una persona debe aprobar el reembolso.',
    orderNumber: 'Número de pedido',
    reason: 'Motivo',
    reasonPlaceholder: 'Describe el motivo del reembolso',
    submitReview: 'Enviar para revisión',
    refundSubmitted: 'Enviado para revisión',
    requestFailed: 'Error en la solicitud',
    ORDER_QUERY: 'Consulta de pedido',
    PRODUCT_INQUIRY: 'Consulta de producto',
    REFUND: 'Solicitud de reembolso',
    COMPLAINT: 'Queja',
    OTHER: 'Otro',
    SHIPPED: 'Enviado',
    PROCESSING: 'En preparación',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    PENDING_MANUAL_APPROVAL: 'Pendiente de aprobación manual',
    APPROVED_MANUALLY: 'Aprobado manualmente'
  }
}

const managementMessages = {
  zh: {
    dashboard: '工作台',
    add_new: '新增',
    edit: '编辑',
    save: '保存',
    cancel: '取消',
    close: '关闭',
    remove: '移除',
    body: '咨询内容',
    orders: '订单管理',
    shipments: '物流管理',
    refunds: '退款管理',
    inventory: '库存管理',
    inquiries: '客户咨询管理',
    filter: '筛选当前页',
    search: '查询',
    reset: '重置',
    all: '全部',
    page_size: '每页',
    approve: '批准',
    reject: '拒绝',
    receive: '验收入库',
    delete: '删除',
    cancelOrder: '取消订单',
    previous: '上一页',
    next: '下一页',
    actions: '操作',
    empty: '暂无数据',
    confirmDelete: '确定删除这条记录吗？',
    confirmCancelOrder: '确定取消此订单吗？取消后将释放占用的库存。',
    confirmApprove: '确认批准此退款申请？',
    confirmReject: '确认拒绝此退款申请？',
    order_number: '订单号',
    customer_id: '客户ID',
    customer: '客户',
    status: '状态',
    tracking_number: '物流单号',
    carrier: '物流公司',
    shipmentStatus: '物流状态',
    shippedQuantity: '已发数量',
    shippedAt: '发货时间',
    deliveredAt: '签收时间',
    estimatedDelivery: '预计送达',
    receiverName: '收件人',
    trackingEvents: '物流轨迹',
    location: '当前位置',
    locationPlaceholder: '例如 上海转运中心',
    description: '轨迹说明',
    eventPlaceholder: '例如 已到达杭州分拣中心',
    occurredAt: '发生时间',
    orderShipments: '订单物流',
    shipmentItems: '物流单明细',
    shipAllHint: '默认发剩余全部，可改成部分发货',
    nothingToShip: '该订单已全部发货',
    needShipmentItems: '请至少填写一件商品数量',
    CREATED: '待揽收',
    PICKED_UP: '已揽收',
    IN_TRANSIT: '运输中',
    EXCEPTION: '运输异常',
    id: '编号',
    reason: '原因',
    sku: 'SKU',
    name: '商品名称',
    product: '商品',
    items: '商品明细',
    addItem: '添加商品',
    selectCustomer: '选择客户',
    selectProduct: '选择商品',
    selectOrder: '选择订单',
    quantity: '数量',
    unitPrice: '单价',
    lineTotal: '小计',
    availableStock: '可用库存',
    stock: '库存',
    stockHint: '库存不能在此修改，请使用下方调整',
    price: '价格',
    min_stock: '最低库存',
    max_stock: '最高库存',
    min_price: '最低价格',
    max_price: '最高价格',
    customer_email: '客户邮箱',
    subject: '主题',
    category: '分类',
    created_at: '创建时间',
    created_from: '开始时间',
    created_to: '结束时间',
    refundType: '退款类型',
    refund_only: '仅退款',
    return_and_refund: '退货退款',
    REFUND_ONLY: '仅退款',
    RETURN_AND_REFUND: '退货退款',
    amount: '退款金额',
    refundable: '可退金额',
    pendingRefund: '待审占用',
    totalAmount: '订单总额',
    returnItems: '退货商品',
    selectOrderFirst: '请先选择关联订单',
    reviewStatus: '审核状态',
    inventoryReceived: '已验收入库',
    yes: '是',
    no: '否',
    stockAdjustment: '库存调整',
    delta: '变动数量',
    note: '备注',
    linkedOrders: '关联订单',
    stockMovements: '库存流水',
    movementType: '类型',
    balanceAfter: '变动后余额',
    reference: '关联单号',
    noLinked: '暂无关联记录',
    orderCount: '关联订单',
    productLinked: '已关联订单，不能删除',
    SHIPPED: '已发货',
    PROCESSING: '处理中',
    DELIVERED: '已送达',
    CANCELLED: '已取消',
    PENDING_MANUAL_APPROVAL: '待人工审核',
    APPROVED_MANUALLY: '已人工批准',
    REJECTED: '已拒绝',
    ORDER_QUERY: '订单查询',
    PRODUCT_INQUIRY: '商品咨询',
    REFUND: '退款申请',
    COMPLAINT: '投诉',
    OTHER: '其他'
  },
  en: {
    dashboard: 'Workbench',
    add_new: 'Add new',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    remove: 'Remove',
    body: 'Message',
    orders: 'Orders',
    shipments: 'Logistics',
    refunds: 'Refunds',
    inventory: 'Inventory',
    inquiries: 'Customer inquiries',
    filter: 'Filter this page',
    search: 'Search',
    reset: 'Reset',
    all: 'All',
    page_size: 'Page size',
    approve: 'Approve',
    reject: 'Reject',
    receive: 'Receive stock',
    delete: 'Delete',
    cancelOrder: 'Cancel order',
    previous: 'Previous',
    next: 'Next',
    actions: 'Actions',
    empty: 'No records found',
    confirmDelete: 'Delete this record?',
    confirmCancelOrder: 'Cancel this order? Reserved stock will be released.',
    confirmApprove: 'Approve this refund request?',
    confirmReject: 'Reject this refund request?',
    order_number: 'Order number',
    customer_id: 'Customer ID',
    customer: 'Customer',
    status: 'Status',
    tracking_number: 'Tracking number',
    carrier: 'Carrier',
    shipmentStatus: 'Shipment status',
    shippedQuantity: 'Shipped',
    shippedAt: 'Shipped at',
    deliveredAt: 'Delivered at',
    estimatedDelivery: 'Est. delivery',
    receiverName: 'Receiver',
    trackingEvents: 'Tracking events',
    location: 'Location',
    locationPlaceholder: 'e.g. Shanghai hub',
    description: 'Event note',
    eventPlaceholder: 'e.g. Arrived at the Hangzhou sorting centre',
    occurredAt: 'Occurred at',
    orderShipments: 'Shipments',
    shipmentItems: 'Parcel contents',
    shipAllHint: 'Defaults to every unshipped unit; lower a quantity for a partial shipment',
    nothingToShip: 'Every unit of this order has been shipped',
    needShipmentItems: 'Ship at least one unit',
    CREATED: 'Awaiting pickup',
    PICKED_UP: 'Picked up',
    IN_TRANSIT: 'In transit',
    EXCEPTION: 'Exception',
    id: 'ID',
    reason: 'Reason',
    sku: 'SKU',
    name: 'Product name',
    product: 'Product',
    items: 'Order items',
    addItem: 'Add item',
    selectCustomer: 'Select customer',
    selectProduct: 'Select product',
    selectOrder: 'Select order',
    quantity: 'Quantity',
    unitPrice: 'Unit price',
    lineTotal: 'Line total',
    availableStock: 'Available stock',
    stock: 'Stock',
    stockHint: 'Stock cannot be edited here; use the adjustment below',
    price: 'Price',
    min_stock: 'Min stock',
    max_stock: 'Max stock',
    min_price: 'Min price',
    max_price: 'Max price',
    customer_email: 'Customer email',
    subject: 'Subject',
    category: 'Category',
    created_at: 'Created at',
    created_from: 'From',
    created_to: 'To',
    refundType: 'Refund type',
    refund_only: 'Refund only',
    return_and_refund: 'Return and refund',
    REFUND_ONLY: 'Refund only',
    RETURN_AND_REFUND: 'Return and refund',
    amount: 'Amount',
    refundable: 'Refundable',
    pendingRefund: 'Pending',
    totalAmount: 'Order total',
    returnItems: 'Return items',
    selectOrderFirst: 'Select an order first',
    reviewStatus: 'Review status',
    inventoryReceived: 'Stock received',
    yes: 'Yes',
    no: 'No',
    stockAdjustment: 'Stock adjustment',
    delta: 'Delta',
    note: 'Note',
    linkedOrders: 'Linked orders',
    stockMovements: 'Stock movements',
    movementType: 'Type',
    balanceAfter: 'Balance after',
    reference: 'Reference',
    noLinked: 'No linked records',
    orderCount: 'Orders',
    productLinked: 'Linked to orders, cannot be deleted',
    SHIPPED: 'Shipped',
    PROCESSING: 'Processing',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    PENDING_MANUAL_APPROVAL: 'Pending review',
    APPROVED_MANUALLY: 'Approved manually',
    REJECTED: 'Rejected',
    ORDER_QUERY: 'Order inquiry',
    PRODUCT_INQUIRY: 'Product inquiry',
    REFUND: 'Refund request',
    COMPLAINT: 'Complaint',
    OTHER: 'Other'
  },
  es: {
    dashboard: 'Panel',
    add_new: 'Crear',
    edit: 'Editar',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    remove: 'Quitar',
    body: 'Mensaje',
    orders: 'Pedidos',
    shipments: 'Logística',
    refunds: 'Reembolsos',
    inventory: 'Inventario',
    inquiries: 'Consultas de clientes',
    filter: 'Filtrar esta página',
    search: 'Buscar',
    reset: 'Restablecer',
    all: 'Todos',
    page_size: 'Tamaño de página',
    approve: 'Aprobar',
    reject: 'Rechazar',
    receive: 'Recibir stock',
    delete: 'Eliminar',
    cancelOrder: 'Cancelar pedido',
    previous: 'Anterior',
    next: 'Siguiente',
    actions: 'Acciones',
    empty: 'No hay registros',
    confirmDelete: '¿Eliminar este registro?',
    confirmCancelOrder: '¿Cancelar este pedido? Se liberará el stock reservado.',
    confirmApprove: '¿Aprobar esta solicitud de reembolso?',
    confirmReject: '¿Rechazar esta solicitud de reembolso?',
    order_number: 'Número de pedido',
    customer_id: 'ID del cliente',
    customer: 'Cliente',
    status: 'Estado',
    tracking_number: 'Número de seguimiento',
    carrier: 'Transportista',
    shipmentStatus: 'Estado del envío',
    shippedQuantity: 'Enviado',
    shippedAt: 'Enviado el',
    deliveredAt: 'Entregado el',
    estimatedDelivery: 'Entrega estimada',
    receiverName: 'Destinatario',
    trackingEvents: 'Eventos de seguimiento',
    location: 'Ubicación',
    locationPlaceholder: 'p. ej. Centro de Shanghái',
    description: 'Nota del evento',
    eventPlaceholder: 'p. ej. Llegó al centro de clasificación de Hangzhou',
    occurredAt: 'Ocurrido el',
    orderShipments: 'Envíos',
    shipmentItems: 'Contenido del envío',
    shipAllHint:
      'Por defecto todas las unidades pendientes; reduce la cantidad para un envío parcial',
    nothingToShip: 'Todas las unidades ya fueron enviadas',
    needShipmentItems: 'Envía al menos una unidad',
    CREATED: 'Pendiente de recogida',
    PICKED_UP: 'Recogido',
    IN_TRANSIT: 'En tránsito',
    EXCEPTION: 'Incidencia',
    id: 'ID',
    reason: 'Motivo',
    sku: 'SKU',
    name: 'Producto',
    product: 'Producto',
    items: 'Artículos del pedido',
    addItem: 'Añadir artículo',
    selectCustomer: 'Seleccionar cliente',
    selectProduct: 'Seleccionar producto',
    selectOrder: 'Seleccionar pedido',
    quantity: 'Cantidad',
    unitPrice: 'Precio unitario',
    lineTotal: 'Total de línea',
    availableStock: 'Existencias disponibles',
    stock: 'Existencias',
    stockHint: 'Las existencias no se editan aquí; usa el ajuste inferior',
    price: 'Precio',
    min_stock: 'Existencias mínimas',
    max_stock: 'Existencias máximas',
    min_price: 'Precio mínimo',
    max_price: 'Precio máximo',
    customer_email: 'Correo del cliente',
    subject: 'Asunto',
    category: 'Categoría',
    created_at: 'Creado',
    created_from: 'Desde',
    created_to: 'Hasta',
    refundType: 'Tipo de reembolso',
    refund_only: 'Solo reembolso',
    return_and_refund: 'Devolución y reembolso',
    REFUND_ONLY: 'Solo reembolso',
    RETURN_AND_REFUND: 'Devolución y reembolso',
    amount: 'Importe',
    refundable: 'Reembolsable',
    pendingRefund: 'Pendiente',
    totalAmount: 'Total del pedido',
    returnItems: 'Artículos devueltos',
    selectOrderFirst: 'Selecciona primero un pedido',
    reviewStatus: 'Estado de revisión',
    inventoryReceived: 'Stock recibido',
    yes: 'Sí',
    no: 'No',
    stockAdjustment: 'Ajuste de existencias',
    delta: 'Variación',
    note: 'Nota',
    linkedOrders: 'Pedidos relacionados',
    stockMovements: 'Movimientos de stock',
    movementType: 'Tipo',
    balanceAfter: 'Saldo posterior',
    reference: 'Referencia',
    noLinked: 'Sin registros relacionados',
    orderCount: 'Pedidos',
    productLinked: 'Vinculado a pedidos, no se puede eliminar',
    SHIPPED: 'Enviado',
    PROCESSING: 'En preparación',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    PENDING_MANUAL_APPROVAL: 'Pendiente de revisión',
    APPROVED_MANUALLY: 'Aprobado manualmente',
    REJECTED: 'Rechazado',
    ORDER_QUERY: 'Consulta de pedido',
    PRODUCT_INQUIRY: 'Consulta de producto',
    REFUND: 'Solicitud de reembolso',
    COMPLAINT: 'Queja',
    OTHER: 'Otro'
  }
}

const api = axios.create({ baseURL: '/api' })
// A fresh key per submission keeps server retries safe.
api.interceptors.request.use(config => {
  config.headers['Idempotency-Key'] =
    config.headers['Idempotency-Key'] ||
    (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
  return config
})
// Unwrap the standard API envelope.
api.interceptors.response.use(response => {
  const envelope = response.data
  if (envelope && typeof envelope === 'object' && 'status' in envelope && 'data' in envelope) {
    if (envelope.status === 'error')
      return Promise.reject(new Error(envelope.message || '请求失败'))
    response.data = envelope.data
  }
  return response
})

export default {
  data: () => ({
    locale: localStorage.getItem('order-ai-locale') || 'zh',
    page: 'dashboard',
    menu: [
      { id: 'dashboard', label: '工作台' },
      { id: 'orders', label: '订单管理' },
      { id: 'shipments', label: '物流管理' },
      { id: 'refunds', label: '退款管理' },
      { id: 'inventory', label: '库存管理' },
      { id: 'inquiries', label: '客户咨询管理' }
    ],
    showForm: false,
    editing: false,
    originalKey: '',
    editor: {},
    orderStatuses: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    inquiryCategories: ['ORDER_QUERY', 'PRODUCT_INQUIRY', 'REFUND', 'COMPLAINT', 'OTHER'],
    refundTypes: ['REFUND_ONLY', 'RETURN_AND_REFUND'],
    carriers: [
      'SF Express',
      'ZTO Express',
      'YTO Express',
      'STO Express',
      'Yunda Express',
      'JD Logistics',
      'EMS',
      'DHL',
      'UPS',
      'FedEx'
    ],
    // Mirrors the server-side parcel rules so the dropdown never offers an illegal jump.
    shipmentTransitions: {
      CREATED: ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'CANCELLED'],
      PICKED_UP: ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION'],
      IN_TRANSIT: ['IN_TRANSIT', 'DELIVERED', 'EXCEPTION'],
      EXCEPTION: ['EXCEPTION', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
      DELIVERED: ['DELIVERED'],
      CANCELLED: ['CANCELLED']
    },
    filters: {
      order_number: '',
      customer_id: '',
      status: '',
      tracking_number: '',
      carrier: '',
      created_from: '',
      created_to: '',
      id: '',
      sku: '',
      name: '',
      min_stock: '',
      max_stock: '',
      min_price: '',
      max_price: '',
      customer_email: '',
      subject: '',
      category: ''
    },
    rows: [],
    pageNumber: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: 10,
    // dropdown options and linked records
    customers: [],
    productOptions: [],
    orderOptions: [],
    orderDetail: null,
    refundDetail: null,
    linkedOrders: [],
    movements: [],
    shipmentDetail: null,
    shipmentFrom: '',
    shipmentLines: [],
    showReceive: false,
    receiveLines: [],
    receiveRefundId: null,
    health: false,
    busy: false,
    error: '',
    email: '',
    customer: null,
    newCustomer: { name: '', email: '' },
    customerCreated: false,
    orders: [],
    sku: '',
    product: null,
    inquiryResult: null,
    form: { customer_email: '', subject: '', body: '' },
    refund: { order_number: '' }
  }),
  watch: {
    locale(value) {
      localStorage.setItem('order-ai-locale', value)
    }
  },
  mounted() {
    api
      .get('/health')
      .then(() => {
        this.health = true
      })
      .catch(() => {})
    this.loadOptions()
  },
  computed: {
    columns() {
      return (
        {
          orders: ['order_number', 'customer_id', 'status', 'tracking_number', 'created_at'],
          shipments: [
            'id',
            'order_number',
            'carrier',
            'tracking_number',
            'status',
            'shipped_at',
            'delivered_at'
          ],
          refunds: ['id', 'order_number', 'status', 'refund_type', 'amount', 'created_at'],
          inventory: ['sku', 'name', 'stock', 'price', 'order_count'],
          inquiries: ['id', 'customer_email', 'subject', 'category', 'created_at']
        }[this.page] || []
      )
    },
    filteredRows() {
      return this.rows
    },
    // Only an order that is still processing has units waiting in the warehouse; a fully shipped
    // order is out the door. Editing keeps the parcel's own order visible even if it moved on.
    shippableOrders() {
      return this.optionsWithCurrent(this.orderOptions, o => o.status === 'PROCESSING')
    },
    // A refund needs an order that was not cancelled; processing, shipped and delivered all qualify.
    refundableOrders() {
      return this.optionsWithCurrent(this.orderOptions, o =>
        ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)
      )
    },
    shipmentStatusOptions() {
      return this.shipmentTransitions[this.shipmentFrom] || Object.keys(this.shipmentTransitions)
    },
    orderedTotal() {
      return (this.orderDetail?.items || []).reduce((n, i) => n + (i.quantity || 0), 0)
    },
    shippedTotal() {
      return (this.orderDetail?.items || []).reduce((n, i) => n + (i.shipped_quantity || 0), 0)
    },
    filterFields() {
      return (
        {
          orders: [
            { key: 'order_number' },
            { key: 'customer_id', type: 'number', min: 1, step: 1 },
            { key: 'status', options: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
            { key: 'created_from', type: 'datetime-local' },
            { key: 'created_to', type: 'datetime-local' }
          ],
          shipments: [
            { key: 'order_number' },
            { key: 'tracking_number' },
            { key: 'carrier' },
            {
              key: 'status',
              options: ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'CANCELLED']
            },
            { key: 'created_from', type: 'datetime-local' },
            { key: 'created_to', type: 'datetime-local' }
          ],
          refunds: [
            { key: 'id', type: 'number', min: 1, step: 1 },
            { key: 'order_number' },
            {
              key: 'status',
              options: ['PENDING_MANUAL_APPROVAL', 'APPROVED_MANUALLY', 'REJECTED']
            },
            { key: 'created_from', type: 'datetime-local' },
            { key: 'created_to', type: 'datetime-local' }
          ],
          inventory: [
            { key: 'sku' },
            { key: 'name' },
            { key: 'min_stock', type: 'number', min: 0, step: 1 },
            { key: 'max_stock', type: 'number', min: 0, step: 1 },
            { key: 'min_price', type: 'number', min: 0, step: 0.01 },
            { key: 'max_price', type: 'number', min: 0, step: 0.01 }
          ],
          inquiries: [
            { key: 'customer_email' },
            { key: 'subject' },
            {
              key: 'category',
              options: ['ORDER_QUERY', 'PRODUCT_INQUIRY', 'REFUND', 'COMPLAINT', 'OTHER']
            },
            { key: 'created_from', type: 'datetime-local' },
            { key: 'created_to', type: 'datetime-local' }
          ]
        }[this.page] || []
      )
    }
  },
  methods: {
    cell(row, key) {
      if (key === 'status' || key === 'category' || key === 'refund_type')
        return this.t(row[key] || '')
      if (key === 'created_at' || key === 'shipped_at' || key === 'delivered_at')
        return this.formatTime(row[key])
      return row[key] === null || row[key] === undefined ? '—' : row[key]
    },
    t(key) {
      return managementMessages[this.locale]?.[key] || messages[this.locale][key] || key
    },
    async run(fn) {
      this.error = ''
      this.busy = true
      try {
        await fn()
      } catch (e) {
        this.error = e.response?.data?.detail || e.message || this.t('requestFailed')
      } finally {
        this.busy = false
      }
    },
    selectedProduct(sku) {
      return this.productOptions.find(p => p.sku === sku)
    },
    openPage(id) {
      this.page = id
      this.pageNumber = 0
      Object.keys(this.filters).forEach(k => {
        this.filters[k] = ''
      })
      if (id !== 'dashboard') this.loadPage(0)
    },

    // Keeps the already selected order visible while editing, even if its status has moved on.
    optionsWithCurrent(list, predicate) {
      const allowed = list.filter(predicate)
      if (
        this.editing &&
        this.editor.order_number &&
        !allowed.some(o => o.order_number === this.editor.order_number)
      ) {
        const current = list.find(o => o.order_number === this.editor.order_number)
        if (current) return [current, ...allowed]
      }
      return allowed
    },

    async loadOptions() {
      try {
        const [c, p, o] = await Promise.all([
          api.get('/customers', { params: { limit: 200 } }),
          api.get('/products', { params: { size: 200 } }),
          api.get('/orders', { params: { size: 200 } })
        ])
        this.customers = c.data || []
        this.productOptions = p.data?.content || []
        this.orderOptions = o.data?.content || []
      } catch (e) {
        /* dropdowns stay empty; the action reports the real error */
      }
    },

    closeForm() {
      this.showForm = false
      this.error = ''
    },
    addItemLine() {
      this.editor.items.push({ sku: '', quantity: 1 })
    },
    removeItemLine(index) {
      if (this.editor.items.length > 1) this.editor.items.splice(index, 1)
    },

    beginCreate() {
      this.editing = false
      this.originalKey = ''
      this.orderDetail = null
      this.refundDetail = null
      this.linkedOrders = []
      this.movements = []
      this.shipmentDetail = null
      this.shipmentLines = []
      this.shipmentFrom = 'CREATED'
      if (this.page === 'orders')
        this.editor = {
          order_number: '',
          customer_id: '',
          items: [{ sku: '', quantity: 1 }],
          tracking_number: ''
        }
      else if (this.page === 'shipments')
        this.editor = {
          order_number: '',
          carrier: '',
          tracking_number: '',
          estimated_delivery: '',
          receiver_name: '',
          note: '',
          location: '',
          description: '',
          status: 'CREATED'
        }
      else if (this.page === 'inventory')
        this.editor = { sku: '', name: '', stock: 0, price: 0, delta: 0, note: '' }
      else if (this.page === 'inquiries')
        this.editor = { customer_email: '', subject: '', body: '', category: 'OTHER' }
      else
        this.editor = {
          order_number: '',
          reason: '',
          amount: 0,
          refund_type: 'REFUND_ONLY',
          return_items: []
        }
      this.showForm = true
      this.loadOptions()
    },

    beginEdit(row) {
      this.editing = true
      this.showForm = true
      this.error = ''
      this.orderDetail = null
      this.refundDetail = null
      this.linkedOrders = []
      this.movements = []
      this.shipmentDetail = null
      this.shipmentLines = []
      this.loadOptions()
      if (this.page === 'orders') {
        this.originalKey = row.order_number
        this.editor = {
          order_number: row.order_number,
          customer_id: row.customer_id,
          status: row.status,
          tracking_number: row.tracking_number || ''
        }
        this.loadOrderDetail(row.order_number)
      } else if (this.page === 'shipments') {
        this.originalKey = row.id
        this.shipmentFrom = row.status
        this.editor = {
          order_number: row.order_number,
          carrier: row.carrier,
          tracking_number: row.tracking_number,
          status: row.status,
          estimated_delivery: row.estimated_delivery || '',
          receiver_name: row.receiver_name || '',
          note: '',
          location: '',
          description: ''
        }
        this.loadShipmentDetail(row.id)
        this.loadOrderDetail(row.order_number)
      } else if (this.page === 'inventory') {
        this.originalKey = row.sku
        this.editor = {
          sku: row.sku,
          name: row.name,
          stock: row.stock,
          price: row.price,
          delta: 0,
          note: ''
        }
        this.loadProductRelations(row.sku)
      } else if (this.page === 'inquiries') {
        this.originalKey = row.id
        this.editor = {
          customer_email: row.customer_email,
          subject: row.subject,
          body: row.body || '',
          category: row.category
        }
      } else {
        this.originalKey = row.id
        this.editor = {
          order_number: row.order_number,
          reason: row.reason,
          amount: row.amount,
          refund_type: row.refund_type,
          return_items: []
        }
        api
          .get(`/refund-requests/${row.id}`)
          .then(r => {
            this.refundDetail = r.data
          })
          .catch(() => {})
      }
    },

    async loadOrderDetail(number) {
      if (!number) {
        this.orderDetail = null
        return
      }
      try {
        this.orderDetail = (await api.get(`/orders/${encodeURIComponent(number)}`)).data
      } catch (e) {
        this.orderDetail = null
      }
    },
    async loadShipmentDetail(id) {
      try {
        this.shipmentDetail = (await api.get(`/shipments/${id}`)).data
        this.editor.note = this.shipmentDetail.note || ''
        this.editor.receiver_name = this.shipmentDetail.receiver_name || ''
      } catch (e) {
        this.shipmentDetail = null
      }
    },
    // A new parcel defaults to shipping every unit that is still on the shelf for this order.
    async onShipmentOrderChange() {
      await this.loadOrderDetail(this.editor.order_number)
      this.shipmentLines = (this.orderDetail?.items || [])
        .map(i => {
          const remaining = Math.max(0, i.quantity - (i.shipped_quantity || 0))
          return { id: i.id, sku: i.sku, name: i.name, remaining, quantity: remaining }
        })
        .filter(line => line.remaining > 0)
    },
    formatTime(value) {
      return value ? String(value).replace('T', ' ').slice(0, 16) : '—'
    },
    async loadProductRelations(sku) {
      try {
        const [o, m] = await Promise.all([
          api.get(`/products/${encodeURIComponent(sku)}/orders`, { params: { limit: 10 } }),
          api.get(`/products/${encodeURIComponent(sku)}/stock-movements`, { params: { limit: 10 } })
        ])
        this.linkedOrders = o.data || []
        this.movements = m.data || []
      } catch (e) {
        this.linkedOrders = []
        this.movements = []
      }
    },

    async onRefundOrderChange() {
      await this.loadOrderDetail(this.editor.order_number)
      this.editor.amount = this.orderDetail?.refundable_amount ?? 0
      this.editor.return_items = (this.orderDetail?.items || []).map(i => ({
        orderItemId: i.id,
        sku: i.sku,
        name: i.name,
        max: i.quantity,
        quantity: 0
      }))
      this.onRefundTypeChange()
    },
    onRefundTypeChange() {
      const returning = this.editor.refund_type === 'RETURN_AND_REFUND'
      this.editor.return_items.forEach(r => {
        r.quantity = returning && !r.quantity ? 1 : 0
      })
    },
    openRefundFor(number) {
      this.page = 'refunds'
      this.pageNumber = 0
      this.loadPage(0)
      this.beginCreate()
      this.editor.order_number = number
      this.onRefundOrderChange()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    saveManagement() {
      return this.run(async () => {
        const path = {
          orders: '/orders',
          shipments: '/shipments',
          inventory: '/products',
          inquiries: '/inquiries',
          refunds: '/refund-requests'
        }[this.page]
        const key = encodeURIComponent(this.originalKey)
        if (this.page === 'orders') {
          if (this.editing)
            await api.put(`${path}/${key}`, {
              status: this.editor.status,
              tracking_number: this.editor.tracking_number
            })
          else
            await api.post(path, {
              order_number: this.editor.order_number,
              customer_id: this.editor.customer_id,
              items: this.editor.items.map(i => ({ sku: i.sku, quantity: Number(i.quantity) })),
              tracking_number: this.editor.tracking_number || null
            })
        } else if (this.page === 'shipments') {
          if (this.editing) {
            await api.put(`${path}/${key}`, {
              carrier: this.editor.carrier,
              tracking_number: this.editor.tracking_number,
              status: this.editor.status,
              estimated_delivery: this.editor.estimated_delivery || null,
              receiver_name: this.editor.receiver_name || null,
              note: this.editor.note || null,
              location: this.editor.location || null,
              description: this.editor.description || null
            })
          } else {
            if (!this.editor.order_number) throw new Error(this.t('selectOrder'))
            if (this.orderDetail && !this.shipmentLines.length)
              throw new Error(this.t('nothingToShip'))
            const lines = this.shipmentLines.filter(line => Number(line.quantity) > 0)
            if (this.shipmentLines.length && !lines.length)
              throw new Error(this.t('needShipmentItems'))
            await api.post(path, {
              order_number: this.editor.order_number,
              carrier: this.editor.carrier,
              tracking_number: this.editor.tracking_number,
              estimated_delivery: this.editor.estimated_delivery || null,
              receiver_name: this.editor.receiver_name || null,
              note: this.editor.note || null,
              items: lines.length
                ? lines.map(line => ({ order_item_id: line.id, quantity: Number(line.quantity) }))
                : undefined
            })
          }
        } else if (this.page === 'inventory') {
          if (this.editing) {
            await api.put(`${path}/${key}`, {
              sku: this.editor.sku,
              name: this.editor.name,
              stock: this.editor.stock,
              price: this.editor.price
            })
            const delta = Number(this.editor.delta || 0)
            if (delta !== 0)
              await api.post(`${path}/${key}/stock-adjustments`, {
                delta,
                note: this.editor.note || 'Manual adjustment from workbench'
              })
          } else
            await api.post(path, {
              sku: this.editor.sku,
              name: this.editor.name,
              stock: Number(this.editor.stock),
              price: this.editor.price
            })
        } else if (this.page === 'inquiries') {
          if (this.editing) await api.put(`${path}/${key}`, this.editor)
          else
            await api.post(path, {
              customer_email: this.editor.customer_email,
              subject: this.editor.subject,
              body: this.editor.body
            })
        } else {
          if (this.editing) await api.put(`${path}/${key}`, { reason: this.editor.reason })
          else
            await api.post(path, {
              order_number: this.editor.order_number,
              reason: this.editor.reason,
              amount: Number(this.editor.amount),
              refund_type: this.editor.refund_type,
              return_items:
                this.editor.refund_type === 'RETURN_AND_REFUND'
                  ? this.editor.return_items
                      .filter(r => Number(r.quantity) > 0)
                      .map(r => ({ order_item_id: r.orderItemId, quantity: Number(r.quantity) }))
                  : undefined
            })
        }
        this.closeForm()
        await this.loadOptions()
        await this.loadPage(this.pageNumber)
      })
    },

    searchPage() {
      this.loadPage(0)
    },
    changePageSize() {
      this.loadPage(0)
    },
    resetFilters() {
      Object.keys(this.filters).forEach(k => {
        this.filters[k] = ''
      })
      this.loadPage(0)
    },
    loadPage(n) {
      return this.run(async () => {
        const path = {
          orders: '/orders',
          shipments: '/shipments',
          refunds: '/refund-requests',
          inventory: '/products',
          inquiries: '/inquiries'
        }[this.page]
        const params = { page: n, size: this.pageSize }
        Object.entries(this.filters).forEach(([k, v]) => {
          if (v !== '' && v !== null) params[k] = v
        })
        const result = (await api.get(path, { params })).data
        this.rows = result.content || []
        this.pageNumber = result.number || 0
        this.totalPages = result.totalPages || 0
        this.totalElements = result.totalElements || 0
      })
    },
    cancelOrder(row) {
      if (!window.confirm(this.t('confirmCancelOrder'))) return
      return this.run(async () => {
        await api.put(`/orders/${encodeURIComponent(row.order_number)}`, { status: 'CANCELLED' })
        await this.loadPage(this.pageNumber)
      })
    },
    removeRow(row) {
      // The server refuses this too, but an inventory row already carries the reference count.
      if (this.page === 'inventory' && row.order_count > 0) {
        this.error = this.t('productLinked')
        return
      }
      if (!window.confirm(this.t('confirmDelete'))) return
      return this.run(async () => {
        const key =
          this.page === 'orders' ? row.order_number : this.page === 'inventory' ? row.sku : row.id
        const path = {
          orders: '/orders',
          shipments: '/shipments',
          refunds: '/refund-requests',
          inventory: '/products',
          inquiries: '/inquiries'
        }[this.page]
        await api.delete(`${path}/${encodeURIComponent(key)}`)
        await this.loadPage(this.pageNumber)
        if (!this.rows.length && this.pageNumber > 0) await this.loadPage(this.pageNumber - 1)
      })
    },
    approveRefund(id) {
      if (!window.confirm(this.t('confirmApprove'))) return
      return this.run(async () => {
        await api.post(`/refund-requests/${id}/approve`)
        await this.loadPage(this.pageNumber)
      })
    },
    rejectRefund(id) {
      if (!window.confirm(this.t('confirmReject'))) return
      return this.run(async () => {
        await api.post(`/refund-requests/${id}/reject`)
        await this.loadPage(this.pageNumber)
      })
    },
    openReceive(row) {
      this.receiveRefundId = row.id
      api
        .get(`/refund-requests/${row.id}`)
        .then(r => {
          this.receiveLines = (r.data.return_items || []).map(i => ({
            ...i,
            max: i.quantity - i.accepted_quantity,
            accepted_quantity: i.quantity - i.accepted_quantity
          }))
          this.showReceive = true
        })
        .catch(e => {
          this.error = e.message
        })
    },
    confirmReceive() {
      return this.run(async () => {
        await api.post(`/refund-requests/${this.receiveRefundId}/receive`, {
          items: this.receiveLines.map(l => ({
            order_item_id: l.order_item_id,
            accepted_quantity: Number(l.accepted_quantity)
          }))
        })
        this.showReceive = false
        await this.loadPage(this.pageNumber)
      })
    },

    classify() {
      return this.run(async () => {
        this.inquiryResult = (await api.post('/inquiries', this.form)).data
      })
    },
    lookupCustomer() {
      return this.run(async () => {
        this.customerCreated = false
        this.customer = null
        this.orders = []
        try {
          this.customer = (
            await api.get(`/customers/by-email/${encodeURIComponent(this.email)}`)
          ).data
          this.orders = (
            await api.get(`/customers/by-email/${encodeURIComponent(this.email)}/orders`)
          ).data
        } catch (e) {
          if (e.message === 'Customer not found') throw new Error(this.t('customerNotFound'))
          throw e
        }
      })
    },
    createCustomer() {
      return this.run(async () => {
        try {
          const saved = (await api.post('/customers', this.newCustomer)).data
          this.customer = saved
          this.email = saved.email
          this.orders = []
          this.customerCreated = true
          this.newCustomer = { name: '', email: '' }
          this.loadOptions()
        } catch (e) {
          if (e.response?.status === 409) throw new Error(this.t('customerAlreadyExists'))
          throw e
        }
      })
    },
    lookupProduct() {
      return this.run(async () => {
        this.product = (await api.get(`/products/${encodeURIComponent(this.sku)}`)).data
      })
    }
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: #f3f5f8;
  color: #172033;
  font: 15px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.shell {
  max-width: 1180px;
  margin: auto;
  padding: 40px 28px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.language-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #536174;
}
.language-label select {
  padding: 8px;
  border: 1px solid #dce1e9;
  border-radius: 8px;
  background: white;
  color: #172033;
  font: inherit;
}
header small {
  letter-spacing: 0.13em;
  color: #718096;
  font-weight: 700;
}
h1 {
  font-size: 32px;
  margin: 6px 0 0;
}
header p,
.muted {
  color: #788397;
  margin: 4px 0 16px;
}
.status {
  background: #fff;
  padding: 9px 14px;
  border-radius: 30px;
  color: #536174;
}
.status i {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #30b77a;
  border-radius: 50%;
  margin-right: 7px;
}
.menu {
  display: flex;
  gap: 8px;
  overflow: auto;
  margin: 0 0 20px;
  padding: 5px 0;
}
.menu button {
  white-space: nowrap;
  background: #e7ebf3;
  color: #536174;
}
.menu button.active {
  background: #325fcb;
  color: white;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.card {
  background: white;
  border: 1px solid #e7eaf0;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 4px 16px #1c31500a;
}
.card h2 {
  font-size: 19px;
  margin: 0 0 5px;
}
.management {
  min-height: 300px;
}
.inquiry {
  grid-row: span 2;
}
label {
  display: block;
  font-size: 13px;
  font-weight: 650;
  margin: 14px 0;
  color: #48556b;
}
input,
textarea,
select {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 11px 12px;
  border: 1px solid #dce1e9;
  border-radius: 8px;
  font: inherit;
  background: #fff;
  color: #172033;
}
input:focus,
textarea:focus,
select:focus {
  outline: 2px solid #bcd1ff;
  border-color: #5c86e8;
}
.row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.row input {
  margin: 0;
}
button {
  border: 0;
  border-radius: 8px;
  background: #325fcb;
  color: white;
  padding: 11px 16px;
  font-weight: 650;
  cursor: pointer;
}
button:disabled {
  opacity: 0.55;
}
.secondary {
  background: #eaf0ff;
  color: #315bb5;
}
.warm {
  background: #bd6b2a;
}
.result,
.order {
  margin-top: 14px;
  padding: 14px;
  background: #f7f9fc;
  border-radius: 9px;
}
.table-wrap {
  overflow-x: auto;
  margin-top: 18px;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;
  background: #fff;
}
th,
td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid #e7eaf0;
  vertical-align: top;
}
th {
  background: #f7f9fc;
  color: #536174;
  font-size: 13px;
}
td {
  font-size: 14px;
}
.management-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.management-heading h2 {
  margin: 0;
}
.action-cell {
  white-space: nowrap;
}
.filters {
  display: flex;
  align-items: end;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.filters label {
  min-width: 150px;
  margin: 0;
}
.filters input,
.filters select {
  margin-top: 4px;
  padding: 9px;
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}
.pagination label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}
.pagination select {
  padding: 8px;
  border: 1px solid #dce1e9;
  border-radius: 8px;
  background: white;
  width: auto;
}
.pagination span {
  color: #536174;
  font-size: 14px;
}
.empty {
  text-align: center;
  color: #788397;
  padding: 28px;
}
.danger {
  background: #fae9e9;
  color: #a63838;
  padding: 7px 10px;
}
.customer-form {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e7eaf0;
}
.customer-form h3 {
  margin: 0;
  color: #35445c;
  font-size: 15px;
}
.tag {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 30px;
  background: #e4edff;
  color: #345cb4;
  font-size: 12px;
  font-weight: 700;
}
.pending {
  background: #fff1da;
  color: #99611e;
}
.order span {
  float: right;
  color: #4167bc;
}
.order div {
  color: #66748a;
  font-size: 13px;
}
.link {
  background: transparent;
  color: #315bb5;
  padding: 5px 0;
}
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #9e2c32;
  color: white;
  padding: 14px 20px;
  border-radius: 9px;
  z-index: 100;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #0f172a80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 50;
}
.modal {
  background: #fff;
  border-radius: 14px;
  width: min(760px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 60px #0f172a40;
}
.modal.small {
  width: min(480px, 100%);
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 22px;
  border-bottom: 1px solid #e7eaf0;
}
.modal-head h3 {
  margin: 0;
  font-size: 18px;
}
.modal-body {
  padding: 4px 22px 18px;
  overflow: auto;
}
.modal-foot {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 22px;
  border-top: 1px solid #e7eaf0;
}
.icon {
  background: transparent;
  color: #536174;
  font-size: 26px;
  padding: 0 6px;
  line-height: 1;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #35445c;
  margin: 18px 0 6px;
  padding-top: 12px;
  border-top: 1px solid #e7eaf0;
}
.hint {
  color: #788397;
  font-size: 13px;
  margin: 6px 0;
}
.readonly {
  color: #536174;
  font-size: 14px;
  margin: 10px 0;
}
.item-line {
  display: flex;
  gap: 10px;
  align-items: end;
  margin: 10px 0;
  padding: 12px;
  background: #f7f9fc;
  border-radius: 9px;
  flex-wrap: wrap;
}
.item-line label {
  flex: 1;
  min-width: 180px;
  margin: 0;
}
.item-line .qty {
  width: 110px;
  flex: none;
}
.item-line .line-name {
  flex: 1;
  min-width: 180px;
  font-size: 14px;
}
.mini-table {
  width: 100%;
  min-width: 0;
  margin: 8px 0;
  font-size: 13px;
}
.mini-table th,
.mini-table td {
  padding: 8px;
}

@media (max-width: 720px) {
  .shell {
    padding: 24px 14px;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .inquiry {
    grid-row: auto;
  }
  header {
    align-items: flex-start;
    gap: 10px;
    flex-direction: column;
  }
  .header-actions {
    flex-wrap: wrap;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
