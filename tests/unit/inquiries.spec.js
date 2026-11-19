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
import InquiryEditor from '@/components/management/InquiryEditor.vue'
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

const COLUMNS = [
  'id',
  'customer_email',
  'subject',
  'ai_category',
  'category',
  'confidence',
  'analysis_source',
  'needs_human_review',
  'created_at'
]
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
      'AI 原始分类',
      '分类',
      'AI 置信度',
      '分析来源',
      '建议人工审核',
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

/* ------------------------------------------- AI analysis in the inquiry list */

const AI_ROW = {
  id: 11,
  customer_email: 'ai@b.com',
  subject: 'Where is my order?',
  ai_category: 'ORDER_QUERY',
  category: 'COMPLAINT', // EN: human already edited this. 中文：人工已修改业务分类。
  confidence: 0.92,
  analysis_source: 'AI',
  needs_human_review: true,
  suggested_reply: 'Track your order here.',
  created_at: '2026-11-01T10:20:30'
}

const cellsOf = wrapper =>
  wrapper
    .findAll('tbody tr')
    .at(0)
    .findAll('td')
    .wrappers.map(td => td.text())

describe('InquiriesView AI analysis columns', () => {
  it('shows the original AI category separately from the current business category', () => {
    const wrapper = shallowMount(InquiriesView, { propsData: viewProps({ rows: [AI_ROW] }) })
    const cells = cellsOf(wrapper)

    expect(cells[3]).toBe('订单查询')
    expect(cells[4]).toBe('投诉')
  })

  it('renders confidence as a percentage and never as NaN', () => {
    const wrapper = shallowMount(InquiriesView, { propsData: viewProps({ rows: [AI_ROW] }) })

    expect(cellsOf(wrapper)[5]).toBe('92%')
    expect(wrapper.vm.confidenceText(0.5)).toBe('50%')
    expect(wrapper.vm.confidenceText(null)).toBe('—')
    expect(wrapper.vm.confidenceText(undefined)).toBe('—')
    expect(wrapper.vm.confidenceText(NaN)).toBe('—')
  })

  it('translates AI and RULE_BASED sources and shows the review hint', () => {
    const ai = shallowMount(InquiriesView, { propsData: viewProps({ rows: [AI_ROW] }) })
    expect(cellsOf(ai)[6]).toBe('AI')
    expect(cellsOf(ai)[7]).toBe('建议人工审核')

    const rule = shallowMount(InquiriesView, {
      propsData: {
        ...viewProps(),
        rows: [{ ...AI_ROW, analysis_source: 'RULE_BASED', needs_human_review: false }]
      }
    })
    expect(cellsOf(rule)[6]).toBe('规则分析')
    expect(cellsOf(rule)[7]).toBe('无需人工审核')
  })

  it('renders a safe placeholder for historical rows without AI fields', () => {
    const wrapper = shallowMount(InquiriesView, { propsData: viewProps({ rows: [ROWS[0]] }) })
    const cells = cellsOf(wrapper)

    expect(cells.slice(3, 8)).toEqual(['—', '订单查询', '—', '—', '—'])
    expect(wrapper.text()).not.toContain('NaN')
    expect(wrapper.text()).not.toContain('undefined')
  })
})

/* ------------------------------------------- AI analysis detail + copy reply */

const AI_DETAIL = {
  ai_category: 'REFUND',
  category: 'REFUND',
  confidence: 0.88,
  analysis_source: 'AI',
  needs_human_review: true,
  suggested_reply: 'We will review your refund.'
}

function mountEditor(overrides = {}) {
  return mount(InquiryEditor, {
    propsData: {
      locale: 'zh',
      page: 'inquiries',
      busy: false,
      editing: true,
      editor: {
        customer_email: 'a@b.com',
        subject: 'Refund',
        body: 'PRIVATE_ORIGINAL_BODY',
        category: 'REFUND'
      },
      inquiryCategories: INQUIRY_CATEGORIES,
      aiDetail: AI_DETAIL,
      ...overrides
    }
  })
}

describe('InquiryEditor AI analysis detail', () => {
  it('shows the full AI snapshot with a separate suggested reply area', () => {
    const wrapper = mountEditor()

    expect(wrapper.find('.ai-analysis').exists()).toBe(true)
    expect(wrapper.find('.ai-grid').text()).toContain('AI 原始分类')
    expect(wrapper.find('.ai-grid').text()).toContain('退款申请')
    expect(wrapper.find('.ai-grid').text()).toContain('88%')
    expect(wrapper.find('.ai-grid').text()).toContain('AI')
    expect(wrapper.find('.ai-grid').text()).toContain('建议人工审核')
    expect(wrapper.find('.reply-text').text()).toBe('We will review your refund.')
    expect(wrapper.find('.reply-text').text()).not.toContain('PRIVATE_ORIGINAL_BODY')
  })

  it('copies the full suggested reply and reports success', async () => {
    const writeText = jest.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    })
    const wrapper = mountEditor()

    await wrapper.find('.copy-reply').trigger('click')
    await flush()
    await flush()

    expect(writeText).toHaveBeenCalledWith('We will review your refund.')
    expect(wrapper.emitted().feedback[0][0]).toEqual({ success: '回复已复制' })
  })

  it('reports an explicit failure when the clipboard rejects the copy', async () => {
    const writeText = jest.fn(() => Promise.reject(new Error('denied')))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    })
    const wrapper = mountEditor()

    await wrapper.find('.copy-reply').trigger('click')
    await flush()
    await flush()

    expect(wrapper.emitted().feedback[0][0]).toEqual({ error: '复制失败，请手动选择并复制文本' })
  })

  it('disables copying and shows a placeholder when no reply was suggested', () => {
    const wrapper = mountEditor({ aiDetail: { ...AI_DETAIL, suggested_reply: null } })

    expect(wrapper.find('.copy-reply').attributes('disabled')).toBe('disabled')
    expect(wrapper.find('.reply-text').text()).toBe('暂无 AI 建议回复')
  })

  it('shows the no-AI-data state for historical records', () => {
    const wrapper = mountEditor({
      aiDetail: {
        ai_category: null,
        category: 'OTHER',
        confidence: null,
        analysis_source: null,
        needs_human_review: null,
        suggested_reply: null
      }
    })

    expect(wrapper.text()).toContain('暂无 AI 分析数据')
    expect(wrapper.find('.ai-grid').exists()).toBe(false)
    expect(wrapper.find('.copy-reply').exists()).toBe(false)
  })
})

/* ------------------------------------------- App.vue wiring */

describe('App.vue keeps the AI snapshot through manual edits', () => {
  it('loads the detail from the server and never submits AI fields on category change', async () => {
    const detail = {
      id: 1,
      customer_email: 'a@b.com',
      subject: 'Where is my order?',
      category: 'ORDER_QUERY',
      ai_category: 'ORDER_QUERY',
      confidence: 0.92,
      analysis_source: 'AI',
      needs_human_review: true,
      suggested_reply: 'Track your order.'
    }
    api.get.mockImplementation(url => {
      if (url === '/health') return Promise.resolve({ data: { status: 'UP' } })
      if (url === '/inquiries')
        return Promise.resolve({
          data: {
            content: [detail],
            page: { number: 0, totalPages: 1, totalElements: 1, size: 10 }
          }
        })
      if (url === '/inquiries/1') return Promise.resolve({ data: detail })
      if (url === '/customers' || url === '/products' || url === '/orders')
        return Promise.resolve({ data: { content: [] } })
      return Promise.resolve({ data: {} })
    })

    const { wrapper, view } = await mountAt('/inquiries')
    view.vm.$emit('edit', detail)
    await flush()
    await flush()

    expect(api.get).toHaveBeenCalledWith('/inquiries/1')
    expect(wrapper.vm.inquiryAiDetail.ai_category).toBe('ORDER_QUERY')
    const editor = wrapper.findComponent(InquiryEditor)
    expect(editor.find('.reply-text').text()).toBe('Track your order.')

    await editor.find('select').setValue('COMPLAINT')
    await wrapper.vm.saveManagement()
    await flush()

    expect(api.put).toHaveBeenCalledWith('/inquiries/1', {
      customer_email: 'a@b.com',
      subject: 'Where is my order?',
      body: '',
      category: 'COMPLAINT'
    })
    expect(wrapper.vm.inquiryAiDetail.ai_category).toBe('ORDER_QUERY')
    expect(wrapper.vm.inquiryAiDetail.confidence).toBe(0.92)
  })

  it('shows the success toast reported by the copy action', async () => {
    const { wrapper } = await mountAt('/inquiries')
    const writeText = jest.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    })

    wrapper.vm.setFeedback({ success: '回复已复制' })
    await flush()

    expect(wrapper.vm.success).toBe('回复已复制')
    expect(wrapper.find('.toast.success').text()).toBe('回复已复制')
  })
})
