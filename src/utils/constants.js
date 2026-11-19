// EN: Static business constants extracted from App.vue, unchanged in value and order.
// 中文：从 App.vue 提取的静态业务常量，取值与顺序均保持不变。

export const ORDER_STATUSES = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export const INQUIRY_CATEGORIES = ['ORDER_QUERY', 'PRODUCT_INQUIRY', 'REFUND', 'COMPLAINT', 'OTHER']

export const REFUND_TYPES = ['REFUND_ONLY', 'RETURN_AND_REFUND']

export const CARRIERS = [
  'SF Express',
  'ZTO Express',
  'YTO Express',
  'STO Express',
  'Yunda Express',
  'JD Logistics',
  'EMS',
  'DHL',
  'UPS',
  'FedEx'
]

// EN: Mirrors server-side parcel rules so the dropdown never offers an illegal status jump.
// 中文：与服务端包裹规则一致，避免下拉框出现非法的状态跳转。
export const SHIPMENT_TRANSITIONS = {
  CREATED: ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'CANCELLED'],
  PICKED_UP: ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION'],
  IN_TRANSIT: ['IN_TRANSIT', 'DELIVERED', 'EXCEPTION'],
  EXCEPTION: ['EXCEPTION', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  DELIVERED: ['DELIVERED'],
  CANCELLED: ['CANCELLED']
}

// EN: Navigation item ids double as i18n keys; labels stay for backward compatibility.
// 中文：导航 id 同时作为 i18n 键；label 保留以兼容原有数据结构。
export const MENU_ITEMS = [
  { id: 'dashboard', label: '工作台' },
  { id: 'orders', label: '订单管理' },
  { id: 'shipments', label: '物流管理' },
  { id: 'refunds', label: '退款管理' },
  { id: 'inventory', label: '库存管理' },
  { id: 'inquiries', label: '客户咨询管理' }
]
