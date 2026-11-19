// EN: Management modal tests: presentation, conditional fields, user input and event hand-off.
// 中文：管理弹窗测试：展示、条件字段、用户输入与事件交接。
// EN: Receive validation is asserted at App.vue level (business rules + API live there).
// 中文：验收数量校验在 App.vue 层断言（业务规则与 API 均在那里）。
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
import OrderEditor from '@/components/management/OrderEditor.vue'
import ShipmentEditor from '@/components/management/ShipmentEditor.vue'
import RefundEditor from '@/components/management/RefundEditor.vue'
import InventoryEditor from '@/components/management/InventoryEditor.vue'
import InquiryEditor from '@/components/management/InquiryEditor.vue'
import ReceiveRefundModal from '@/components/management/ReceiveRefundModal.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const api = axios.create()

/* ------------------------------------------------------------------ OrderEditor */

describe('OrderEditor', () => {
  const createProps = (overrides = {}) => ({
    locale: 'zh',
    page: 'orders',
    editing: false,
    busy: false,
    editor: {
      order_number: '',
      customer_id: '',
      items: [{ sku: '', quantity: 1 }],
      tracking_number: ''
    },
    customers: [{ id: 1, name: 'Zhang', email: 'z@example.com' }],
    productOptions: [{ sku: 'MUG-001', name: 'Mug', price: 9.9, stock: 5 }],
    orderStatuses: ['PROCESSING', 'SHIPPED'],
    orderDetail: null,
    ...overrides
  })

  it('renders the create form with customer, product and stock hint', () => {
    const wrapper = shallowMount(OrderEditor, { propsData: createProps() })

    expect(wrapper.find('.modal-head h3').text()).toContain('订单')
    expect(wrapper.findAll('.item-line')).toHaveLength(1)
    expect(wrapper.find('.hint').text()).toBe('')
    expect(wrapper.find('.form-grid select').findAll('option').length).toBe(2)
    expect(wrapper.find('input').attributes('disabled')).toBeUndefined()
  })

  it('writes user input into the App-owned editor object', async () => {
    const editor = createProps().editor
    const wrapper = shallowMount(OrderEditor, { propsData: createProps({ editor }) })

    await wrapper.find('input').setValue('ORD-9')
    await wrapper.find('.item-line select').setValue('MUG-001')
    await wrapper.find('.item-line input').setValue('3')

    expect(editor.order_number).toBe('ORD-9')
    expect(editor.items[0]).toEqual({ sku: 'MUG-001', quantity: 3 })
    expect(wrapper.find('.hint').text()).toContain('5')
  })

  it('emits add-item and remove-item with the row index', async () => {
    const editor = createProps({
      editor: {
        items: [
          { sku: 'A', quantity: 1 },
          { sku: 'B', quantity: 2 }
        ]
      }
    }).editor
    const wrapper = shallowMount(OrderEditor, { propsData: createProps({ editor }) })

    await wrapper.findAll('.item-line').at(0).find('.remove-line').trigger('click')
    await wrapper.findAll('.secondary').at(0).trigger('click')

    expect(wrapper.emitted()['remove-item'][0]).toEqual([0])
    expect(wrapper.emitted()['add-item']).toHaveLength(1)
  })

  it('shows the loaded order detail, status and related records when editing', () => {
    const wrapper = shallowMount(OrderEditor, {
      propsData: createProps({
        editing: true,
        editor: {
          order_number: 'ORD-1',
          customer_id: 1,
          status: 'SHIPPED',
          tracking_number: 'SF1'
        },
        orderDetail: {
          items: [
            {
              id: 1,
              sku: 'MUG-001',
              name: 'Mug',
              quantity: 2,
              shipped_quantity: 1,
              unit_price: 9.9,
              line_total: 19.8
            }
          ],
          refundable_amount: 10,
          pending_refund_amount: 0,
          shipments: [
            {
              id: 7,
              carrier: 'SF',
              tracking_number: 'SF1',
              status: 'DELIVERED',
              delivered_at: '2026-11-02T10:00:00'
            }
          ],
          refunds: [{ id: 3, status: 'REFUNDED', amount: 5, reason: 'broken' }]
        }
      })
    })

    expect(wrapper.find('input').attributes('disabled')).toBe('disabled')
    expect(wrapper.findAll('.mini-table')).toHaveLength(2)
    expect(wrapper.text()).toContain('MUG-001')
    expect(wrapper.text()).toContain('19.8')
    expect(wrapper.text()).toContain('2026-11-02 10:00')
    expect(wrapper.text()).toContain('broken')
  })

  it('emits save and close from the modal footer', async () => {
    const wrapper = shallowMount(OrderEditor, { propsData: createProps() })
    const buttons = wrapper.findAll('.modal-foot button')

    await buttons.at(0).trigger('click')
    await buttons.at(1).trigger('click')

    expect(wrapper.emitted().save).toHaveLength(1)
    expect(wrapper.emitted().close).toHaveLength(1)
  })
})

/* ---------------------------------------------------------------- ShipmentEditor */

describe('ShipmentEditor', () => {
  const createProps = (overrides = {}) => ({
    locale: 'zh',
    page: 'shipments',
    editing: false,
    busy: false,
    editor: {
      order_number: '',
      carrier: '',
      tracking_number: '',
      estimated_delivery: '',
      receiver_name: '',
      note: '',
      status: 'CREATED',
      location: '',
      description: ''
    },
    shippableOrders: [{ order_number: 'ORD-1', status: 'PROCESSING' }],
    orderDetail: null,
    shippedTotal: 0,
    orderedTotal: 0,
    carriers: ['SF', 'JD'],
    shipmentLines: [],
    shipmentStatusOptions: ['CREATED', 'IN_TRANSIT'],
    shipmentDetail: null,
    ...overrides
  })

  it('renders core fields and the shippable order options', () => {
    const wrapper = shallowMount(ShipmentEditor, { propsData: createProps() })

    expect(wrapper.text()).toContain('物流公司')
    expect(wrapper.text()).toContain('物流单号')
    expect(wrapper.text()).toContain('预计送达')
    expect(wrapper.text()).toContain('收件人')
    expect(wrapper.find('select').findAll('option').length).toBe(2)
    expect(wrapper.findAll('input[list="carrier-options"]')).toHaveLength(1)
  })

  it('shows a hint before an order is selected and renders remaining quantities', () => {
    const wrapper = shallowMount(ShipmentEditor, {
      propsData: createProps({
        shipmentLines: [{ id: 11, sku: 'MUG-001', name: 'Mug', remaining: 2, quantity: 2 }],
        orderDetail: { status: 'PROCESSING', customer_email: 'a@b.com' },
        shippedTotal: 1,
        orderedTotal: 3
      })
    })

    expect(wrapper.text()).not.toContain('请先选择关联订单')
    expect(wrapper.text().replace(/\s+/g, ' ')).toContain('1 / 3')
    expect(wrapper.find('.item-line input').attributes('max')).toBe('2')
    expect(wrapper.text()).toContain('/ 2')
  })

  it('emits shipment-order-change on selection and writes note into the editor', async () => {
    const editor = createProps().editor
    const wrapper = shallowMount(ShipmentEditor, { propsData: createProps({ editor }) })

    await wrapper.find('select').setValue('ORD-1')
    expect(wrapper.emitted()['shipment-order-change']).toHaveLength(1)
    expect(editor.order_number).toBe('ORD-1')

    const inputs = wrapper.findAll('input')
    await inputs.at(inputs.length - 1).setValue('leave at door')
    expect(editor.note).toBe('leave at door')
  })

  it('shows status, location, description, items and tracking events in edit mode', () => {
    const wrapper = shallowMount(ShipmentEditor, {
      propsData: createProps({
        editing: true,
        shipmentDetail: {
          items: [{ id: 11, sku: 'MUG-001', name: 'Mug', quantity: 2 }],
          events: [
            {
              id: 1,
              occurred_at: '2026-11-02T09:00:00',
              status: 'IN_TRANSIT',
              location: 'Hub',
              description: 'departed'
            }
          ]
        }
      })
    })

    expect(wrapper.text()).toContain('物流状态')
    expect(wrapper.text()).toContain('当前位置')
    expect(wrapper.text()).toContain('轨迹说明')
    expect(wrapper.text()).toContain('MUG-001')
    expect(wrapper.text()).toContain('2026-11-02 09:00')
    expect(wrapper.text()).toContain('departed')
    expect(wrapper.find('select').attributes('disabled')).toBe('disabled')
  })

  it('emits save and close', async () => {
    const wrapper = shallowMount(ShipmentEditor, { propsData: createProps() })
    const buttons = wrapper.findAll('.modal-foot button')

    await buttons.at(0).trigger('click')
    await buttons.at(1).trigger('click')

    expect(wrapper.emitted().save).toHaveLength(1)
    expect(wrapper.emitted().close).toHaveLength(1)
  })
})

/* ------------------------------------------------------------------- RefundEditor */

describe('RefundEditor', () => {
  const createProps = (overrides = {}) => ({
    locale: 'zh',
    page: 'refunds',
    editing: false,
    busy: false,
    editor: {
      order_number: '',
      reason: '',
      amount: 0,
      refund_type: 'REFUND_ONLY',
      return_items: []
    },
    refundableOrders: [{ order_number: 'ORD-1', status: 'DELIVERED' }],
    orderDetail: { total_amount: 50, refundable_amount: 25.5 },
    refundTypes: ['REFUND_ONLY', 'RETURN_AND_REFUND'],
    refundDetail: null,
    ...overrides
  })

  it('renders order, refund type, amount and reason fields', () => {
    const wrapper = shallowMount(RefundEditor, { propsData: createProps() })

    expect(wrapper.text()).toContain('退款类型')
    expect(wrapper.text()).toContain('可退金额')
    expect(wrapper.text()).toContain('25.5')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('input[type="number"]').attributes('max')).toBe('25.5')
  })

  it('hides return items for REFUND_ONLY and shows them for RETURN_AND_REFUND', () => {
    const only = shallowMount(RefundEditor, { propsData: createProps() })
    expect(only.text()).not.toContain('退货商品')

    const returning = shallowMount(RefundEditor, {
      propsData: createProps({
        editor: {
          order_number: 'ORD-1',
          reason: '',
          amount: 25.5,
          refund_type: 'RETURN_AND_REFUND',
          return_items: [{ orderItemId: 11, sku: 'MUG-001', name: 'Mug', max: 3, quantity: 1 }]
        }
      })
    })
    expect(returning.text()).toContain('退货商品')
    expect(returning.find('.item-line input').attributes('max')).toBe('3')
  })

  it('emits order-change and refund-type-change while writing fields into the editor', async () => {
    const editor = createProps().editor
    const wrapper = shallowMount(RefundEditor, { propsData: createProps({ editor }) })
    const selects = wrapper.findAll('select')

    await selects.at(0).setValue('ORD-1')
    await selects.at(1).setValue('RETURN_AND_REFUND')
    await wrapper.find('textarea').setValue('broken')

    expect(wrapper.emitted()['order-change']).toHaveLength(1)
    expect(wrapper.emitted()['refund-type-change']).toHaveLength(1)
    expect(editor.reason).toBe('broken')
  })

  it('locks order and type and shows review status while editing', () => {
    const wrapper = shallowMount(RefundEditor, {
      propsData: createProps({
        editing: true,
        refundDetail: { status: 'PENDING_MANUAL_APPROVAL', inventory_received: false }
      })
    })

    expect(wrapper.findAll('select').at(0).attributes('disabled')).toBe('disabled')
    expect(wrapper.findAll('select').at(1).attributes('disabled')).toBe('disabled')
    expect(wrapper.find('input[type="number"]').attributes('disabled')).toBe('disabled')
    expect(wrapper.text()).toContain('审核状态')
    expect(wrapper.text()).toContain('已验收入库')
  })

  it('emits save and close', async () => {
    const wrapper = shallowMount(RefundEditor, { propsData: createProps() })
    const buttons = wrapper.findAll('.modal-foot button')

    await buttons.at(0).trigger('click')
    await buttons.at(1).trigger('click')

    expect(wrapper.emitted().save).toHaveLength(1)
    expect(wrapper.emitted().close).toHaveLength(1)
  })
})

/* ---------------------------------------------------------------- InventoryEditor */

describe('InventoryEditor', () => {
  const createProps = (overrides = {}) => ({
    locale: 'zh',
    page: 'inventory',
    editing: false,
    busy: false,
    editor: { sku: '', name: '', stock: 0, price: 0, delta: 0, note: '' },
    linkedOrders: [],
    movements: [],
    ...overrides
  })

  it('renders an editable stock field for creation', () => {
    const wrapper = shallowMount(InventoryEditor, { propsData: createProps() })

    expect(wrapper.text()).toContain('SKU')
    expect(wrapper.text()).toContain('价格')
    expect(wrapper.findAll('input').at(2).attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('库存调整')
  })

  it('keeps SKU and stock read-only and renders linked orders and movements in edit mode', () => {
    const wrapper = shallowMount(InventoryEditor, {
      propsData: createProps({
        editing: true,
        editor: { sku: 'MUG-001', name: 'Mug', stock: 9, price: 9.9, delta: -3, note: '' },
        linkedOrders: [{ order_number: 'ORD-1', order_status: 'SHIPPED', quantity: 2 }],
        movements: [{ id: 1, movement_type: 'IN', delta: 10, balance_after: 9, reference: 'PO-1' }]
      })
    })

    expect(wrapper.findAll('input[disabled]')).toHaveLength(2)
    expect(wrapper.text()).toContain('库存调整')
    expect(wrapper.text()).toContain('关联订单')
    expect(wrapper.text()).toContain('库存流水')
    expect(wrapper.text()).toContain('ORD-1')
    expect(wrapper.text()).toContain('PO-1')
  })

  it('writes the delta and note into the editor and emits save/close', async () => {
    const editor = createProps({ editing: true }).editor
    const wrapper = shallowMount(InventoryEditor, {
      propsData: createProps({ editing: true, editor })
    })
    const numbers = wrapper.findAll('input[type="number"]')

    await numbers.at(2).setValue('-3')
    await wrapper.findAll('.modal-foot button').at(0).trigger('click')
    await wrapper.findAll('.modal-foot button').at(1).trigger('click')

    expect(editor.delta).toBe(-3)
    expect(wrapper.emitted().save).toHaveLength(1)
    expect(wrapper.emitted().close).toHaveLength(1)
  })
})

/* ------------------------------------------------------------------ InquiryEditor */

describe('InquiryEditor', () => {
  const createProps = (overrides = {}) => ({
    locale: 'zh',
    page: 'inquiries',
    editing: false,
    busy: false,
    editor: { customer_email: '', subject: '', body: '', category: 'OTHER' },
    inquiryCategories: ['ORDER_QUERY', 'OTHER'],
    ...overrides
  })

  it('renders required email, subject and body fields with the original input types', () => {
    const wrapper = shallowMount(InquiryEditor, { propsData: createProps() })

    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').attributes('required')).toBe('required')
    expect(wrapper.find('textarea').attributes('rows')).toBe('4')
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('shows the category selector only while editing', () => {
    const wrapper = shallowMount(InquiryEditor, { propsData: createProps({ editing: true }) })
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.find('select').findAll('option')).toHaveLength(2)
  })

  it('writes input into the editor and emits save/close', async () => {
    const editor = createProps().editor
    const wrapper = shallowMount(InquiryEditor, { propsData: createProps({ editor }) })

    await wrapper.find('input[type="email"]').setValue('a@b.com')
    await wrapper.find('input:not([type="email"])').setValue('Help')
    await wrapper.findAll('.modal-foot button').at(0).trigger('click')
    await wrapper.findAll('.modal-foot button').at(1).trigger('click')

    expect(editor.customer_email).toBe('a@b.com')
    expect(editor.subject).toBe('Help')
    expect(wrapper.emitted().save).toHaveLength(1)
    expect(wrapper.emitted().close).toHaveLength(1)
  })
})

/* -------------------------------------------------------------- ReceiveRefundModal */

describe('ReceiveRefundModal', () => {
  const createProps = (overrides = {}) => ({
    locale: 'zh',
    busy: false,
    lines: [
      { order_item_id: 11, sku: 'MUG-001', name: 'Mug', quantity: 3, max: 2, accepted_quantity: 2 }
    ],
    ...overrides
  })

  it('renders product info and the original min/max/step constraints', () => {
    const wrapper = shallowMount(ReceiveRefundModal, { propsData: createProps() })

    expect(wrapper.find('.modal.small').exists()).toBe(true)
    expect(wrapper.text()).toContain('Mug')
    expect(wrapper.text()).toContain('MUG-001')
    const input = wrapper.find('input[type="number"]')
    expect(input.attributes('min')).toBe('0')
    expect(input.attributes('max')).toBe('2')
    expect(input.attributes('step')).toBe('1')
  })

  it('writes accepted quantity into the App-owned line and emits receive', async () => {
    const lines = createProps().lines
    const wrapper = shallowMount(ReceiveRefundModal, { propsData: createProps({ lines }) })

    await wrapper.find('input').setValue('1')
    await wrapper.findAll('.modal-foot button').at(0).trigger('click')

    expect(lines[0].accepted_quantity).toBe(1)
    expect(wrapper.emitted().receive).toHaveLength(1)
  })

  it('emits close from the backdrop, the close icon and the cancel button', async () => {
    const wrapper = shallowMount(ReceiveRefundModal, { propsData: createProps() })

    await wrapper.find('.modal-backdrop').trigger('click')
    await wrapper.find('.modal-head .icon').trigger('click')
    await wrapper.findAll('.modal-foot button').at(1).trigger('click')

    expect(wrapper.emitted().close).toHaveLength(3)
  })
})

/* ------------------------------------------- App.vue: receive validation + payload */

describe('App.vue receive validation', () => {
  async function mountApp() {
    localStorage.setItem('order-ai-locale', 'zh')
    const router = new VueRouter({
      mode: 'abstract',
      routes: ['dashboard', 'orders', 'shipments', 'refunds', 'inventory', 'inquiries'].map(
        name => ({
          path: `/${name}`,
          name,
          component: App
        })
      )
    })
    router.push('/refunds')
    await router.isReady?.()
    const wrapper = mount(App, { localVue, router })
    await flush()
    await wrapper.setData({ receiveRefundId: 2, showReceive: true, busy: false })
    return wrapper
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
          data: { content: [], page: { number: 0, totalPages: 0, totalElements: 0, size: 10 } }
        })
      if (url === '/customers' || url === '/products' || url === '/orders')
        return Promise.resolve({ data: { content: [] } })
      return Promise.resolve({ data: {} })
    })
    api.post.mockImplementation(() => Promise.resolve({ data: {} }))
    window.scrollTo = jest.fn()
  })

  const receiveCalls = () =>
    api.post.mock.calls.filter(call => call[0] === '/refund-requests/2/receive')

  it('submits the unchanged payload for a valid integer quantity', async () => {
    const wrapper = await mountApp()
    await wrapper.setData({
      receiveLines: [
        {
          order_item_id: 11,
          sku: 'MUG-001',
          name: 'Mug',
          quantity: 3,
          max: 2,
          accepted_quantity: 1
        }
      ]
    })

    await wrapper.vm.confirmReceive()
    await flush()

    expect(receiveCalls()).toEqual([
      ['/refund-requests/2/receive', { items: [{ order_item_id: 11, accepted_quantity: 1 }] }]
    ])
    expect(wrapper.vm.showReceive).toBe(false)
    expect(wrapper.vm.error).toBe('')
  })

  it('allows zero as the lower boundary (only values < 0 are forbidden)', async () => {
    const wrapper = await mountApp()
    await wrapper.setData({
      receiveLines: [
        {
          order_item_id: 11,
          sku: 'MUG-001',
          name: 'Mug',
          quantity: 3,
          max: 2,
          accepted_quantity: 0
        }
      ]
    })

    await wrapper.vm.confirmReceive()
    await flush()

    expect(receiveCalls()[0][1]).toEqual({ items: [{ order_item_id: 11, accepted_quantity: 0 }] })
  })

  it.each([
    ['negative', -1],
    ['above remaining', 3],
    ['decimal', 1.5],
    ['NaN', NaN],
    ['empty', ''],
    ['non-numeric text', 'abc']
  ])('does not call the API for an invalid quantity (%s)', async (_label, value) => {
    const wrapper = await mountApp()
    await wrapper.setData({
      receiveLines: [
        {
          order_item_id: 11,
          sku: 'MUG-001',
          name: 'Mug',
          quantity: 3,
          max: 2,
          accepted_quantity: value
        }
      ]
    })

    await wrapper.vm.confirmReceive()
    await flush()

    expect(receiveCalls()).toHaveLength(0)
    expect(wrapper.vm.showReceive).toBe(true)
    expect(wrapper.vm.error).toBeTruthy()
  })

  it('rejects invalid input typed into the modal before any API call', async () => {
    const wrapper = await mountApp()
    await wrapper.setData({
      receiveLines: [
        {
          order_item_id: 11,
          sku: 'MUG-001',
          name: 'Mug',
          quantity: 3,
          max: 2,
          accepted_quantity: 2
        }
      ]
    })
    const modal = wrapper.findComponent(ReceiveRefundModal)

    await modal.find('input').setValue('9')
    await modal.findAll('.modal-foot button').at(0).trigger('click')
    await flush()

    expect(receiveCalls()).toHaveLength(0)
    expect(wrapper.vm.error).toBeTruthy()
  })
})
