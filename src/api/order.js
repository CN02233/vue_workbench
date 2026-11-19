// EN: Order endpoints; no new backend paths are introduced.
// 中文：订单相关接口；不引入任何后端尚不存在的路径。
import api from './http'

export function getOrders(params) {
  return api.get('/orders', { params })
}

export function getOrder(number) {
  return api.get(`/orders/${encodeURIComponent(number)}`)
}

export function createOrder(data, config) {
  return api.post('/orders', data, config)
}

export function updateOrder(number, data) {
  return api.put(`/orders/${encodeURIComponent(number)}`, data)
}

export function deleteOrder(number) {
  return api.delete(`/orders/${encodeURIComponent(number)}`)
}
