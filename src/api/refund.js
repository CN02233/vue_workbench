// EN: Refund endpoints. approve/reject/receive are action POSTs without an Idempotency-Key.
// 中文：退款相关接口。approve/reject/receive 属于动作类 POST，不携带 Idempotency-Key。
import api from './http'

export function getRefunds(params) {
  return api.get('/refund-requests', { params })
}

export function getRefund(id) {
  return api.get(`/refund-requests/${id}`)
}

export function createRefund(data, config) {
  return api.post('/refund-requests', data, config)
}

export function updateRefund(id, data) {
  return api.put(`/refund-requests/${id}`, data)
}

export function deleteRefund(id) {
  return api.delete(`/refund-requests/${id}`)
}

export function approveRefund(id) {
  return api.post(`/refund-requests/${id}/approve`)
}

export function rejectRefund(id) {
  return api.post(`/refund-requests/${id}/reject`)
}

export function receiveRefund(id, data) {
  return api.post(`/refund-requests/${id}/receive`, data)
}
