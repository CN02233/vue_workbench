// EN: Refunds view tests: presentation, event hand-off and unchanged App.vue refund workflows.
// 中文：退款视图测试：展示、事件交接，以及 App.vue 退款工作流保持不变。
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
import RefundsView from '@/views/RefundsView.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const api = axios.create()

const ROWS = [
  {
    id: 1,
    order_number: 'ORD-1',
    status: 'PENDING_MANUAL_APPROVAL',
    refund_type: 'REFUND_ONLY',
    amount: 25.5,
    created_at: '2026-11-01T10:20:30'
  },
  {
    id: 2,
    order_number: 'ORD-2',
    status: 'APPROVED_MANUALLY',
    refund_type: 'RETURN_AND_REFUND',
    amount: 40,
    created_at: '2026-11-02T11:00:00',
    inventory_received: false
  }
]

const COLUMNS = ['id', 'order_number', 'status', 'refund_type', 'amount', 'created_at']
const FILTER_FIELDS = [
  { key: 'id', type: 'number', min: 1, step: 1 },
  { key: 'order_number' },
  {
    key: 'status',
    options: ['PENDING_MANUAL_APPROVAL', 'APPROVED_MANUALLY', 'REJECTED']
  },
  { key: 'created_from', type: 'datetime-local' },
  { key: 'created_to', type: 'datetime-local' }
]

const FILTERS = {
  id: '',
  order_number: '',
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

// EN: Refund list uses `/refund-requests`; detail/action paths carry an id suffix.
// 中文：退款列表走 `/refund-requests`；详情与动作路径带 id 后缀。
const listCalls = () => api.get.mock.calls.filter(call => call[0] === '/refund-requests')

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
  return { wrapper, router, view: wrapper.findComponent(RefundsView) }
}

beforeEach(() => {
  api.get.mockReset()
  api.post.mockReset()
  api.put.mockReset()
  api.delete.mockReset()
  api.get.mockImplementation(url => {
    if (url === '/health') return Promise.resolve({ data: { status: 'UP' } })
    if (url === '/refund-requests')
      return Promise.resolve({
        data: { content: ROWS, page: { number: 0, totalPages: 2, totalElements: 6, size: 10 } }
      })
    if (url === '/refund-requests/2')
      return Promise.resolve({
        data: {
          id: 2,
          order_number: 'ORD-2',
          status: 'APPROVED_MANUALLY',
          inventory_received: false,
          return_items: [
            { order_item_id: 11, sku: 'MUG-001', name: 'Mug', quantity: 3, accepted_quantity: 1 }
          ]
        }
      })
    if (url === '/refund-requests/1')
      return Promise.resolve({
        data: {
          id: 1,
          status: 'PENDING_MANUAL_APPROVAL',
          refund_type: 'REFUND_ONLY',
          inventory_received: false
        }
      })
    if (url === '/orders/ORD-1')
      return Promise.resolve({
        data: {
          order_number: 'ORD-1',
          refundable_amount: 25.5,
          status: 'DELIVERED',
          items: [{ id: 11, sku: 'MUG-001', name: 'Mug', quantity: 3, shipped_quantity: 3 }]
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

describe('RefundsView standalone rendering', () => {
  it('renders the management layout with refund columns and translated enums', () => {
    const wrapper = shallowMount(RefundsView, { propsData: viewProps() })

    expect(wrapper.find('section.card.management').exists()).toBe(true)
    expect(wrapper.findAll('thead th').wrappers.map(th => th.text())).toEqual([
      '编号',
      '订单号',
      '状态',
      '退款类型',
      '退款金额',
      '创建时间',
      '操作'
    ])
    expect(wrapper.findAll('tbody tr').length).toBe(2)
    const cells = wrapper.findAll('tbody tr').at(0).findAll('td')
    expect(cells.at(0).text()).toBe('1')
    expect(cells.at(1).text()).toBe('ORD-1')
    expect(cells.at(2).text()).toBe('待人工审核')
    expect(cells.at(3).text()).toBe('仅退款')
    expect(cells.at(4).text()).toBe('25.5')
    expect(cells.at(5).text()).toBe('2026-11-01 10:20')
    expect(wrapper.find('.pagination').text()).toContain('1 / 2 · 6')
  })

  it('shows edit/approve/reject for a pending refund', () => {
    const buttons = shallowMount(RefundsView, { propsData: viewProps() })
      .findAll('tbody tr')
      .at(0)
      .findAll('.action-cell button')
      .wrappers.map(b => b.text())

    expect(buttons).toEqual(['编辑', '批准', '拒绝', '删除'])
  })

  it('shows receive for an approved return that has not been received', () => {
    const buttons = shallowMount(RefundsView, { propsData: viewProps() })
      .findAll('tbody tr')
      .at(1)
      .findAll('.action-cell button')
      .wrappers.map(b => b.text())

    expect(buttons).toEqual(['验收入库', '删除'])
  })

  it('hides receive for received returns, refund-only approvals and rejected rows', () => {
    const wrapper = shallowMount(RefundsView, {
      propsData: viewProps({
        rows: [
          {
            id: 3,
            status: 'APPROVED_MANUALLY',
            refund_type: 'RETURN_AND_REFUND',
            inventory_received: true
          },
          { id: 4, status: 'APPROVED_MANUALLY', refund_type: 'REFUND_ONLY' },
          { id: 5, status: 'REJECTED', refund_type: 'RETURN_AND_REFUND', inventory_received: false }
        ]
      })
    })
    const buttonTexts = wrapper
      .findAll('tbody tr')
      .wrappers.map(tr => tr.findAll('.action-cell button').wrappers.map(b => b.text()))

    expect(buttonTexts).toEqual([['删除'], ['删除'], ['删除']])
  })

  it('shows the empty placeholder when there are no rows', () => {
    const wrapper = shallowMount(RefundsView, { propsData: viewProps({ rows: [] }) })

    expect(wrapper.find('tbody tr td.empty').text()).toBe('暂无数据')
  })
})

describe('RefundsView events', () => {
  it('emits filter values and the search event', async () => {
    const wrapper = shallowMount(RefundsView, { propsData: viewProps() })

    const inputs = wrapper.findAll('.filters input')
    await inputs.at(0).setValue('2')
    expect(wrapper.emitted()['update-filter'][0]).toEqual([{ key: 'id', value: '2' }])

    const select = wrapper.findAll('.filters select').at(0)
    await select.setValue('APPROVED_MANUALLY')
    expect(wrapper.emitted()['update-filter'][1]).toEqual([
      { key: 'status', value: 'APPROVED_MANUALLY' }
    ])

    await wrapper.findAll('.filters button').at(0).trigger('click')
    expect(wrapper.emitted().search).toHaveLength(1)
  })

  it('emits reset, page and page-size events', async () => {
    const wrapper = shallowMount(RefundsView, { propsData: viewProps() })

    await wrapper.findAll('.filters button').at(1).trigger('click')
    expect(wrapper.emitted().reset).toHaveLength(1)

    await wrapper.findAll('.pagination button').at(1).trigger('click')
    expect(wrapper.emitted().page[0]).toEqual([1])

    await wrapper.find('.pagination select').setValue('25')
    expect(wrapper.emitted()['page-size'][0]).toEqual([25])
  })

  it('emits create with no payload', async () => {
    const wrapper = shallowMount(RefundsView, { propsData: viewProps() })

    await wrapper.find('.management-heading button').trigger('click')
    expect(wrapper.emitted().create).toHaveLength(1)
    expect(wrapper.emitted().create[0]).toEqual([])
  })

  it('emits edit, approve, reject, receive and delete with the selected row', async () => {
    const wrapper = shallowMount(RefundsView, { propsData: viewProps() })

    const pending = wrapper.findAll('tbody tr').at(0).findAll('.action-cell button')
    await pending.at(0).trigger('click') // edit
    await pending.at(1).trigger('click') // approve
    await pending.at(2).trigger('click') // reject
    await pending.at(3).trigger('click') // delete

    expect(wrapper.emitted().edit[0]).toEqual([ROWS[0]])
    expect(wrapper.emitted().approve[0]).toEqual([ROWS[0]])
    expect(wrapper.emitted().reject[0]).toEqual([ROWS[0]])
    expect(wrapper.emitted().delete[0]).toEqual([ROWS[0]])

    const approved = wrapper.findAll('tbody tr').at(1).findAll('.action-cell button')
    await approved.at(0).trigger('click') // receive
    expect(wrapper.emitted().receive[0]).toEqual([ROWS[1]])
  })
})

describe('App.vue handles RefundsView events', () => {
  it('renders the view with App-owned list data and issues one list request', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    expect(view.exists()).toBe(true)
    expect(view.props('rows')).toEqual(ROWS)
    expect(view.props('columns')).toEqual(COLUMNS)
    expect(view.findAll('tbody tr').length).toBe(2)
    expect(listCalls()).toHaveLength(1)
    // No duplicate management section for refunds.
    expect(wrapper.findAll('section.card.management')).toHaveLength(1)
  })

  it('applies filter and search events to the existing request params', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    view.vm.$emit('update-filter', { key: 'status', value: 'REJECTED' })
    await flush()
    expect(wrapper.vm.filters.status).toBe('REJECTED')

    view.vm.$emit('search')
    await flush()
    expect(listCalls().slice(-1)[0]).toEqual([
      '/refund-requests',
      { params: { page: 0, size: 10, status: 'REJECTED' } }
    ])
  })

  it('handles reset, page and page-size events', async () => {
    const { wrapper, view } = await mountAt('/refunds')
    await wrapper.setData({ filters: { ...wrapper.vm.filters, order_number: 'ORD-1' } })

    view.vm.$emit('reset')
    await flush()
    expect(wrapper.vm.filters.order_number).toBe('')

    view.vm.$emit('page', 1)
    await flush()
    expect(listCalls().slice(-1)[0]).toEqual([
      '/refund-requests',
      { params: { page: 1, size: 10 } }
    ])

    view.vm.$emit('page-size', 25)
    await flush()
    expect(wrapper.vm.pageSize).toBe(25)
    expect(listCalls().slice(-1)[0]).toEqual([
      '/refund-requests',
      { params: { page: 0, size: 25 } }
    ])
  })

  it('opens the existing create form from the create event', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    view.vm.$emit('create')
    await flush()
    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editing).toBe(false)
    expect(wrapper.vm.editor).toEqual({
      order_number: '',
      reason: '',
      amount: 0,
      refund_type: 'REFUND_ONLY',
      return_items: []
    })
  })

  it('loads order detail and refundable amount on order selection, keeping refundable-orders scope', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    view.vm.$emit('create')
    await flush()
    await wrapper.setData({
      orderOptions: [
        { order_number: 'ORD-P', status: 'PROCESSING' },
        { order_number: 'ORD-S', status: 'SHIPPED' },
        { order_number: 'ORD-D', status: 'DELIVERED' },
        { order_number: 'ORD-C', status: 'CANCELLED' }
      ]
    })
    expect(wrapper.vm.refundableOrders.map(o => o.order_number)).toEqual([
      'ORD-P',
      'ORD-S',
      'ORD-D'
    ])

    await wrapper.setData({ editor: { ...wrapper.vm.editor, order_number: 'ORD-1' } })
    await wrapper.vm.onRefundOrderChange()
    await flush()
    expect(api.get).toHaveBeenCalledWith('/orders/ORD-1')
    expect(wrapper.vm.editor.amount).toBe(25.5)
    expect(wrapper.vm.editor.return_items).toEqual([
      { orderItemId: 11, sku: 'MUG-001', name: 'Mug', max: 3, quantity: 0 }
    ])
    // The detail modal shows the loaded order's refundable amount.
    expect(wrapper.find('.modal').text()).toContain('可退金额')
    expect(wrapper.find('.modal').text()).toContain('25.5')
  })

  it('keeps refund-type toggle behaviour unchanged', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    view.vm.$emit('create')
    await flush()
    await wrapper.setData({
      editor: {
        ...wrapper.vm.editor,
        refund_type: 'RETURN_AND_REFUND',
        return_items: [{ orderItemId: 11, sku: 'MUG-001', name: 'Mug', max: 3, quantity: 0 }]
      }
    })
    wrapper.vm.onRefundTypeChange()
    expect(wrapper.vm.editor.return_items[0].quantity).toBe(1)

    await wrapper.setData({ editor: { ...wrapper.vm.editor, refund_type: 'REFUND_ONLY' } })
    wrapper.vm.onRefundTypeChange()
    expect(wrapper.vm.editor.return_items[0].quantity).toBe(0)
  })

  it('loads refund detail and review status on edit', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    view.vm.$emit('edit', ROWS[0])
    await flush()
    expect(api.get).toHaveBeenCalledWith('/refund-requests/1')
    expect(wrapper.vm.refundDetail).toEqual({
      id: 1,
      status: 'PENDING_MANUAL_APPROVAL',
      refund_type: 'REFUND_ONLY',
      inventory_received: false
    })
    expect(wrapper.vm.originalKey).toBe(1)
    expect(wrapper.find('.modal').text()).toContain('已验收入库')
  })

  it('approves a refund through the existing flow', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    view.vm.$emit('approve', ROWS[0])
    await flush()
    expect(window.confirm).toHaveBeenCalled()
    expect(api.post).toHaveBeenCalledWith('/refund-requests/1/approve')
    expect(listCalls()).toHaveLength(2)
  })

  it('rejects a refund through the existing flow', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    view.vm.$emit('reject', ROWS[0])
    await flush()
    expect(window.confirm).toHaveBeenCalled()
    expect(api.post).toHaveBeenCalledWith('/refund-requests/1/reject')
    expect(listCalls()).toHaveLength(2)
  })

  it('honours a declined confirmation', async () => {
    window.confirm = jest.fn(() => false)
    const { view } = await mountAt('/refunds')

    view.vm.$emit('approve', ROWS[0])
    await flush()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('deletes a refund through App.vue and reloads the list', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    view.vm.$emit('delete', ROWS[0])
    await flush()
    expect(window.confirm).toHaveBeenCalled()
    expect(api.delete).toHaveBeenCalledWith('/refund-requests/1')
    expect(listCalls()).toHaveLength(2)
  })

  it('opens the receive modal, keeps quantity constraints and payload, then returns inventory and refreshes', async () => {
    const { wrapper, view } = await mountAt('/refunds')

    view.vm.$emit('receive', ROWS[1])
    await flush()

    expect(api.get).toHaveBeenCalledWith('/refund-requests/2')
    expect(wrapper.vm.receiveRefundId).toBe(2)
    expect(wrapper.vm.showReceive).toBe(true)
    // EN: received_quantity is the original accepted_quantity (1); the rest stay the remaining (2).
    // 中文：received_quantity 为原始 accepted_quantity（1），其余字段仍为剩余量（2）。
    expect(wrapper.vm.receiveLines).toEqual([
      {
        order_item_id: 11,
        sku: 'MUG-001',
        name: 'Mug',
        quantity: 3,
        max: 2,
        accepted_quantity: 2,
        received_quantity: 1
      }
    ])
    const modal = wrapper.find('.modal-backdrop')
    const input = modal.find('input[type="number"]')
    expect(input.attributes('max')).toBe('2')
    expect(input.element.value).toBe('2')

    await input.setValue('1')
    await wrapper.vm.confirmReceive()
    await flush()

    // The existing receive API is called with the accepted quantities; inventory return runs on the server.
    expect(api.post).toHaveBeenCalledWith('/refund-requests/2/receive', {
      items: [{ order_item_id: 11, accepted_quantity: 1 }]
    })
    expect(wrapper.vm.showReceive).toBe(false)
    expect(listCalls()).toHaveLength(2)
  })

  it('renders correctly when entering from another page, leaving and returning', async () => {
    const { wrapper, view } = await mountAt('/orders')
    expect(view.exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(3).trigger('click')
    await flush()
    expect(wrapper.findComponent(RefundsView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('ORD-1')

    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()
    expect(wrapper.findComponent(RefundsView).exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(3).trigger('click')
    await flush()
    expect(wrapper.findComponent(RefundsView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('ORD-1')
    // One list request per entry into the page; the view never fetches on its own.
    expect(listCalls()).toHaveLength(2)
  })

  it('leaves other management pages on their own dedicated views', async () => {
    const { wrapper } = await mountAt('/inventory')
    expect(wrapper.findComponent(RefundsView).exists()).toBe(false)
    expect(wrapper.find('section.card.management').exists()).toBe(true)
  })
})
