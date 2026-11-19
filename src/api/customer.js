// EN: Customer endpoints; lookup-by-email paths are encoded exactly as before.
// 中文：客户相关接口；按邮箱查询的路径编码方式与原来完全一致。
import api from './http'

export function getCustomers(params) {
  return api.get('/customers', { params })
}

export function getCustomerByEmail(email) {
  return api.get(`/customers/by-email/${encodeURIComponent(email)}`)
}

export function getCustomerOrders(email) {
  return api.get(`/customers/by-email/${encodeURIComponent(email)}/orders`)
}

export function createCustomer(data, config) {
  return api.post('/customers', data, config)
}

export function deleteCustomer(id) {
  return api.delete(`/customers/${id}`)
}
