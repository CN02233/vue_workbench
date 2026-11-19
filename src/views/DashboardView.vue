<template>
  <!-- EN: Dashboard view: inquiry, customer orders, stock lookup and refund shortcut. -->
  <!-- 中文：工作台视图：咨询处理、客户订单、库存查询与退款快捷入口。 -->
  <!-- EN: Root keeps the original .grid class so the global stylesheet renders identically. -->
  <!-- 中文：根节点保留原有 .grid class，使全局样式表渲染效果完全一致。 -->
  <section class="grid">
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
        <button class="link" @click="requestRefund(o.order_number)">
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
        @click="requestRefund(refund.order_number)"
      >
        {{ t('requestRefund') }}
      </button>
    </article>
  </section>
</template>

<script>
// EN: Dashboard presentation and data flow. State lives here; App.vue keeps application globals.
// 中文：工作台展示与数据流。状态归属本组件；App.vue 保留应用级全局状态。
// EN: API definitions stay in the existing api/services modules; no endpoints are redefined here.
// 中文：API 定义仍复用既有 api/services 模块；此处不重新定义任何接口。
import { translate } from '../i18n'
import { submitInquiry } from '../services/inquiryService'
import * as customers from '../api/customer'
import * as products from '../api/product'

export default {
  name: 'DashboardView',
  props: {
    // EN: Locale is owned by App.vue; the view only translates its own strings.
    // 中文：语言归 App.vue 所有；本视图仅用于翻译自身文案。
    locale: { type: String, default: 'zh' },
    // EN: Global busy flag, passed down to disable the same buttons as before.
    // 中文：全局忙碌标记，向下传递以禁用与原来相同的按钮。
    busy: { type: Boolean, default: false },
    // EN: Derived from App.vue's global order options and editing state; never mutated here.
    // 中文：由 App.vue 的全局订单选项与编辑状态推导；此处绝不修改。
    refundableOrders: { type: Array, default: () => [] }
  },
  data: () => ({
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
  methods: {
    // EN: Same fallback as App.vue so missing keys still render as the key itself.
    // 中文：与 App.vue 相同的回退策略，缺失的 key 仍原样显示。
    t(key) {
      return translate(this.locale, key)
    },

    // EN: Loading/error handling reports to App.vue so global state stays single-sourced.
    // 中文：加载与错误处理上报 App.vue，保证全局状态只有一份。
    async run(fn) {
      this.$emit('feedback', { busy: true, error: '' })
      try {
        await fn()
      } catch (e) {
        this.$emit('feedback', {
          error: e.response?.data?.detail || e.message || this.t('requestFailed')
        })
      } finally {
        this.$emit('feedback', { busy: false })
      }
    },

    classify() {
      return this.run(async () => {
        this.inquiryResult = (await submitInquiry(this.form)).data
      })
    },
    lookupCustomer() {
      return this.run(async () => {
        this.customerCreated = false
        this.customer = null
        this.orders = []
        try {
          this.customer = (await customers.getCustomerByEmail(this.email)).data
          this.orders = (await customers.getCustomerOrders(this.email)).data
        } catch (e) {
          if (e.message === 'Customer not found') throw new Error(this.t('customerNotFound'))
          throw e
        }
      })
    },
    createCustomer() {
      return this.run(async () => {
        try {
          const saved = (await customers.createCustomer(this.newCustomer)).data
          this.customer = saved
          this.email = saved.email
          this.orders = []
          this.customerCreated = true
          this.newCustomer = { name: '', email: '' }
          // EN: App.vue refreshes the shared dropdown options; no duplicate request here.
          // 中文：由 App.vue 刷新共享下拉选项；此处不重复发起请求。
          this.$emit('options-changed')
        } catch (e) {
          if (e.response?.status === 409) throw new Error(this.t('customerAlreadyExists'))
          throw e
        }
      })
    },
    lookupProduct() {
      return this.run(async () => {
        this.product = (await products.getProduct(this.sku)).data
      })
    },

    // EN: Navigation belongs to App.vue; the view only reports which order was chosen.
    // 中文：导航归 App.vue；本视图只上报所选订单。
    requestRefund(number) {
      this.$emit('open-refund', number)
    }
  }
}
</script>
