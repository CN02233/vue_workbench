<template>
  <main class="shell">
    <!-- EN: Header/navigation shells are reusable components; state stays in App.vue. -->
    <!-- 中文：头部与导航外壳已提取为可复用组件；状态仍保留在 App.vue。 -->
    <AppHeader :locale="locale" :health="health" @change-locale="setLocale" />
    <AppNavigation :menu="menu" :page="page" :locale="locale" @navigate="openPage" />

    <!-- EN: v-show keeps the Dashboard instance (and its local state) alive across page switches. -->
    <!-- 中文：v-show 让工作台实例及其局部状态在页面切换时保持存活，不被销毁。 -->
    <DashboardView
      v-show="page === 'dashboard'"
      :locale="locale"
      :busy="busy"
      :refundable-orders="refundableOrders"
      @feedback="setFeedback"
      @options-changed="loadOptions"
      @open-refund="openRefundFor"
    />

    <!-- EN: Inquiries has its own view; the generic management section handles the other pages. -->
    <!-- 中文：咨询页使用独立视图；通用管理区只负责其余管理页面。 -->
    <InquiriesView
      v-if="page === 'inquiries'"
      :locale="locale"
      :rows="filteredRows"
      :columns="columns"
      :filters="filters"
      :filter-fields="filterFields"
      :page-number="pageNumber"
      :page-size="pageSize"
      :total-pages="totalPages"
      :total-elements="totalElements"
      @update-filter="setFilterValue"
      @search="searchPage"
      @reset="resetFilters"
      @page="loadPage"
      @page-size="setPageSize"
      @create="beginCreate"
      @edit="beginEdit"
      @delete="removeRow"
    />

    <!-- EN: Inventory has its own view; stock edit modal and all business logic stay in App.vue. -->
    <!-- 中文：库存页使用独立视图；库存编辑弹窗与全部业务逻辑仍留在 App.vue。 -->
    <InventoryView
      v-if="page === 'inventory'"
      :locale="locale"
      :rows="filteredRows"
      :columns="columns"
      :filters="filters"
      :filter-fields="filterFields"
      :page-number="pageNumber"
      :page-size="pageSize"
      :total-pages="totalPages"
      :total-elements="totalElements"
      @update-filter="setFilterValue"
      @search="searchPage"
      @reset="resetFilters"
      @page="loadPage"
      @page-size="setPageSize"
      @create="beginCreate"
      @edit="beginEdit"
      @delete="removeRow"
    />

    <!-- EN: Orders has its own view; order detail/edit modal and all business logic stay in App.vue. -->
    <!-- 中文：订单页使用独立视图；订单详情/编辑弹窗与全部业务逻辑仍留在 App.vue。 -->
    <OrdersView
      v-if="page === 'orders'"
      :locale="locale"
      :rows="filteredRows"
      :columns="columns"
      :filters="filters"
      :filter-fields="filterFields"
      :page-number="pageNumber"
      :page-size="pageSize"
      :total-pages="totalPages"
      :total-elements="totalElements"
      @update-filter="setFilterValue"
      @search="searchPage"
      @reset="resetFilters"
      @page="loadPage"
      @page-size="setPageSize"
      @create="beginCreate"
      @edit="beginEdit"
      @cancel="cancelOrder"
      @delete="removeRow"
    />

    <!-- EN: Shipments has its own view; detail/edit modal and workflows stay in App.vue. -->
    <!-- 中文：物流页使用独立视图；详情/编辑弹窗与工作流仍留在 App.vue。 -->
    <ShipmentsView
      v-if="page === 'shipments'"
      :locale="locale"
      :rows="filteredRows"
      :columns="columns"
      :filters="filters"
      :filter-fields="filterFields"
      :page-number="pageNumber"
      :page-size="pageSize"
      :total-pages="totalPages"
      :total-elements="totalElements"
      @update-filter="setFilterValue"
      @search="searchPage"
      @reset="resetFilters"
      @page="loadPage"
      @page-size="setPageSize"
      @create="beginCreate"
      @edit="beginEdit"
      @delete="removeRow"
    />

    <!-- EN: Refunds has its own view; create/edit/receive modals and all workflows stay in App.vue. -->
    <!-- 中文：退款页使用独立视图；创建/编辑/验收弹窗与全部工作流仍留在 App.vue。 -->
    <!-- EN: approve/reject App methods take an id; the view emits the full row for a consistent interface. -->
    <!-- 中文：App 的审批/拒绝方法接收 id；视图统一发出整行对象以保持接口一致。 -->
    <RefundsView
      v-if="page === 'refunds'"
      :locale="locale"
      :rows="filteredRows"
      :columns="columns"
      :filters="filters"
      :filter-fields="filterFields"
      :page-number="pageNumber"
      :page-size="pageSize"
      :total-pages="totalPages"
      :total-elements="totalElements"
      @update-filter="setFilterValue"
      @search="searchPage"
      @reset="resetFilters"
      @page="loadPage"
      @page-size="setPageSize"
      @create="beginCreate"
      @edit="beginEdit"
      @approve="row => approveRefund(row.id)"
      @reject="row => rejectRefund(row.id)"
      @receive="openReceive"
      @delete="removeRow"
    />

    <!-- EN: Dedicated management modals; App.vue keeps editor state, validation and every API call. -->
    <!-- 中文：独立的管理弹窗；editor 状态、校验与全部 API 调用仍由 App.vue 负责。 -->
    <OrderEditor
      v-if="showForm && page === 'orders'"
      :locale="locale"
      :page="page"
      :busy="busy"
      :editing="editing"
      :editor="editor"
      :customers="customers"
      :product-options="productOptions"
      :order-detail="orderDetail"
      :order-statuses="orderStatuses"
      @close="closeForm"
      @save="saveManagement"
      @add-item="addItemLine"
      @remove-item="removeItemLine"
    />
    <ShipmentEditor
      v-if="showForm && page === 'shipments'"
      :locale="locale"
      :page="page"
      :busy="busy"
      :editing="editing"
      :editor="editor"
      :shippable-orders="shippableOrders"
      :order-detail="orderDetail"
      :shipped-total="shippedTotal"
      :ordered-total="orderedTotal"
      :carriers="carriers"
      :shipment-lines="shipmentLines"
      :shipment-status-options="shipmentStatusOptions"
      :shipment-detail="shipmentDetail"
      @close="closeForm"
      @save="saveManagement"
      @shipment-order-change="onShipmentOrderChange"
    />
    <RefundEditor
      v-if="showForm && page === 'refunds'"
      :locale="locale"
      :page="page"
      :busy="busy"
      :editing="editing"
      :editor="editor"
      :refundable-orders="refundableOrders"
      :order-detail="orderDetail"
      :refund-types="refundTypes"
      :refund-detail="refundDetail"
      @close="closeForm"
      @save="saveManagement"
      @order-change="onRefundOrderChange"
      @refund-type-change="onRefundTypeChange"
    />
    <InventoryEditor
      v-if="showForm && page === 'inventory'"
      :locale="locale"
      :page="page"
      :busy="busy"
      :editing="editing"
      :editor="editor"
      :linked-orders="linkedOrders"
      :movements="movements"
      @close="closeForm"
      @save="saveManagement"
    />
    <InquiryEditor
      v-if="showForm && page === 'inquiries'"
      :locale="locale"
      :page="page"
      :busy="busy"
      :editing="editing"
      :editor="editor"
      :inquiry-categories="inquiryCategories"
      @close="closeForm"
      @save="saveManagement"
    />
    <ReceiveRefundModal
      v-if="showReceive"
      :locale="locale"
      :busy="busy"
      :lines="receiveLines"
      @close="showReceive = false"
      @receive="confirmReceive"
    />

    <GlobalFeedback :error="error" />
  </main>
</template>

<script>
// EN: Imports extracted modules; business behavior stays unchanged while shell markup delegates to common components.
// 中文：引入已提取的模块；业务行为保持不变，外壳模板交由 common 组件渲染。
import { messages } from './i18n'
import { health } from './api/http'
import { pageFromRoute } from './utils/routes'
import * as orders from './api/order'
import * as shipments from './api/shipment'
import * as refunds from './api/refund'
import * as products from './api/product'
import * as customers from './api/customer'
import * as resources from './api/resources'
import { formatTime as formatTimeValue } from './utils/format'
// EN: Application shell components and the extracted Dashboard view.
// 中文：应用外壳组件与已提取的工作台视图。
import AppHeader from './components/common/AppHeader.vue'
import AppNavigation from './components/common/AppNavigation.vue'
import GlobalFeedback from './components/common/GlobalFeedback.vue'
import DashboardView from './views/DashboardView.vue'
import InquiriesView from './views/InquiriesView.vue'
import InventoryView from './views/InventoryView.vue'
import OrdersView from './views/OrdersView.vue'
import ShipmentsView from './views/ShipmentsView.vue'
import RefundsView from './views/RefundsView.vue'
// EN: Management modals are presentation-only; App.vue still owns editor data and API calls.
// 中文：管理弹窗只负责展示；editor 数据与 API 调用仍归 App.vue 所有。
import OrderEditor from './components/management/OrderEditor.vue'
import ShipmentEditor from './components/management/ShipmentEditor.vue'
import RefundEditor from './components/management/RefundEditor.vue'
import InventoryEditor from './components/management/InventoryEditor.vue'
import InquiryEditor from './components/management/InquiryEditor.vue'
import ReceiveRefundModal from './components/management/ReceiveRefundModal.vue'
import {
  ORDER_STATUSES,
  INQUIRY_CATEGORIES,
  REFUND_TYPES,
  CARRIERS,
  SHIPMENT_TRANSITIONS,
  MENU_ITEMS
} from './utils/constants'

export default {
  components: {
    AppHeader,
    AppNavigation,
    GlobalFeedback,
    DashboardView,
    InquiriesView,
    InventoryView,
    OrdersView,
    ShipmentsView,
    RefundsView,
    OrderEditor,
    ShipmentEditor,
    RefundEditor,
    InventoryEditor,
    InquiryEditor,
    ReceiveRefundModal
  },
  data: () => ({
    locale: localStorage.getItem('order-ai-locale') || 'zh',
    page: 'dashboard',
    menu: MENU_ITEMS,
    showForm: false,
    editing: false,
    originalKey: '',
    editor: {},
    orderStatuses: ORDER_STATUSES,
    inquiryCategories: INQUIRY_CATEGORIES,
    refundTypes: REFUND_TYPES,
    carriers: CARRIERS,
    // EN: Status rules now live in utils/constants; value and order unchanged.
    // 中文：状态规则已移到 utils/constants；取值与顺序不变。
    shipmentTransitions: SHIPMENT_TRANSITIONS,
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
    error: ''
  }),
  watch: {
    locale(value) {
      localStorage.setItem('order-ai-locale', value)
    },
    // EN: Keep the active page in sync with browser back/forward and direct hash links.
    // 中文：浏览器前进后退或直接访问 hash 链接时，保持当前页面与路由同步。
    $route(to) {
      const target = pageFromRoute(to)
      if (target !== this.page) this.applyPage(target, { navigate: false })
    }
  },
  mounted() {
    // EN: Optional chaining keeps this a no-op in tests that mount App without a router.
    // 中文：可选链确保单测在不挂载 router 的情况下此逻辑为空操作。
    if (this.$route) {
      const target = pageFromRoute(this.$route)
      if (target !== this.page) this.applyPage(target, { navigate: false })
    }
    health()
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
      return messages[this.locale]?.[key] || key
    },
    // EN: Locale stays in App.vue so the existing watcher keeps persisting it to localStorage.
    // 中文：语言状态仍在 App.vue，原有 watcher 继续负责写入 localStorage。
    setLocale(value) {
      this.locale = value
    },
    // EN: DashboardView reports loading/error state here so global state stays in one place.
    // 中文：工作台视图把加载/错误状态上报到这里，保证全局状态仍只有一份。
    setFeedback({ busy, error } = {}) {
      if (busy !== undefined) this.busy = busy
      if (error !== undefined) this.error = error
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
      this.applyPage(id, { navigate: true })
    },

    // EN: Single place that changes pages: resets paging/filters, loads data and updates the URL.
    //     The router is optional so existing unit tests keep their original behavior.
    // 中文：切换页面的统一入口：重置分页/筛选、加载数据并更新 URL。
    //      router 是可选的，因此现有单测行为保持不变。
    applyPage(id, { navigate = true } = {}) {
      this.page = id
      this.pageNumber = 0
      Object.keys(this.filters).forEach(k => {
        this.filters[k] = ''
      })
      if (id !== 'dashboard') this.loadPage(0)
      if (navigate && this.$router && this.$route?.name !== id) {
        this.$router.push({ name: id }).catch(() => {})
      }
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
          customers.getCustomers({ limit: 200 }),
          products.getProducts({ size: 200 }),
          orders.getOrders({ size: 200 })
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
        refunds
          .getRefund(row.id)
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
        this.orderDetail = (await orders.getOrder(number)).data
      } catch (e) {
        this.orderDetail = null
      }
    },
    async loadShipmentDetail(id) {
      try {
        this.shipmentDetail = (await shipments.getShipment(id)).data
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
      return formatTimeValue(value)
    },
    async loadProductRelations(sku) {
      try {
        const [o, m] = await Promise.all([
          products.getProductOrders(sku, { limit: 10 }),
          products.getProductStockMovements(sku, { limit: 10 })
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
      // EN: applyPage already resets paging, filters and loads the refunds list once.
      // 中文：applyPage 已重置分页与筛选，并只加载一次退款列表。
      this.applyPage('refunds', { navigate: true })
      this.beginCreate()
      this.editor.order_number = number
      this.onRefundOrderChange()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    saveManagement() {
      return this.run(async () => {
        const key = this.originalKey
        if (this.page === 'orders') {
          if (this.editing)
            await resources.updateResource(this.page, key, {
              status: this.editor.status,
              tracking_number: this.editor.tracking_number
            })
          else
            await resources.createResource(this.page, {
              order_number: this.editor.order_number,
              customer_id: this.editor.customer_id,
              items: this.editor.items.map(i => ({ sku: i.sku, quantity: Number(i.quantity) })),
              tracking_number: this.editor.tracking_number || null
            })
        } else if (this.page === 'shipments') {
          if (this.editing) {
            await resources.updateResource(this.page, key, {
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
            await resources.createResource(this.page, {
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
            await resources.updateResource(this.page, key, {
              sku: this.editor.sku,
              name: this.editor.name,
              stock: this.editor.stock,
              price: this.editor.price
            })
            const delta = Number(this.editor.delta || 0)
            if (delta !== 0)
              await products.adjustStock(key, {
                delta,
                note: this.editor.note || 'Manual adjustment from workbench'
              })
          } else
            await resources.createResource(this.page, {
              sku: this.editor.sku,
              name: this.editor.name,
              stock: Number(this.editor.stock),
              price: this.editor.price
            })
        } else if (this.page === 'inquiries') {
          if (this.editing) await resources.updateResource(this.page, key, this.editor)
          else
            await resources.createResource(this.page, {
              customer_email: this.editor.customer_email,
              subject: this.editor.subject,
              body: this.editor.body
            })
        } else {
          if (this.editing)
            await resources.updateResource(this.page, key, { reason: this.editor.reason })
          else
            await resources.createResource(this.page, {
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

    // EN: InquiriesView reports filter/page-size changes; state and requests stay in App.vue.
    // 中文：咨询视图只上报筛选与每页条数的变化；状态和请求仍由 App.vue 负责。
    setFilterValue({ key, value }) {
      this.filters[key] = value
    },
    setPageSize(value) {
      this.pageSize = value
      this.changePageSize()
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
        const params = { page: n, size: this.pageSize }
        Object.entries(this.filters).forEach(([k, v]) => {
          if (v !== '' && v !== null) params[k] = v
        })
        const result = (await resources.listResources(this.page, params)).data
        // Paging metadata sits under `page`; older builds returned it flat on the payload.
        const page = result.page || result
        this.rows = result.content || []
        this.pageNumber = page.number || 0
        this.totalPages = page.totalPages || 0
        this.totalElements = page.totalElements || 0
      })
    },
    cancelOrder(row) {
      if (!window.confirm(this.t('confirmCancelOrder'))) return
      return this.run(async () => {
        await orders.updateOrder(row.order_number, { status: 'CANCELLED' })
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
        await resources.deleteResource(this.page, key)
        await this.loadPage(this.pageNumber)
        if (!this.rows.length && this.pageNumber > 0) await this.loadPage(this.pageNumber - 1)
      })
    },
    approveRefund(id) {
      if (!window.confirm(this.t('confirmApprove'))) return
      return this.run(async () => {
        await refunds.approveRefund(id)
        await this.loadPage(this.pageNumber)
      })
    },
    rejectRefund(id) {
      if (!window.confirm(this.t('confirmReject'))) return
      return this.run(async () => {
        await refunds.rejectRefund(id)
        await this.loadPage(this.pageNumber)
      })
    },
    openReceive(row) {
      this.receiveRefundId = row.id
      refunds
        .getRefund(row.id)
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
    // EN: Reject invalid receive quantities before any API call: finite integer, >= 0 and <= the
    //     remaining amount. Inventory return stays on the server; this is UI-side validation only.
    // 中文：调用验收 API 前拦截非法数量：有限整数、不小于 0、且不超过剩余可验收量。
    //     库存回收仍由服务端负责；这里仅做界面侧校验，不改变验收请求结构。
    validReceiveQuantity(line) {
      const raw = line.accepted_quantity
      const q = Number(raw)
      return (
        raw !== '' &&
        raw !== null &&
        raw !== undefined &&
        Number.isFinite(q) &&
        Number.isInteger(q) &&
        q >= 0 &&
        q <= Number(line.max)
      )
    },
    confirmReceive() {
      if (!this.receiveLines.every(line => this.validReceiveQuantity(line))) {
        this.error = this.t('invalidReceiveQuantity')
        return
      }
      return this.run(async () => {
        await refunds.receiveRefund(this.receiveRefundId, {
          items: this.receiveLines.map(l => ({
            order_item_id: l.order_item_id,
            accepted_quantity: Number(l.accepted_quantity)
          }))
        })
        this.showReceive = false
        await this.loadPage(this.pageNumber)
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
