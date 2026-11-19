// EN: Page-id dispatch for the generic management table. Keeps path mapping in one place.
// 中文：通用管理表格按页面 id 派发的资源路径；把路径映射集中到一处。
import api from './http'

export const RESOURCE_PATHS = {
  orders: '/orders',
  shipments: '/shipments',
  refunds: '/refund-requests',
  inventory: '/products',
  inquiries: '/inquiries'
}

export function listResources(page, params) {
  return api.get(RESOURCE_PATHS[page], { params })
}

export function createResource(page, data, config) {
  return api.post(RESOURCE_PATHS[page], data, config)
}

export function updateResource(page, key, data) {
  return api.put(`${RESOURCE_PATHS[page]}/${encodeURIComponent(key)}`, data)
}

export function deleteResource(page, key) {
  return api.delete(`${RESOURCE_PATHS[page]}/${encodeURIComponent(key)}`)
}
