// EN: Shipments view tests: presentation, event hand-off and unchanged App.vue workflow logic.
// 中文：物流视图测试：展示、事件交接，以及 App.vue 工作流行为保持不变。
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
import ShipmentsView from '@/views/ShipmentsView.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const api = axios.create()

const ROWS = [
  {
    id: 1,
    order_number: 'ORD-1',
    carrier: 'SF',
    tracking_number: 'SF1',
    status: 'CREATED',
    shipped_at: '2026-11-01T10:20:30',
    delivered_at: null
  },
  {
    id: 2,
    order_number: 'ORD-2',
    carrier: 'JD',
    tracking_number: 'JD2',
    status: 'IN_TRANSIT',
    shipped_at: '2026-11-02T09:00:00',
    delivered_at: null
  }
]

const COLUMNS = [
  'id',
  'order_number',
  'carrier',
  'tracking_number',
  'status',
  'shipped_at',
  'delivered_at'
]
const FILTER_FIELDS = [
  { key: 'order_number' },
  { key: 'tracking_number' },
  { key: 'carrier' },
  {
    key: 'status',
    options: ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'CANCELLED']
  },
  { key: 'created_from', type: 'datetime-local' },
  { key: 'created_to', type: 'datetime-local' }
]

const FILTERS = {
  order_number: '',
  tracking_number: '',
  carrier: '',
  status: '',
  created_from: '',
  created_to: ''
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

// EN: `/shipments` is only hit by the list request here; detail uses `/shipments/{id}`.
// 中文：此处的 `/shipments` 仅由列表请求命中；详情使用 `/shipments/{id}`。
const listCalls = () => api.get.mock.calls.filter(call => call[0] === '/shipments')

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
  return { wrapper, router, view: wrapper.findComponent(ShipmentsView) }
}

beforeEach(() => {
  api.get.mockReset()
  api.post.mockReset()
  api.put.mockReset()
  api.delete.mockReset()
  api.get.mockImplementation(url => {
    if (url === '/health') return Promise.resolve({ data: { status: 'UP' } })
    if (url === '/shipments')
      return Promise.resolve({
        data: { content: ROWS, page: { number: 0, totalPages: 2, totalElements: 6, size: 10 } }
      })
    if (url === '/shipments/1')
      return Promise.resolve({
        data: {
          id: 1,
          carrier: 'SF',
          tracking_number: 'SF1',
          status: 'CREATED',
          note: 'leave at door',
          receiver_name: 'Zhang'
        }
      })
    if (url === '/orders/ORD-1')
      return Promise.resolve({
        data: {
          order_number: 'ORD-1',
          status: 'PROCESSING',
          items: [{ id: 1, sku: 'MUG-001', name: 'Mug', quantity: 3, shipped_quantity: 1 }]
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

describe('ShipmentsView standalone rendering', () => {
  it('renders the management layout with shipment columns and translated status', () => {
    const wrapper = shallowMount(ShipmentsView, { propsData: viewProps() })

    expect(wrapper.find('section.card.management').exists()).toBe(true)
    expect(wrapper.findAll('thead th').wrappers.map(th => th.text())).toEqual([
      '编号',
      '订单号',
      '物流公司',
      '物流单号',
      '状态',
      '发货时间',
      '签收时间',
      '操作'
    ])
    expect(wrapper.findAll('tbody tr').length).toBe(2)
    const cells = wrapper.findAll('tbody tr').at(0).findAll('td')
    expect(cells.at(0).text()).toBe('1')
    expect(cells.at(1).text()).toBe('ORD-1')
    expect(cells.at(2).text()).toBe('SF')
    expect(cells.at(3).text()).toBe('SF1')
    expect(cells.at(4).text()).toBe('待揽收')
    expect(cells.at(5).text()).toBe('2026-11-01 10:20')
    expect(cells.at(6).text()).toBe('—')
    expect(wrapper.find('.pagination').text()).toContain('1 / 2 · 6')
  })

  it('shows delete only for statuses outside DELIVERED/IN_TRANSIT/PICKED_UP', () => {
    const wrapper = shallowMount(ShipmentsView, {
      propsData: viewProps({
        rows: [
          { id: 1, status: 'CREATED' },
          { id: 2, status: 'EXCEPTION' },
          { id: 3, status: 'CANCELLED' },
          { id: 4, status: 'PICKED_UP' },
          { id: 5, status: 'IN_TRANSIT' },
          { id: 6, status: 'DELIVERED' }
        ]
      })
    })
    const hasDelete = wrapper
      .findAll('tbody tr')
      .wrappers.map(tr => tr.find('button.danger').exists())

    expect(hasDelete).toEqual([true, true, true, false, false, false])
    // Edit is always present regardless of status.
    wrapper.findAll('tbody tr').wrappers.forEach(tr => {
      expect(tr.find('button.secondary').exists()).toBe(true)
    })
  })

  it('shows the empty placeholder when there are no rows', () => {
    const wrapper = shallowMount(ShipmentsView, { propsData: viewProps({ rows: [] }) })

    expect(wrapper.find('tbody tr td.empty').text()).toBe('暂无数据')
  })
})

describe('ShipmentsView events', () => {
  it('emits filter values and the search event', async () => {
    const wrapper = shallowMount(ShipmentsView, { propsData: viewProps() })

    const inputs = wrapper.findAll('.filters input')
    await inputs.at(0).setValue('ORD-1')
    expect(wrapper.emitted()['update-filter'][0]).toEqual([{ key: 'order_number', value: 'ORD-1' }])

    const select = wrapper.findAll('.filters select').at(0)
    await select.setValue('IN_TRANSIT')
    expect(wrapper.emitted()['update-filter'][1]).toEqual([{ key: 'status', value: 'IN_TRANSIT' }])

    await wrapper.findAll('.filters button').at(0).trigger('click')
    expect(wrapper.emitted().search).toHaveLength(1)
  })

  it('emits reset, page and page-size events', async () => {
    const wrapper = shallowMount(ShipmentsView, { propsData: viewProps() })

    await wrapper.findAll('.filters button').at(1).trigger('click')
    expect(wrapper.emitted().reset).toHaveLength(1)

    await wrapper.findAll('.pagination button').at(1).trigger('click')
    expect(wrapper.emitted().page[0]).toEqual([1])

    await wrapper.find('.pagination select').setValue('25')
    expect(wrapper.emitted()['page-size'][0]).toEqual([25])
  })

  it('emits create and edit with the selected row', async () => {
    const wrapper = shallowMount(ShipmentsView, { propsData: viewProps() })

    await wrapper.find('.management-heading button').trigger('click')
    expect(wrapper.emitted().create).toHaveLength(1)

    const actions = wrapper.findAll('tbody tr').at(0).findAll('.action-cell button')
    await actions.at(0).trigger('click')
    expect(wrapper.emitted().edit[0]).toEqual([ROWS[0]])
  })

  it('emits delete with the selected row', async () => {
    const wrapper = shallowMount(ShipmentsView, { propsData: viewProps() })

    const actions = wrapper.findAll('tbody tr').at(0).findAll('.action-cell button')
    await actions.at(1).trigger('click')
    expect(wrapper.emitted().delete[0]).toEqual([ROWS[0]])
  })
})

describe('App.vue handles ShipmentsView events', () => {
  it('renders the view with App-owned list data and issues one list request', async () => {
    const { wrapper, view } = await mountAt('/shipments')

    expect(view.exists()).toBe(true)
    expect(view.props('rows')).toEqual(ROWS)
    expect(view.props('columns')).toEqual(COLUMNS)
    expect(view.findAll('tbody tr').length).toBe(2)
    expect(listCalls()).toHaveLength(1)
    // The generic management section must not render a duplicate table.
    expect(wrapper.findAll('section.card.management')).toHaveLength(1)
  })

  it('applies filter and search events to the existing request params', async () => {
    const { wrapper, view } = await mountAt('/shipments')

    view.vm.$emit('update-filter', { key: 'carrier', value: 'SF' })
    await flush()
    expect(wrapper.vm.filters.carrier).toBe('SF')

    view.vm.$emit('search')
    await flush()
    expect(listCalls().slice(-1)[0]).toEqual([
      '/shipments',
      { params: { page: 0, size: 10, carrier: 'SF' } }
    ])
  })

  it('handles reset, page and page-size events', async () => {
    const { wrapper, view } = await mountAt('/shipments')
    await wrapper.setData({ filters: { ...wrapper.vm.filters, tracking_number: 'SF1' } })

    view.vm.$emit('reset')
    await flush()
    expect(wrapper.vm.filters.tracking_number).toBe('')

    view.vm.$emit('page', 1)
    await flush()
    expect(listCalls().slice(-1)[0]).toEqual(['/shipments', { params: { page: 1, size: 10 } }])

    view.vm.$emit('page-size', 25)
    await flush()
    expect(wrapper.vm.pageSize).toBe(25)
    expect(listCalls().slice(-1)[0]).toEqual(['/shipments', { params: { page: 0, size: 25 } }])
  })

  it('opens the existing create form from the create event', async () => {
    const { wrapper, view } = await mountAt('/shipments')

    view.vm.$emit('create')
    await flush()
    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editing).toBe(false)
    expect(wrapper.vm.editor).toEqual({
      order_number: '',
      carrier: '',
      tracking_number: '',
      estimated_delivery: '',
      receiver_name: '',
      note: '',
      location: '',
      description: '',
      status: 'CREATED'
    })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('loads shipment detail and associated order detail on edit', async () => {
    const { wrapper, view } = await mountAt('/shipments')

    view.vm.$emit('edit', ROWS[0])
    await flush()

    expect(api.get).toHaveBeenCalledWith('/shipments/1')
    expect(api.get).toHaveBeenCalledWith('/orders/ORD-1')
    expect(wrapper.vm.originalKey).toBe(1)
    expect(wrapper.vm.shipmentFrom).toBe('CREATED')
    expect(wrapper.vm.shipmentDetail.id).toBe(1)
    expect(wrapper.vm.orderDetail.order_number).toBe('ORD-1')
    // Detail values are merged into the editor by the existing workflow.
    expect(wrapper.vm.editor.note).toBe('leave at door')
    expect(wrapper.vm.editor.receiver_name).toBe('Zhang')
    // The associated order surfaces as the readonly shipped/ordered totals (1 / 3).
    expect(wrapper.find('.modal').text()).toContain('1 /')
  })

  it('keeps shipment status transition rules unchanged', async () => {
    const { wrapper } = await mountAt('/shipments')

    await wrapper.setData({ shipmentFrom: 'CREATED' })
    expect(wrapper.vm.shipmentStatusOptions).toEqual([
      'CREATED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
      'EXCEPTION',
      'CANCELLED'
    ])
    await wrapper.setData({ shipmentFrom: 'IN_TRANSIT' })
    expect(wrapper.vm.shipmentStatusOptions).toEqual(['IN_TRANSIT', 'DELIVERED', 'EXCEPTION'])
    await wrapper.setData({ shipmentFrom: 'DELIVERED' })
    expect(wrapper.vm.shipmentStatusOptions).toEqual(['DELIVERED'])
  })

  it('keeps the shipment creation payload and order-line prefill unchanged', async () => {
    const { wrapper, view } = await mountAt('/shipments')

    view.vm.$emit('create')
    await flush()
    await wrapper.setData({ editor: { ...wrapper.vm.editor, order_number: 'ORD-1' } })
    await wrapper.vm.onShipmentOrderChange()
    await flush()
    expect(wrapper.vm.shipmentLines).toEqual([
      { id: 1, sku: 'MUG-001', name: 'Mug', remaining: 2, quantity: 2 }
    ])

    await wrapper.setData({
      editor: {
        ...wrapper.vm.editor,
        carrier: 'SF',
        tracking_number: 'SF9',
        estimated_delivery: '2026-12-01',
        receiver_name: 'Li',
        note: 'call first'
      }
    })
    await wrapper.vm.saveManagement()

    expect(api.post).toHaveBeenCalledWith(
      '/shipments',
      {
        order_number: 'ORD-1',
        carrier: 'SF',
        tracking_number: 'SF9',
        estimated_delivery: '2026-12-01',
        receiver_name: 'Li',
        note: 'call first',
        items: [{ order_item_id: 1, quantity: 2 }]
      },
      undefined
    )
  })

  it('keeps shipment quantity validation unchanged', async () => {
    const { wrapper, view } = await mountAt('/shipments')

    view.vm.$emit('create')
    await flush()
    // No order selected: the existing guard rejects creation.
    await wrapper.vm.saveManagement()
    expect(wrapper.vm.error).toBe('选择订单')
    expect(api.post).not.toHaveBeenCalled()

    // Order selected but nothing left to ship: the existing guard still rejects.
    await wrapper.setData({ editor: { ...wrapper.vm.editor, order_number: 'ORD-1' } })
    await wrapper.vm.onShipmentOrderChange()
    await wrapper.setData({ shipmentLines: [] })
    await wrapper.vm.saveManagement()
    expect(wrapper.vm.error).toBe('该订单已全部发货')

    // Lines present but all quantities zero: the existing guard rejects.
    await wrapper.setData({ shipmentLines: [{ id: 1, remaining: 2, quantity: 0 }] })
    await wrapper.vm.saveManagement()
    expect(wrapper.vm.error).toBe('请至少填写一件商品数量')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('invokes the existing deletion flow from the delete event', async () => {
    const { wrapper, view } = await mountAt('/shipments')

    view.vm.$emit('delete', ROWS[0])
    await flush()

    expect(window.confirm).toHaveBeenCalled()
    expect(api.delete).toHaveBeenCalledWith('/shipments/1')
    expect(listCalls()).toHaveLength(2)
  })

  it('renders correctly when entering from another page, leaving and returning', async () => {
    const { wrapper, view } = await mountAt('/orders')
    expect(view.exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(2).trigger('click')
    await flush()
    expect(wrapper.findComponent(ShipmentsView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('ORD-1')

    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()
    expect(wrapper.findComponent(ShipmentsView).exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(2).trigger('click')
    await flush()
    expect(wrapper.findComponent(ShipmentsView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('ORD-1')
    // One list request per entry into the page; the view never fetches on its own.
    expect(listCalls()).toHaveLength(2)
  })

  it('leaves refunds on the generic management section', async () => {
    const { wrapper } = await mountAt('/refunds')
    expect(wrapper.findComponent(ShipmentsView).exists()).toBe(false)
    expect(wrapper.find('section.card.management').exists()).toBe(true)
  })
})
