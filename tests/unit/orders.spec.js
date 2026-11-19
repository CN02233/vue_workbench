// EN: Orders view tests: presentation, event hand-off and unchanged App.vue business logic.
// 中文：订单视图测试：展示、事件交接，以及 App.vue 业务行为保持不变。
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

import { createLocalVue, mount, shallowMount } from '@vue/test-utils'
import VueRouter from 'vue-router'
import axios from 'axios'
import App from '@/App.vue'
import OrdersView from '@/views/OrdersView.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const api = axios.create()

const ROWS = [
  {
    order_number: 'ORD-1',
    customer_id: 1,
    status: 'PROCESSING',
    tracking_number: 'SF1',
    created_at: '2026-11-01T10:20:30'
  },
  {
    order_number: 'ORD-2',
    customer_id: 2,
    status: 'SHIPPED',
    tracking_number: 'SF2',
    created_at: '2026-11-02T11:00:00'
  }
]

const COLUMNS = ['order_number', 'customer_id', 'status', 'tracking_number', 'created_at']
const FILTER_FIELDS = [
  { key: 'order_number' },
  { key: 'customer_id', type: 'number', min: 1, step: 1 },
  { key: 'status', options: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
  { key: 'created_from', type: 'datetime-local' },
  { key: 'created_to', type: 'datetime-local' }
]

const FILTERS = {
  order_number: '',
  customer_id: '',
  status: '',
  created_from: '',
  created_to: '',
  tracking_number: ''
}

function viewProps(overrides = {}) {
  return {
    locale: 'zh',
    rows: ROWS,
    columns: COLUMNS,
    filters: { ...FILTERS },
    filterFields: FILTER_FIELDS,
    pageNumber: 0,
    pageSize: 10,
    totalPages: 2,
    totalElements: 6,
    ...overrides
  }
}

// EN: Only the list request carries `page`; loadOptions uses a size-only params object on the same URL.
// 中文：只有列表请求带 `page`；loadOptions 在同一 URL 上只带 size 参数。
const listCalls = () =>
  api.get.mock.calls.filter(call => call[0] === '/orders' && call[1]?.params?.page !== undefined)

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
  return { wrapper, router, view: wrapper.findComponent(OrdersView) }
}

beforeEach(() => {
  api.get.mockReset()
  api.post.mockReset()
  api.put.mockReset()
  api.delete.mockReset()
  api.get.mockImplementation((url, config) => {
    if (url === '/health') return Promise.resolve({ data: { status: 'UP' } })
    if (url === '/orders' && config?.params?.page !== undefined)
      return Promise.resolve({
        data: { content: ROWS, page: { number: 0, totalPages: 2, totalElements: 6, size: 10 } }
      })
    if (url === '/orders/ORD-1')
      return Promise.resolve({
        data: {
          order_number: 'ORD-1',
          items: [{ id: 1, sku: 'MUG-001', name: 'Mug', quantity: 2 }]
        }
      })
    if (url === '/customers' || url === '/products' || url === '/orders')
      return Promise.resolve({ data: { content: [] } })
    return Promise.resolve({ data: {} })
  })
  api.post.mockImplementation(() => Promise.resolve({ data: {} }))
  api.put.mockImplementation(() => Promise.resolve({ data: {} }))
  api.delete.mockImplementation(() => Promise.resolve({ data: {} }))
  window.confirm = jest.fn(() => true)
  window.scrollTo = jest.fn()
})

describe('OrdersView standalone rendering', () => {
  it('renders the management layout with order columns and translated status', () => {
    const wrapper = shallowMount(OrdersView, { propsData: viewProps() })

    expect(wrapper.find('section.card.management').exists()).toBe(true)
    expect(wrapper.findAll('thead th').wrappers.map(th => th.text())).toEqual([
      '订单号',
      '客户ID',
      '状态',
      '物流单号',
      '创建时间',
      '操作'
    ])
    expect(wrapper.findAll('tbody tr').length).toBe(2)
    const cells = wrapper.findAll('tbody tr').at(0).findAll('td')
    expect(cells.at(0).text()).toBe('ORD-1')
    expect(cells.at(1).text()).toBe('1')
    expect(cells.at(2).text()).toBe('处理中')
    expect(cells.at(3).text()).toBe('SF1')
    expect(cells.at(4).text()).toBe('2026-11-01 10:20')
    expect(cells.at(5).findAll('button').length).toBe(3)
    expect(wrapper.find('.pagination').text()).toContain('1 / 2 · 6')
  })

  it('shows cancel only for PROCESSING orders', () => {
    const wrapper = shallowMount(OrdersView, { propsData: viewProps() })
    const first = wrapper.findAll('tbody tr').at(0).findAll('button')
    const second = wrapper.findAll('tbody tr').at(1).findAll('button')

    // edit + cancel + delete for the processing order; edit + delete for the shipped one
    expect(first.length).toBe(3)
    expect(first.at(1).text()).toBe('取消订单')
    expect(second.length).toBe(2)
    expect(second.wrappers.map(b => b.text())).toEqual(['编辑', '删除'])
  })

  it('shows the empty placeholder when there are no rows', () => {
    const wrapper = shallowMount(OrdersView, { propsData: viewProps({ rows: [] }) })

    expect(wrapper.find('tbody tr td.empty').text()).toBe('暂无数据')
  })
})

describe('OrdersView events', () => {
  it('emits filter values and the search event', async () => {
    const wrapper = shallowMount(OrdersView, { propsData: viewProps() })

    const inputs = wrapper.findAll('.filters input')
    await inputs.at(0).setValue('ORD-1')
    expect(wrapper.emitted()['update-filter'][0]).toEqual([{ key: 'order_number', value: 'ORD-1' }])

    const select = wrapper.findAll('.filters select').at(0)
    await select.setValue('SHIPPED')
    expect(wrapper.emitted()['update-filter'][1]).toEqual([{ key: 'status', value: 'SHIPPED' }])

    await wrapper.findAll('.filters button').at(0).trigger('click')
    expect(wrapper.emitted().search).toHaveLength(1)
  })

  it('emits reset, page and page-size events', async () => {
    const wrapper = shallowMount(OrdersView, { propsData: viewProps() })

    await wrapper.findAll('.filters button').at(1).trigger('click')
    expect(wrapper.emitted().reset).toHaveLength(1)

    await wrapper.findAll('.pagination button').at(1).trigger('click')
    expect(wrapper.emitted().page[0]).toEqual([1])

    await wrapper.find('.pagination select').setValue('25')
    expect(wrapper.emitted()['page-size'][0]).toEqual([25])
  })

  it('emits create and edit with the selected row', async () => {
    const wrapper = shallowMount(OrdersView, { propsData: viewProps() })

    await wrapper.find('.management-heading button').trigger('click')
    expect(wrapper.emitted().create).toHaveLength(1)

    const actions = wrapper.findAll('tbody tr').at(0).findAll('.action-cell button')
    await actions.at(0).trigger('click')
    expect(wrapper.emitted().edit[0]).toEqual([ROWS[0]])
  })

  it('emits cancel only for the processing row and passes that row', async () => {
    const wrapper = shallowMount(OrdersView, { propsData: viewProps() })

    const processingActions = wrapper.findAll('tbody tr').at(0).findAll('.action-cell button')
    await processingActions.at(1).trigger('click')
    expect(wrapper.emitted().cancel[0]).toEqual([ROWS[0]])

    const shippedActions = wrapper.findAll('tbody tr').at(1).findAll('.action-cell button')
    // The shipped row has edit + delete only; no cancel button in the middle.
    expect(shippedActions.length).toBe(2)
    await shippedActions.at(0).trigger('click')
    expect(wrapper.emitted().edit[0]).toEqual([ROWS[1]])
    expect(wrapper.emitted().cancel).toHaveLength(1)
  })

  it('emits delete with the selected row', async () => {
    const wrapper = shallowMount(OrdersView, { propsData: viewProps() })

    const actions = wrapper.findAll('tbody tr').at(0).findAll('.action-cell button')
    await actions.at(2).trigger('click')
    expect(wrapper.emitted().delete[0]).toEqual([ROWS[0]])
  })
})

describe('App.vue handles OrdersView events', () => {
  it('renders the view with App-owned list data and issues one list request', async () => {
    const { wrapper, view } = await mountAt('/orders')

    expect(view.exists()).toBe(true)
    expect(view.props('rows')).toEqual(ROWS)
    expect(view.props('columns')).toEqual(COLUMNS)
    expect(view.findAll('tbody tr').length).toBe(2)
    expect(listCalls()).toHaveLength(1)
    // No duplicate management list from the generic section.
    expect(wrapper.findAll('section.card.management')).toHaveLength(1)
  })

  it('applies filter and search events to the existing request params', async () => {
    const { wrapper, view } = await mountAt('/orders')

    view.vm.$emit('update-filter', { key: 'order_number', value: 'ORD-1' })
    await flush()
    expect(wrapper.vm.filters.order_number).toBe('ORD-1')

    view.vm.$emit('search')
    await flush()
    expect(listCalls().slice(-1)[0]).toEqual([
      '/orders',
      { params: { page: 0, size: 10, order_number: 'ORD-1' } }
    ])
  })

  it('handles reset, page and page-size events', async () => {
    const { wrapper, view } = await mountAt('/orders')
    await wrapper.setData({ filters: { ...wrapper.vm.filters, customer_id: '1' } })

    view.vm.$emit('reset')
    await flush()
    expect(wrapper.vm.filters.customer_id).toBe('')

    view.vm.$emit('page', 1)
    await flush()
    expect(listCalls().slice(-1)[0]).toEqual(['/orders', { params: { page: 1, size: 10 } }])

    view.vm.$emit('page-size', 25)
    await flush()
    expect(wrapper.vm.pageSize).toBe(25)
    expect(listCalls().slice(-1)[0]).toEqual(['/orders', { params: { page: 0, size: 25 } }])
  })

  it('opens the existing create and edit forms from view events', async () => {
    const { wrapper, view } = await mountAt('/orders')

    view.vm.$emit('create')
    await flush()
    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editing).toBe(false)
    expect(wrapper.vm.editor).toEqual({
      order_number: '',
      customer_id: '',
      items: [{ sku: '', quantity: 1 }],
      tracking_number: ''
    })
    expect(api.post).not.toHaveBeenCalled()

    wrapper.vm.closeForm()
    view.vm.$emit('edit', ROWS[0])
    await flush()
    expect(wrapper.vm.editing).toBe(true)
    expect(wrapper.vm.originalKey).toBe('ORD-1')
    expect(wrapper.vm.editor).toEqual({
      order_number: 'ORD-1',
      customer_id: 1,
      status: 'PROCESSING',
      tracking_number: 'SF1'
    })
  })

  it('keeps order detail loading unchanged on edit', async () => {
    const { wrapper, view } = await mountAt('/orders')

    view.vm.$emit('edit', ROWS[0])
    await flush()

    expect(api.get).toHaveBeenCalledWith('/orders/ORD-1')
    expect(wrapper.vm.orderDetail).toEqual({
      order_number: 'ORD-1',
      items: [{ id: 1, sku: 'MUG-001', name: 'Mug', quantity: 2 }]
    })
    // The detail modal is still rendered by App.vue.
    expect(wrapper.find('.modal').text()).toContain('MUG-001')
  })

  it('invokes the existing cancellation flow from the cancel event', async () => {
    const { wrapper, view } = await mountAt('/orders')

    view.vm.$emit('cancel', ROWS[0])
    await flush()

    expect(window.confirm).toHaveBeenCalled()
    expect(api.put).toHaveBeenCalledWith('/orders/ORD-1', { status: 'CANCELLED' })
    expect(listCalls()).toHaveLength(2)
  })

  it('does not cancel when the confirmation is declined', async () => {
    window.confirm = jest.fn(() => false)
    const { view } = await mountAt('/orders')

    view.vm.$emit('cancel', ROWS[0])
    await flush()

    expect(api.put).not.toHaveBeenCalled()
  })

  it('invokes the existing deletion flow from the delete event', async () => {
    const { wrapper, view } = await mountAt('/orders')

    view.vm.$emit('delete', ROWS[0])
    await flush()

    expect(window.confirm).toHaveBeenCalled()
    expect(api.delete).toHaveBeenCalledWith('/orders/ORD-1')
    expect(listCalls()).toHaveLength(2)
  })

  it('keeps order create and edit submission payloads unchanged', async () => {
    const { wrapper, view } = await mountAt('/orders')

    view.vm.$emit('create')
    await flush()
    await wrapper.setData({
      editor: {
        order_number: 'ORD-9',
        customer_id: 3,
        items: [{ sku: 'MUG-001', quantity: 2 }],
        tracking_number: ''
      }
    })
    await wrapper.vm.saveManagement()
    expect(api.post).toHaveBeenCalledWith(
      '/orders',
      {
        order_number: 'ORD-9',
        customer_id: 3,
        items: [{ sku: 'MUG-001', quantity: 2 }],
        tracking_number: null
      },
      undefined
    )

    wrapper.vm.closeForm()
    view.vm.$emit('edit', ROWS[0])
    await flush()
    await wrapper.setData({ editor: { ...wrapper.vm.editor, status: 'SHIPPED' } })
    await wrapper.vm.saveManagement()
    expect(api.put).toHaveBeenCalledWith('/orders/ORD-1', {
      status: 'SHIPPED',
      tracking_number: 'SF1'
    })
  })

  it('renders correctly when entering from another page, leaving and returning', async () => {
    const { wrapper, view } = await mountAt('/inventory')
    expect(view.exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()
    expect(wrapper.findComponent(OrdersView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('ORD-1')

    await wrapper.findAll('nav.menu button').at(4).trigger('click')
    await flush()
    expect(wrapper.findComponent(OrdersView).exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()
    expect(wrapper.findComponent(OrdersView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('ORD-1')
    // One list request per entry into the page; the view never fetches on its own.
    expect(listCalls()).toHaveLength(2)
  })

  it('leaves shipment and refund pages on the generic management section', async () => {
    const { wrapper } = await mountAt('/shipments')
    expect(wrapper.findComponent(OrdersView).exists()).toBe(false)
    expect(wrapper.find('section.card.management').exists()).toBe(true)

    await wrapper.findAll('nav.menu button').at(3).trigger('click')
    await flush()
    expect(wrapper.findComponent(OrdersView).exists()).toBe(false)
    expect(wrapper.find('section.card.management').exists()).toBe(true)
  })
})
