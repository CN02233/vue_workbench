// EN: Shipment endpoints; create payloads keep the existing parcel shape.
// 中文：物流相关接口；创建请求体保持现有包裹数据结构。
import api from './http'

export function getShipments(params) {
  return api.get('/shipments', { params })
}

export function getShipment(id) {
  return api.get(`/shipments/${id}`)
}

export function createShipment(data, config) {
  return api.post('/shipments', data, config)
}

export function updateShipment(id, data) {
  return api.put(`/shipments/${id}`, data)
}

export function deleteShipment(id) {
  return api.delete(`/shipments/${id}`)
}
