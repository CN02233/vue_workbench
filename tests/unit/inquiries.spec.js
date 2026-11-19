// EN: Inquiries view tests: presentation, event hand-off and unchanged App.vue business logic.
// 中文：咨询视图测试：展示、事件交接，以及 App.vue 业务行为保持不变。
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
import InquiriesView from '@/views/InquiriesView.vue'
import { INQUIRY_CATEGORIES } from '@/utils/constants'

const localVue = createLocalVue()
localVue.use(VueRouter)

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const api = axios.create()

const ROWS = [
  {
    id: 1,
    customer_email: 'a@b.com',
    subject: 'Where is my order?',
    category: 'ORDER_QUERY',
    created_at: '2026-11-01T10:20:30'
  },
  {
    id: 2,
    customer_email: 'c@d.com',
    subject: 'Refund please',
    category: 'REFUND',
    created_at: '2026-11-02T11:00:00'
  }
]

const COLUMNS = ['id', 'customer_email', 'subject', 'category', 'created_at']
const FILTER_FIELDS = [
  { key: 'customer_email' },
  { key: 'subject' },
  { key: 'category', options: INQUIRY_CATEGORIES }
]

function viewProps(overrides = {}) {
  return {
    locale: 'zh',
    rows: ROWS,
    columns: COLUMNS,
    filters: { customer_email: '', subject: '', category: '' },
    filterFields: FILTER_FIELDS,
    pageNumber: 0,
    pageSize: 10,
    totalPages: 2,
    totalElements: 6,
    ...overrides
  }
}

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
  return { wrapper, router, view: wrapper.findComponent(InquiriesView) }
}

beforeEach(() => {
  api.get.mockReset()
  api.post.mockReset()
  api.put.mockReset()
  api.delete.mockReset()
  api.get.mockImplementation(url => {
    if (url === '/health') return Promise.resolve({ data: { status: 'UP' } })
    if (url === '/inquiries')
      return Promise.resolve({
        data: { content: ROWS, page: { number: 0, totalPages: 2, totalElements: 6, size: 10 } }
      })
    if (url === '/customers' || url === '/products' || url === '/orders')
      return Promise.resolve({ data: { content: [] } })
    return Promise.resolve({ data: {} })
  })
  api.post.mockImplementation(() => Promise.resolve({ data: { id: 3 } }))
  api.put.mockImplementation(() => Promise.resolve({ data: { id: 1 } }))
  api.delete.mockImplementation(() => Promise.resolve({ data: {} }))
  window.confirm = jest.fn(() => true)
  window.scrollTo = jest.fn()
})

describe('InquiriesView standalone rendering', () => {
  it('renders the management layout with columns, rows and pagination', () => {
    const wrapper = shallowMount(InquiriesView, { propsData: viewProps() })

    expect(wrapper.find('section.card.management').exists()).toBe(true)
    expect(wrapper.findAll('thead th').wrappers.map(th => th.text())).toEqual([
      '编号',
      '客户邮箱',
      '主题',
      '分类',
      '创建时间',
      '操作'
    ])
    expect(wrapper.findAll('tbody tr').length).toBe(2)
    expect(wrapper.find('tbody tr td').text()).toBe('1')
    expect(wrapper.text()).toContain('订单查询')
    expect(wrapper.text()).toContain('2026-11-01 10:20')
    expect(wrapper.find('.pagination').text()).toContain('1 / 2 · 6')
  })

  it('shows the empty placeholder when there are no rows', () => {
    const wrapper = shallowMount(InquiriesView, { propsData: viewProps({ rows: [] }) })

    expect(wrapper.find('tbody tr td.empty').text()).toBe('暂无数据')
  })
})

describe('InquiriesView events', () => {
  it('emits filter input values and the search event', async () => {
    const wrapper = shallowMount(InquiriesView, { propsData: viewProps() })

    const inputs = wrapper.findAll('.filters input')
    await inputs.at(0).setValue('a@b.com')
    expect(wrapper.emitted()['update-filter'][0]).toEqual([
      { key: 'customer_email', value: 'a@b.com' }
    ])

    const select = wrapper.findAll('.filters select').at(0)
    await select.setValue('REFUND')
    expect(wrapper.emitted()['update-filter'][1]).toEqual([{ key: 'category', value: 'REFUND' }])

    await wrapper.findAll('.filters button').at(0).trigger('click')
    expect(wrapper.emitted().search).toHaveLength(1)
  })

  it('emits reset, page and page-size events', async () => {
    const wrapper = shallowMount(InquiriesView, { propsData: viewProps() })

    await wrapper.findAll('.filters button').at(1).trigger('click')
    expect(wrapper.emitted().reset).toHaveLength(1)

    await wrapper.findAll('.pagination button').at(1).trigger('click')
    expect(wrapper.emitted().page[0]).toEqual([1])

    await wrapper.find('.pagination select').setValue('25')
    expect(wrapper.emitted()['page-size'][0]).toEqual([25])
  })

  it('emits create, edit and delete with the selected row', async () => {
    const wrapper = shallowMount(InquiriesView, { propsData: viewProps() })

    await wrapper.find('.management-heading button').trigger('click')
    expect(wrapper.emitted().create).toHaveLength(1)

    const actions = wrapper.findAll('.action-cell button')
    await actions.at(0).trigger('click')
    expect(wrapper.emitted().edit[0]).toEqual([ROWS[0]])

    await actions.at(1).trigger('click')
    expect(wrapper.emitted().delete[0]).toEqual([ROWS[0]])
  })
})

describe('App.vue handles InquiriesView events', () => {
  it('renders the view with App-owned list data and issues one list request', async () => {
    const { wrapper, view } = await mountAt('/inquiries')

    expect(view.exists()).toBe(true)
    expect(view.props('rows')).toEqual(ROWS)
    expect(view.props('columns')).toEqual(COLUMNS)
    expect(view.findAll('tbody tr').length).toBe(2)
    expect(api.get.mock.calls.filter(call => call[0] === '/inquiries')).toHaveLength(1)
  })

  it('applies filter and search events to the existing request params', async () => {
    const { wrapper, view } = await mountAt('/inquiries')

    view.vm.$emit('update-filter', { key: 'customer_email', value: 'a@b.com' })
    await flush()
    expect(wrapper.vm.filters.customer_email).toBe('a@b.com')

    view.vm.$emit('search')
    await flush()
    expect(api.get).toHaveBeenCalledWith('/inquiries', {
      params: { page: 0, size: 10, customer_email: 'a@b.com' }
    })
  })

  it('handles reset, page and page-size events', async () => {
    const { wrapper, view } = await mountAt('/inquiries')
    await wrapper.setData({ filters: { ...wrapper.vm.filters, subject: 'hello' } })

    view.vm.$emit('reset')
    await flush()
    expect(wrapper.vm.filters.subject).toBe('')

    view.vm.$emit('page', 1)
    await flush()
    expect(api.get).toHaveBeenLastCalledWith('/inquiries', {
      params: { page: 1, size: 10 }
    })

    view.vm.$emit('page-size', 25)
    await flush()
    expect(wrapper.vm.pageSize).toBe(25)
    expect(api.get).toHaveBeenLastCalledWith('/inquiries', {
      params: { page: 0, size: 25 }
    })
  })

  it('opens the existing create and edit forms from view events', async () => {
    const { wrapper, view } = await mountAt('/inquiries')

    view.vm.$emit('create')
    await flush()
    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editing).toBe(false)
    expect(wrapper.vm.editor).toEqual({
      customer_email: '',
      subject: '',
      body: '',
      category: 'OTHER'
    })

    wrapper.vm.closeForm()
    view.vm.$emit('edit', ROWS[0])
    await flush()
    expect(wrapper.vm.editing).toBe(true)
    expect(wrapper.vm.editor).toEqual({
      customer_email: 'a@b.com',
      subject: 'Where is my order?',
      body: '',
      category: 'ORDER_QUERY'
    })
  })

  it('deletes through App.vue and reloads the list', async () => {
    const { wrapper, view } = await mountAt('/inquiries')

    view.vm.$emit('delete', ROWS[0])
    await flush()

    expect(window.confirm).toHaveBeenCalled()
    expect(api.delete).toHaveBeenCalledWith('/inquiries/1')
    expect(api.get.mock.calls.filter(call => call[0] === '/inquiries')).toHaveLength(2)
  })

  it('keeps create and edit submission payloads unchanged', async () => {
    const { wrapper, view } = await mountAt('/inquiries')

    view.vm.$emit('create')
    await flush()
    await wrapper.setData({
      editor: { customer_email: 'new@b.com', subject: 'New', body: 'Help', category: 'OTHER' }
    })
    await wrapper.vm.saveManagement()
    expect(api.post).toHaveBeenCalledWith(
      '/inquiries',
      { customer_email: 'new@b.com', subject: 'New', body: 'Help' },
      undefined
    )

    wrapper.vm.closeForm()
    view.vm.$emit('edit', ROWS[0])
    await flush()
    await wrapper.setData({ editor: { ...wrapper.vm.editor, subject: 'Updated' } })
    await wrapper.vm.saveManagement()
    expect(api.put).toHaveBeenCalledWith('/inquiries/1', {
      customer_email: 'a@b.com',
      subject: 'Updated',
      body: '',
      category: 'ORDER_QUERY'
    })
  })

  it('renders correctly when entering from another page, leaving and returning', async () => {
    const { wrapper, view } = await mountAt('/orders')
    expect(view.exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(5).trigger('click')
    await flush()
    expect(wrapper.findComponent(InquiriesView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('a@b.com')

    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()
    expect(wrapper.findComponent(InquiriesView).exists()).toBe(false)

    await wrapper.findAll('nav.menu button').at(5).trigger('click')
    await flush()
    expect(wrapper.findComponent(InquiriesView).exists()).toBe(true)
    expect(wrapper.find('tbody tr').text()).toContain('a@b.com')
    // One list request per entry into the page; the view never fetches on its own.
    expect(api.get.mock.calls.filter(call => call[0] === '/inquiries')).toHaveLength(2)
  })
})
