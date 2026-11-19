// EN: Dashboard view tests: rendering, data flow, feedback events and navigation hand-off.
// 中文：工作台视图测试：渲染、数据流、反馈事件与导航交接。
jest.mock('axios', () => {
  const instance = {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }
  return {
    __esModule: true,
    default: { create: jest.fn(() => instance) },
    create: jest.fn(() => instance)
  }
})

import { createLocalVue, mount } from '@vue/test-utils'
import VueRouter from 'vue-router'
import axios from 'axios'
import App from '@/App.vue'
import DashboardView from '@/views/DashboardView.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import AppNavigation from '@/components/common/AppNavigation.vue'
import GlobalFeedback from '@/components/common/GlobalFeedback.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const api = axios.create()

async function mountAt(path, locale = 'zh') {
  localStorage.setItem('order-ai-locale', locale)
  const router = new VueRouter({
    mode: 'abstract',
    routes: [
      { path: '/', redirect: '/dashboard' },
      ...['dashboard', 'orders', 'shipments', 'refunds', 'inventory', 'inquiries', 'customers'].map(
        name => ({ path: `/${name}`, name, component: App })
      )
    ]
  })
  router.push(path)
  await router.isReady?.()
  const wrapper = mount(App, { localVue, router })
  await flush()
  return { wrapper, router, view: wrapper.findComponent(DashboardView) }
}

beforeEach(() => {
  api.get.mockReset()
  api.post.mockReset()
  api.put.mockReset()
  api.delete.mockReset()
  api.get.mockImplementation(url => {
    if (url === '/health') return Promise.resolve({ data: { status: 'UP' } })
    if (url === '/customers') return Promise.resolve({ data: { content: [] } })
    if (url === '/products') return Promise.resolve({ data: { content: [] } })
    if (url === '/orders') return Promise.resolve({ data: { content: [] } })
    if (url === '/customers/by-email/a%40b.com')
      return Promise.resolve({ data: { name: '张三', email: 'a@b.com' } })
    if (url === '/customers/by-email/a%40b.com/orders')
      return Promise.resolve({
        data: [{ order_number: 'ORD-1', status: 'PROCESSING', items: [] }]
      })
    if (url === '/products/MUG-001')
      return Promise.resolve({ data: { sku: 'MUG-001', name: 'Mug', stock: 5, price: '9.90' } })
    return Promise.resolve({ data: {} })
  })
  api.post.mockImplementation(url => {
    if (url === '/inquiries') return Promise.resolve({ data: { category: 'ORDER_QUERY' } })
    if (url === '/customers')
      return Promise.resolve({ data: { id: 1, name: '新客户', email: 'new@b.com' } })
    return Promise.resolve({ data: {} })
  })
  window.scrollTo = jest.fn()
})

describe('dashboard rendering', () => {
  it('renders the dedicated view with the original four cards and intact shell', async () => {
    const { wrapper, view } = await mountAt('/dashboard')

    expect(view.exists()).toBe(true)
    expect(wrapper.findAll('section.grid > article.card').length).toBe(4)
    expect(wrapper.find('section.grid h2').text()).toBe('处理客户咨询')
    expect(wrapper.find('section.management').exists()).toBe(false)
    expect(wrapper.findComponent(AppHeader).exists()).toBe(true)
    expect(wrapper.findComponent(AppNavigation).exists()).toBe(true)
    expect(wrapper.findComponent(GlobalFeedback).exists()).toBe(true)
  })

  it('hides the view on a management page without unmounting it', async () => {
    const { wrapper, view } = await mountAt('/orders')

    expect(view.exists()).toBe(true)
    expect(view.isVisible()).toBe(false)
    expect(wrapper.find('section.management').exists()).toBe(true)
  })
})

describe('dashboard data flow', () => {
  it('submits an inquiry and shows the translated result', async () => {
    const { view } = await mountAt('/dashboard')

    await view.vm.classify()
    await flush()

    expect(api.post).toHaveBeenCalledWith(
      '/inquiries',
      {
        customer_email: '',
        subject: '',
        body: ''
      },
      expect.anything()
    )
    expect(view.vm.inquiryResult.category).toBe('ORDER_QUERY')
    expect(view.find('.result .tag').text()).toBe('订单查询')
  })

  it('looks up a customer and their orders', async () => {
    const { view } = await mountAt('/dashboard')

    await view.setData({ email: 'a@b.com' })
    await view.vm.lookupCustomer()
    await flush()

    expect(api.get).toHaveBeenCalledWith('/customers/by-email/a%40b.com')
    expect(api.get).toHaveBeenCalledWith('/customers/by-email/a%40b.com/orders')
    expect(view.vm.customer.name).toBe('张三')
    expect(view.vm.orders).toHaveLength(1)
    expect(view.findAll('.order').length).toBe(1)
  })

  it('looks up product stock', async () => {
    const { view } = await mountAt('/dashboard')

    await view.setData({ sku: 'MUG-001' })
    await view.vm.lookupProduct()
    await flush()

    expect(api.get).toHaveBeenCalledWith('/products/MUG-001')
    expect(view.vm.product.name).toBe('Mug')
    expect(view.text()).toContain('库存 5')
  })

  it('creates a customer and asks App.vue to refresh shared options', async () => {
    const { wrapper, view } = await mountAt('/dashboard')

    await view.setData({ newCustomer: { name: '新客户', email: 'new@b.com' } })
    await view.vm.createCustomer()
    await flush()

    expect(view.vm.customerCreated).toBe(true)
    expect(view.vm.newCustomer).toEqual({ name: '', email: '' })
    expect(view.vm.email).toBe('new@b.com')
    expect(view.emitted()['options-changed']).toHaveLength(1)
    expect(wrapper.vm.error).toBe('')
  })
})

describe('dashboard loading and error state', () => {
  it('reports busy state to App.vue while a request is pending', async () => {
    let resolveRequest
    api.post.mockImplementation(() => new Promise(resolve => (resolveRequest = resolve)))
    const { wrapper, view } = await mountAt('/dashboard')

    const pending = view.vm.classify()
    await flush()
    expect(wrapper.vm.busy).toBe(true)

    resolveRequest({ data: { category: 'OTHER' } })
    await pending
    await flush()
    expect(wrapper.vm.busy).toBe(false)
  })

  it('routes request failures to the global feedback toast', async () => {
    api.post.mockRejectedValueOnce(new Error('boom'))
    const { wrapper, view } = await mountAt('/dashboard')

    await view.vm.classify()
    await flush()

    expect(wrapper.vm.error).toBe('boom')
    expect(wrapper.find('.toast').text()).toBe('boom')
    expect(wrapper.vm.busy).toBe(false)
  })

  it('keeps the duplicate-customer translation on create failures', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 409 } })
    const { wrapper, view } = await mountAt('/dashboard')

    await view.vm.createCustomer()
    await flush()

    expect(wrapper.vm.error).toBe('该邮箱已注册')
  })
})

describe('dashboard navigation and requests', () => {
  it('renders the view after navigating from another page', async () => {
    const { wrapper, router } = await mountAt('/orders')

    await wrapper.findAll('nav.menu button').at(0).trigger('click')
    await flush()

    expect(router.currentRoute.path).toBe('/dashboard')
    expect(wrapper.vm.page).toBe('dashboard')
    expect(wrapper.findComponent(DashboardView).exists()).toBe(true)
  })

  it('keeps the view mounted after navigating to a management page', async () => {
    const { wrapper, view } = await mountAt('/dashboard')

    await wrapper.findAll('nav.menu button').at(3).trigger('click')
    await flush()

    expect(wrapper.vm.page).toBe('refunds')
    expect(view.exists()).toBe(true)
    expect(wrapper.findComponent(DashboardView).exists()).toBe(true)
  })

  it('hides the view while a management page is active', async () => {
    const { wrapper, view } = await mountAt('/dashboard')

    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()

    expect(view.isVisible()).toBe(false)
    expect(wrapper.find('section.management').isVisible()).toBe(true)
  })

  it('shows the view again when navigating back', async () => {
    const { wrapper, view } = await mountAt('/dashboard')

    await wrapper.findAll('nav.menu button').at(2).trigger('click')
    await flush()
    expect(view.isVisible()).toBe(false)

    await wrapper.findAll('nav.menu button').at(0).trigger('click')
    await flush()

    expect(wrapper.vm.page).toBe('dashboard')
    expect(view.isVisible()).toBe(true)
    expect(wrapper.find('section.management').exists()).toBe(false)
  })

  it('preserves every piece of Dashboard local state across navigation', async () => {
    const { wrapper, view } = await mountAt('/dashboard')
    await wrapper.setData({ orderOptions: [{ order_number: 'ORD-1', status: 'PROCESSING' }] })
    await view.setData({
      form: { customer_email: 'a@b.com', subject: 'Where is my order?', body: 'Please help' },
      email: 'a@b.com',
      customer: { name: '张三', email: 'a@b.com' },
      orders: [{ order_number: 'ORD-1', status: 'PROCESSING', items: [] }],
      sku: 'MUG-001',
      product: { sku: 'MUG-001', name: 'Mug', stock: 5, price: '9.90' },
      refund: { order_number: 'ORD-1' }
    })

    await wrapper.findAll('nav.menu button').at(4).trigger('click')
    await flush()
    await wrapper.findAll('nav.menu button').at(0).trigger('click')
    await flush()

    // Inquiry form, customer lookup input and result, product lookup input and result, refund selection.
    expect(view.vm.form).toEqual({
      customer_email: 'a@b.com',
      subject: 'Where is my order?',
      body: 'Please help'
    })
    expect(view.vm.email).toBe('a@b.com')
    expect(view.vm.customer).toEqual({ name: '张三', email: 'a@b.com' })
    expect(view.vm.orders).toHaveLength(1)
    expect(view.vm.sku).toBe('MUG-001')
    expect(view.vm.product.name).toBe('Mug')
    expect(view.vm.refund).toEqual({ order_number: 'ORD-1' })

    expect(view.findAll('input').at(0).element.value).toBe('a@b.com')
    expect(view.findAll('input').at(2).element.value).toBe('a@b.com')
    expect(view.findAll('input').at(5).element.value).toBe('MUG-001')
    expect(view.find('select').element.value).toBe('ORD-1')
  })

  it('lets a pending request finish after navigation and resets the global busy state', async () => {
    let resolveRequest
    api.post.mockImplementation(() => new Promise(resolve => (resolveRequest = resolve)))
    const { wrapper, view } = await mountAt('/dashboard')

    const pending = view.vm.classify()
    await flush()
    expect(wrapper.vm.busy).toBe(true)

    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()
    expect(wrapper.vm.page).toBe('orders')
    expect(view.isVisible()).toBe(false)

    resolveRequest({ data: { category: 'ORDER_QUERY' } })
    await pending
    await flush()

    expect(view.vm.inquiryResult.category).toBe('ORDER_QUERY')
    expect(wrapper.vm.busy).toBe(false)
    expect(wrapper.vm.error).toBe('')
  })

  it('hands refund navigation to App.vue instead of navigating itself', async () => {
    const { wrapper, view } = await mountAt('/dashboard')

    await view.vm.requestRefund('ORD-9')
    await flush()

    expect(wrapper.vm.page).toBe('refunds')
    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editor.order_number).toBe('ORD-9')
    expect(view.isVisible()).toBe(false)
    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('does not introduce duplicate API requests on mount or option refresh', async () => {
    const { view } = await mountAt('/dashboard')
    const calls = url => api.get.mock.calls.filter(call => call[0] === url).length

    expect(calls('/customers')).toBe(1)
    expect(calls('/products')).toBe(1)
    expect(calls('/orders')).toBe(1)

    await view.vm.createCustomer()
    await flush()

    expect(calls('/customers')).toBe(2)
    expect(calls('/products')).toBe(2)
    expect(calls('/orders')).toBe(2)
  })

  it('keeps Dashboard state out of the App.vue shell', async () => {
    const { wrapper, view } = await mountAt('/dashboard')

    await view.setData({ refund: { order_number: 'ORD-1' } })

    expect(wrapper.vm.refund).toBeUndefined()
    expect(wrapper.vm.inquiryResult).toBeUndefined()
    expect(wrapper.vm.customer).toBeUndefined()
  })
})
