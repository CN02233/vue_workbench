// EN: Product and inventory endpoints, including linked orders and stock movements.
// 中文：商品与库存相关接口，含关联订单与库存流水。
import api from './http'

export function getProducts(params) {
  return api.get('/products', { params })
}

export function getProduct(sku) {
  return api.get(`/products/${encodeURIComponent(sku)}`)
}

export function createProduct(data, config) {
  return api.post('/products', data, config)
}

export function updateProduct(sku, data) {
  return api.put(`/products/${encodeURIComponent(sku)}`, data)
}

export function deleteProduct(sku) {
  return api.delete(`/products/${encodeURIComponent(sku)}`)
}

export function getProductOrders(sku, params) {
  return api.get(`/products/${encodeURIComponent(sku)}/orders`, { params })
}

export function getProductStockMovements(sku, params) {
  return api.get(`/products/${encodeURIComponent(sku)}/stock-movements`, { params })
}

// EN: An action POST on a specific product; never receives an Idempotency-Key.
// 中文：针对具体商品的动作类 POST；不会携带 Idempotency-Key。
export function adjustStock(sku, data) {
  return api.post(`/products/${encodeURIComponent(sku)}/stock-adjustments`, data)
}
