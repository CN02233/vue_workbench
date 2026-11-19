// EN: Inventory view tests: presentation, event hand-off and unchanged App.vue business logic.
// 中文：库存视图测试：展示、事件交接，以及 App.vue 业务行为保持不变。
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
import InventoryView from '@/views/InventoryView.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const api = axios.create()

const ROWS = [
  { sku: 'MUG-001', name: 'Mug', stock: 9, price: '9.90', order_count: 0 },
  { sku: 'CAP-001', name: 'Cap', stock: 4, price: '5.00', order_count: 2 }
]

const COLUMNS = ['sku', 'name', 'stock', 'price', 'order_count']
const FILTER_FIELDS = [
  { key: 'sku' },
  { key: 'name' },
  { key: 'min_stock', type: 'number', min: 0, step: 1 },
  { key: 'max_stock', type: 'number', min: 0, step: 1 },
  { key: 'min_price', type: 'number', min: 0, step: 0.01 },
  { key: 'max_price', type: 'number', min: 0, step: 0.01 }
]

const FILTERS = {
  sku: '',
  name: '',
  min_stock: '',
  max_stock: '',
  min_price: '',
  max_price: ''
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

// EN: Only the list request carries `page`; loadOptions uses size-only params on the same URL.
// 中文：只有列表请求带 `page`；loadOptions 在同一 URL 上只带 size 参数。
const listCalls = () =>
  api.get.mock.calls.filter(call => call[0] === '/products' && call[1]?.params?.page !== undefined)

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
  return { wrapper, router, view: wrapper.findComponent(InventoryView) }
}

beforeEach(() => {
  api.get.mockReset()
  api.post.mockReset()
  api.put.mockReset()
  api.delete.mockReset()
  api.get.mockImplementation((url, config) => {
    if (url === '/health') return Promise.resolve({ data: { status: 'UP' } })
    if (url === '/products' && config?.params?.page !== undefined)
      return Promise.resolve({
        data: { content: ROWS, page: { number: 0, totalPages: 2, totalElements: 6, size: 10 } }
      })
    if (url === '/products/MUG-001/orders')
      return Promise.resolve({
        data: [{ order_number: 'ORD-M1', order_status: 'SHIPPED', quantity: 2 }]
      })
    if (url === '/products/MUG-001/stock-movements')
      return Promise.resolve({
        data: [{ id: 1, movement_type: 'IN', delta: 10, balance_after: 9, reference: 'PO-1' }]
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

describe('InventoryView standalone rendering', () => {
  it('renders the management layout with SKU, stock, price and linked-order count', () => {
    const wrapper = shallowMount(InventoryView, { propsData: viewProps() })

    expect(wrapper.find('section.card.management').exists()).toBe(true)
    expect(wrapper.findAll('thead th').wrappers.map(th => th.text())).toEqual([
      'SKU',
      '商品名称',
      '库存',
      '价格',
      '关联订单',
      '操作'
    ])
    expect(wrapper.findAll('tbody tr').length).toBe(2)
    const cells = wrapper.findAll('tbody tr').at(0).findAll('td')
    expect(cells.at(0).text()).toBe('MUG-001')
    expect(cells.at(1).text()).toBe('Mug')
    expect(cells.at(2).text()).toBe('9')
    expect(cells.at(3).text()).toBe('9.90')
    expect(cells.at(4).text()).toBe('0')
    expect(wrapper.find('.pagination').text()).toContain('1 / 2 · 6')
  })

  it('shows the linked-order count and keeps the delete button enabled at zero', () => {
    const wrapper = shallowMount(InventoryView, { propsData: viewProps() })
    const buttons = wrapper.findAll('tbody tr').at(0).findAll('button.danger')

    expect(buttons).toHaveLength(1)
    expect(buttons.at(0).attributes('disabled')).toBeUndefined()
  })

  it('disables delete and shows a title when the product has linked orders', () => {
    const wrapper = shallowMount(InventoryView, { propsData: viewProps() })
    const deleteButton = wrapper.findAll('tbody tr').at(1).find('button.danger')

    expect(deleteButton.attributes('disabled')).toBe('disabled')
    expect(deleteButton.attributes('title')).toBe('已关联订单，不能删除')
  })

  it('shows the empty placeholder when there are no rows', () => {
    const wrapper = shallowMount(InventoryView, { propsData: viewProps({ rows: [] }) })

    expect(wrapper.find('tbody tr td.empty').text()).toBe('暂无数据')
  })
})

describe('InventoryView events', () => {
  it('emits filter values and the search event', async () => {
    const wrapper = shallowMount(InventoryView, { propsData: viewProps() })

    const inputs = wrapper.findAll('.filters input')
    await inputs.at(0).setValue('MUG')
    expect(wrapper.emitted()['update-filter'][0]).toEqual([{ key: 'sku', value: 'MUG' }])
    await inputs.at(2).setValue('3')
    expect(wrapper.emitted()['update-filter'][1]).toEqual([{ key: 'min_stock', value: '3' }])

    await wrapper.findAll('.filters button').at(0).trigger('click')
    expect(wrapper.emitted().search).toHaveLength(1)
  })

  it('emits reset, page and page-size events', async () => {
    const wrapper = shallowMount(InventoryView, { propsData: viewProps() })

    await wrapper.findAll('.filters button').at(1).trigger('click')
    expect(wrapper.emitted().reset).toHaveLength(1)

    await wrapper.findAll('.pagination button').at(1).trigger('click')
    expect(wrapper.emitted().page[0]).toEqual([1])

    await wrapper.find('.pagination select').setValue('25')
    expect(wrapper.emitted()['page-size'][0]).toEqual([25])
  })

  it('emits create, edit and delete with the selected row', async () => {
    const wrapper = shallowMount(InventoryView, { propsData: viewProps() })

    await wrapper.find('.management-heading button').trigger('click')
    expect(wrapper.emitted().create).toHaveLength(1)

    const actions = wrapper.findAll('.action-cell button')
    await actions.at(0).trigger('click')
    expect(wrapper.emitted().edit[0]).toEqual([ROWS[0]])

    await actions.at(1).trigger('click')
    expect(wrapper.emitted().delete[0]).toEqual([ROWS[0]])
  })
})

describe('App.vue handles InventoryView events', () => {
  it('renders the view with App-owned list data and issues one list request', async () => {
    const { wrapper, view } = await mountAt('/inventory')

    expect(view.exists()).toBe(true)
    expect(view.props('rows')).toEqual(ROWS)
    expect(view.props('columns')).toEqual(COLUMNS)
    expect(view.findAll('tbody tr').length).toBe(2)
    expect(listCalls()).toHaveLength(1)
    // The generic management section must not render a duplicate inventory table.
    expect(wrapper.findAll('section.card.management')).toHaveLength(1)
  })

  it('applies filter and search events to the existing request params', async () => {
    const { wrapper, view } = await mountAt('/inventory')

    view.vm.$emit('update-filter', { key: 'sku', value: 'MUG' })
    await flush()
    expect(wrapper.vm.filters.sku).toBe('MUG')

    view.vm.$emit('search')
    await flush()
    expect(listCalls().slice(-1)[0]).toEqual([
      '/products',
      { params: { page: 0, size: 10, sku: 'MUG' } }
    ])
  })

  it('handles reset, page and page-size events', async () => {
    const { wrapper, view } = await mountAt('/inventory')
    await wrapper.setData({ filters: { ...wrapper.vm.filters, name: 'Mug' } })

    view.vm.$emit('reset')
    await flush()
    expect(wrapper.vm.filters.name).toBe('')

    view.vm.$emit('page', 1)
    await flush()
    expect(listCalls().slice(-1)[0]).toEqual(['/products', { params: { page: 1, size: 10 } }])

    view.vm.$emit('page-size', 25)
    await flush()
    expect(wrapper.vm.pageSize).toBe(25)
    expect(listCalls().slice(-1)[0]).toEqual(['/products', { params: { page: 0, size: 25 } }])
  })

  it('opens the existing create and edit forms from view events', async () => {
    const { wrapper, view } = await mountAt('/inventory')

    view.vm.$emit('create')
    await flush()
    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editing).toBe(false)
    expect(wrapper.vm.editor).toEqual({ sku: '', name: '', stock: 0, price: 0, delta: 0, note: '' })
    // Opening the form must not submit anything yet.
    expect(api.post).not.toHaveBeenCalled()

    wrapper.vm.closeForm()
    view.vm.$emit('edit', ROWS[0])
    await flush()
    expect(wrapper.vm.editing).toBe(true)
    expect(wrapper.vm.originalKey).toBe('MUG-001')
    expect(wrapper.vm.editor).toEqual({
      sku: 'MUG-001',
      name: 'Mug',
      stock: 9,
      price: '9.90',
      delta: 0,
      note: ''
    })
  })

  it('loads linked orders and stock movements when editing, and keeps stock non-editable', async () => {
    const { wrapper, view } = await mountAt('/inventory')

    view.vm.$emit('edit', ROWS[0])
    await flush()

    expect(api.get).toHaveBeenCalledWith('/products/MUG-001/orders', { params: { limit: 10 } })
    expect(api.get).toHaveBeenCalledWith('/products/MUG-001/stock-movements', {
      params: { limit: 10 }
    })
    expect(wrapper.vm.linkedOrders).toEqual([
      { order_number: 'ORD-M1', order_status: 'SHIPPED', quantity: 2 }
    ])
    expect(wrapper.vm.movements).toEqual([
      { id: 1, movement_type: 'IN', delta: 10, balance_after: 9, reference: 'PO-1' }
    ])
    // SKU and stock inputs are disabled during edit, and both tables remain rendered.
    const modal = wrapper.find('.modal')
    expect(modal.findAll('input[disabled]').length).toBe(2)
    expect(modal.text()).toContain('关联订单')
    expect(modal.text()).toContain('库存流水')
    expect(modal.text()).toContain('ORD-M1')
    expect(modal.text()).toContain('PO-1')
  })

  it('keeps stock changes on adjustStock, including the default note', async () => {
    const { wrapper, view } = await mountAt('/inventory')

    view.vm.$emit('edit', ROWS[0])
    await flush()
    await wrapper.setData({ editor: { ...wrapper.vm.editor, delta: -3 } })
    await wrapper.vm.saveManagement()

    expect(api.put).toHaveBeenCalledWith('/products/MUG-001', {
      sku: 'MUG-001',
      name: 'Mug',
      stock: 9,
      price: '9.90'
    })
    expect(api.post).toHaveBeenCalledWith('/products/MUG-001/stock-adjustments', {
      delta: -3,
      note: 'Manual adjustment from workbench'
    })
  })

  it('keeps a custom adjustment note and ignores a zero delta', async () => {
    const { wrapper, view } = await mountAt('/inventory')

    view.vm.$emit('edit', ROWS[0])
    await flush()
    await wrapper.setData({ editor: { ...wrapper.vm.editor, delta: 0, note: 'count fix' } })
    await wrapper.vm.saveManagement()

    expect(api.post).not.toHaveBeenCalledWith(
      '/products/MUG-001/stock-adjustments',
      expect.anything()
    )
  })

  it('creates a product with initial stock through the original endpoint', async () => {
    const { wrapper, view } = await mountAt('/inventory')

    view.vm.$emit('create')
    await flush()
    await wrapper.setData({
      editor: { sku: 'NEW-1', name: 'New', stock: 12, price: 3, delta: 0, note: '' }
    })
    await wrapper.vm.saveManagement()

    expect(api.post).toHaveBeenCalledWith(
      '/products',
      { sku: 'NEW-1', name: 'New', stock: 12, price: 3 },
      undefined
    )
    expect(api.put).not.toHaveBeenCalled()
  })

  it('refuses to delete a product that has linked orders', async () => {
    const { wrapper, view } = await mountAt('/inventory')

    view.vm.$emit('delete', ROWS[1])
    await flush()

    expect(window.confirm).not.toHaveBeenCalled()
    expect(api.delete).not.toHaveBeenCalled()
    expect(wrapper.vm.error).toBe('已关联订单，不能删除')
    expect(wrapper.find('.toast').text()).toContain('已关联订单，不能删除')
  })

  it('deletes an unreferenced product through App.vue and reloads the list', async () => {
    const { wrapper, view } = await mountAt('/inventory')

    view.vm.$emit('delete', ROWS[0])
    await flush()

    expect(window.confirm).toHaveBeenCalled()
    expect(api.delete).toHaveBeenCalledWith('/products/MUG-001')
    expect(listCalls()).toHaveLength(2)
  })

  it('renders correctly when entering from another page, leaving and returning', async () => {
    const { wrapper, view } = await mountAt('/orders')
    expect(view.exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(4).trigger('click')
    await flush()
    expect(wrapper.findComponent(InventoryView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('MUG-001')

    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()
    expect(wrapper.findComponent(InventoryView).exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(4).trigger('click')
    await flush()
    expect(wrapper.findComponent(InventoryView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('MUG-001')
    // One list request per entry into the page; the view never fetches on its own.
    expect(listCalls()).toHaveLength(2)
  })
})
