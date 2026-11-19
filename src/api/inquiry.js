// EN: Inquiry endpoints. Paths and payloads mirror the backend contract exactly.
// 中文：咨询相关接口。路径与请求体严格保持后端现有契约。
import api from './http'

export function createInquiry(data, config) {
  return api.post('/inquiries', data, config)
}

export function getInquiries(params) {
  return api.get('/inquiries', { params })
}

// EN: Planned detail endpoint. Do not call it until the backend exposes it.
// 中文：规划中的详情接口。后端提供之前不要实际调用。
export function getInquiry(id) {
  return api.get(`/inquiries/${id}`)
}

export function updateInquiry(id, data) {
  return api.put(`/inquiries/${id}`, data)
}

export function deleteInquiry(id) {
  return api.delete(`/inquiries/${id}`)
}
