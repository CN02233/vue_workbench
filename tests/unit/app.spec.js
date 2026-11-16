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

import { mount } from '@vue/test-utils'
import axios from 'axios'
import App from '@/App.vue'

// Vue Test Utils 1.x has no flushPromises helper.
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// Same instance App.vue builds at module load, so assertions can steer every call.
const api = axios.create()

const ORDERS = [
  { order_number: 'ORD-1', status: 'PROCESSING' },
  { order_number: 'ORD-2', status: 'SHIPPED' },
  { order_number: 'ORD-3', status: 'DELIVERED' },
  { order_number: 'ORD-4', status: 'CANCELLED' }
]

const numbers = list => list.map(o => o.order_number)

async function mountApp(data = {}) {
  const wrapper = mount(App)
  await flushPromises()
  if (Object.keys(data).length) await wrapper.setData(data)
  return wrapper
}

beforeEach(() => {
  api.get.mockReset()
  api.post.mockReset()
  api.put.mockReset()
  api.delete.mockReset()
  api.get.mockImplementation(url => {
    if (url === '/health') return Promise.resolve({ data: { status: 'UP' } })
    if (url === '/customers') return Promise.resolve({ data: [] })
    if (url === '/products') return Promise.resolve({ data: { content: [] } })
    if (url === '/orders') return Promise.resolve({ data: { content: [] } })
    return Promise.resolve({ data: {} })
  })
})

describe('物流关联订单范围', () => {
  it('新增包裹时只列出处理中的订单', async () => {
    const wrapper = await mountApp({ orderOptions: ORDERS, editing: false })

    expect(numbers(wrapper.vm.shippableOrders)).toEqual(['ORD-1'])
  })

  it('编辑包裹时保留其所属订单，即使该订单已发货', async () => {
    const wrapper = await mountApp({
      orderOptions: ORDERS,
      editing: true,
      editor: { order_number: 'ORD-2' }
    })

    expect(numbers(wrapper.vm.shippableOrders)).toEqual(['ORD-2', 'ORD-1'])
  })

  it('未进入编辑态时不注入已选订单', async () => {
    const wrapper = await mountApp({
      orderOptions: ORDERS,
      editing: false,
      editor: { order_number: 'ORD-2' }
    })

    expect(numbers(wrapper.vm.shippableOrders)).toEqual(['ORD-1'])
  })

  it('当前订单本就合法时不重复出现', async () => {
    const wrapper = await mountApp({
      orderOptions: ORDERS,
      editing: true,
      editor: { order_number: 'ORD-1' }
    })

    expect(numbers(wrapper.vm.shippableOrders)).toEqual(['ORD-1'])
  })

  it('已取消的订单永远不能新建包裹', async () => {
    const wrapper = await mountApp({
      orderOptions: [{ order_number: 'ORD-4', status: 'CANCELLED' }],
      editing: false
    })

    expect(wrapper.vm.shippableOrders).toEqual([])
  })
})

describe('退款关联订单范围', () => {
  it('处理中、已发货、已送达都可以申请退款', async () => {
    const wrapper = await mountApp({ orderOptions: ORDERS, editing: false })

    expect(numbers(wrapper.vm.refundableOrders)).toEqual(['ORD-1', 'ORD-2', 'ORD-3'])
  })

  it('已取消的订单不在退款下拉中', async () => {
    const wrapper = await mountApp({ orderOptions: ORDERS, editing: false })

    expect(numbers(wrapper.vm.refundableOrders)).not.toContain('ORD-4')
  })

  it('编辑已取消订单的退款时仍保留该订单', async () => {
    const wrapper = await mountApp({
      orderOptions: ORDERS,
      editing: true,
      editor: { order_number: 'ORD-4' }
    })

    expect(numbers(wrapper.vm.refundableOrders)).toEqual(['ORD-4', 'ORD-1', 'ORD-2', 'ORD-3'])
  })
})

describe('包裹状态单向流转', () => {
  it('新建的包裹可以选择全部六种状态', async () => {
    const wrapper = await mountApp({ shipmentFrom: 'CREATED' })

    expect(wrapper.vm.shipmentStatusOptions).toEqual([
      'CREATED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
      'EXCEPTION',
      'CANCELLED'
    ])
  })

  it('已送达的包裹不能再改回其它状态', async () => {
    const wrapper = await mountApp({ shipmentFrom: 'DELIVERED' })

    expect(wrapper.vm.shipmentStatusOptions).toEqual(['DELIVERED'])
  })

  it('已取消的包裹不能复活', async () => {
    const wrapper = await mountApp({ shipmentFrom: 'CANCELLED' })

    expect(wrapper.vm.shipmentStatusOptions).toEqual(['CANCELLED'])
  })

  it('运输中的包裹不能直接取消，也回不到已揽收', async () => {
    const wrapper = await mountApp({ shipmentFrom: 'IN_TRANSIT' })

    expect(wrapper.vm.shipmentStatusOptions).toEqual(['IN_TRANSIT', 'DELIVERED', 'EXCEPTION'])
  })
})

describe('发货数量汇总', () => {
  it('按订单行累加订购量与已发量', async () => {
    const wrapper = await mountApp({
      orderDetail: {
        items: [
          { quantity: 3, shipped_quantity: 1 },
          { quantity: 2, shipped_quantity: 2 }
        ]
      }
    })

    expect(wrapper.vm.orderedTotal).toBe(5)
    expect(wrapper.vm.shippedTotal).toBe(3)
  })

  it('没有订单明细时汇总是零', async () => {
    const wrapper = await mountApp({ orderDetail: null })

    expect(wrapper.vm.orderedTotal).toBe(0)
    expect(wrapper.vm.shippedTotal).toBe(0)
  })
})

describe('发货弹窗的数量预填', () => {
  it('按剩余量预填，并隐藏已经发完的行', async () => {
    api.get.mockImplementation(url => {
      if (url === '/orders/ORD-1') {
        return Promise.resolve({
          data: {
            items: [
              { id: 1, sku: 'MUG-001', name: 'Mug', quantity: 5, shipped_quantity: 2 },
              { id: 2, sku: 'CAP-001', name: 'Cap', quantity: 3, shipped_quantity: 3 }
            ]
          }
        })
      }
      return Promise.resolve({ data: {} })
    })
    const wrapper = await mountApp({ editor: { order_number: 'ORD-1' } })

    await wrapper.vm.onShipmentOrderChange()

    expect(wrapper.vm.shipmentLines).toEqual([
      { id: 1, sku: 'MUG-001', name: 'Mug', remaining: 3, quantity: 3 }
    ])
  })
})

describe('单元格渲染', () => {
  it('空值和未定义都显示占位符', async () => {
    const wrapper = await mountApp()

    expect(wrapper.vm.cell({ receiver_name: null }, 'receiver_name')).toBe('—')
    expect(wrapper.vm.cell({}, 'receiver_name')).toBe('—')
  })

  it('状态显示当前语言的文案', async () => {
    const wrapper = await mountApp()

    expect(wrapper.vm.cell({ status: 'PROCESSING' }, 'status')).toBe('处理中')
    await wrapper.setData({ locale: 'en' })
    expect(wrapper.vm.cell({ status: 'PROCESSING' }, 'status')).toBe('Processing')
  })

  it('时间截断到分钟', async () => {
    const wrapper = await mountApp()

    expect(wrapper.vm.cell({ created_at: '2026-11-01T10:20:30' }, 'created_at')).toBe(
      '2026-11-01 10:20'
    )
  })
})

describe('列表操作按钮', () => {
  const inventoryRows = [
    { sku: 'MUG-001', name: 'Mug', stock: 9, price: '9.90', order_count: 0 },
    { sku: 'CAP-001', name: 'Cap', stock: 4, price: '5.00', order_count: 2 }
  ]

  it('有关联订单的商品不能删除', async () => {
    const wrapper = await mountApp({ page: 'inventory', rows: inventoryRows })
    const rows = wrapper.findAll('tbody tr')

    expect(rows.at(0).find('button.danger').attributes('disabled')).toBeUndefined()
    expect(rows.at(1).find('button.danger').attributes('disabled')).toBe('disabled')
    expect(rows.at(1).find('button.danger').attributes('title')).toBe('已关联订单，不能删除')
  })

  it('已发出或已签收的包裹不显示删除按钮', async () => {
    const wrapper = await mountApp({
      page: 'shipments',
      rows: [
        { id: 1, order_number: 'ORD-1', carrier: 'SF', tracking_number: 'SF1', status: 'CREATED' },
        { id: 2, order_number: 'ORD-1', carrier: 'SF', tracking_number: 'SF2', status: 'DELIVERED' }
      ]
    })
    const rows = wrapper.findAll('tbody tr')

    expect(rows.at(0).find('button.danger').exists()).toBe(true)
    expect(rows.at(1).find('button.danger').exists()).toBe(false)
  })
})

describe('表头本地化', () => {
  it('每个列头都有对应译文而不是原始字段名', async () => {
    const wrapper = await mountApp()
    const untranslated = []

    for (const page of ['orders', 'shipments', 'refunds', 'inventory', 'inquiries']) {
      await wrapper.setData({ page })
      for (const column of wrapper.vm.columns) {
        if (wrapper.vm.t(column) === column) untranslated.push(`${page}.${column}`)
      }
    }

    expect(untranslated).toEqual([])
  })
})

describe('分页信息解析', () => {
  it('读取嵌套在 page 下的分页字段', async () => {
    api.get.mockImplementation(url => {
      if (url === '/products') {
        return Promise.resolve({
          data: {
            content: [{ sku: 'MUG-001' }],
            page: { size: 10, number: 2, totalPages: 5, totalElements: 48 }
          }
        })
      }
      return Promise.resolve({ data: {} })
    })
    const wrapper = await mountApp({ page: 'inventory' })

    await wrapper.vm.loadPage(2)

    expect(wrapper.vm.rows).toEqual([{ sku: 'MUG-001' }])
    expect(wrapper.vm.pageNumber).toBe(2)
    expect(wrapper.vm.totalPages).toBe(5)
    expect(wrapper.vm.totalElements).toBe(48)
  })

  it('仍然接受扁平结构', async () => {
    api.get.mockImplementation(url => {
      if (url === '/products') {
        return Promise.resolve({
          data: { content: [], number: 1, totalPages: 2, totalElements: 11 }
        })
      }
      return Promise.resolve({ data: {} })
    })
    const wrapper = await mountApp({ page: 'inventory' })

    await wrapper.vm.loadPage(1)

    expect(wrapper.vm.pageNumber).toBe(1)
    expect(wrapper.vm.totalPages).toBe(2)
    expect(wrapper.vm.totalElements).toBe(11)
  })
})
