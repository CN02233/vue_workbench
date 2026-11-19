// EN: Single Axios instance and shared interceptors extracted from App.vue.
// 中文：从 App.vue 提取的统一 Axios 实例与共享拦截器。
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// EN: Only collection POSTs create a resource; action POSTs (approve/reject/receive,
//     stock adjustments) are not idempotent-create candidates and must not get a key.
// 中文：只有集合 POST 才是“创建资源”；动作类 POST（批准/拒绝/验收、库存调整）
//     不属于幂等创建，不应携带 Idempotency-Key。
const CREATE_PATHS = new Set([
  '/orders',
  '/shipments',
  '/products',
  '/inquiries',
  '/refund-requests',
  '/customers'
])

// EN: Generate a key for one logical submission. Provided so the service layer can pin a key
//     across retries instead of minting a new one on every attempt.
// 中文：为一次逻辑提交生成 Key；供服务层在重试时复用同一个 Key，而不是每次重试都生成新的。
export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random()}`
}

// EN: Add an Idempotency-Key only to create POSTs that do not already carry one.
//     GET/PUT/DELETE are untouched, and a pre-set key survives so retries reuse it.
// 中文：仅为尚未携带 Key 的“创建 POST”添加；GET/PUT/DELETE 不受影响，
//      已设置的 Key 会被保留，从而使同一逻辑提交的重试复用同一个 Key。
export function requestInterceptor(config) {
  const method = (config.method || 'get').toUpperCase()
  const path = (config.url || '').split('?')[0].replace(/\/$/, '')
  if (method === 'POST' && CREATE_PATHS.has(path)) {
    const headers = config.headers || {}
    headers['Idempotency-Key'] = headers['Idempotency-Key'] || newIdempotencyKey()
    config.headers = headers
  }
  return config
}

// EN: Unwrap the standard API envelope ({ status, data }); reject error envelopes.
//     Non-envelope responses pass through unchanged, preserving legacy behavior.
// 中文：拆开标准的 API 信封（{ status, data }），error 信封转为拒绝；
//      非信封响应原样透传，保持旧行为。
export function responseInterceptor(response) {
  const envelope = response.data
  if (envelope && typeof envelope === 'object' && 'status' in envelope && 'data' in envelope) {
    if (envelope.status === 'error') {
      return Promise.reject(new Error(envelope.message || '请求失败'))
    }
    response.data = envelope.data
  }
  return response
}

api.interceptors.request.use(requestInterceptor)
api.interceptors.response.use(responseInterceptor)

// EN: Health probe kept on the shared instance so App.vue no longer builds Axios itself.
// 中文：健康检查也走共享实例，App.vue 不再自行创建 Axios。
export function health() {
  return api.get('/health')
}

// EN: Helper for the service layer to pin a key on a create request.
// 中文：服务层辅助函数，用于在创建请求上固定一个 Key。
export function withIdempotencyKey(key) {
  return { headers: { 'Idempotency-Key': key } }
}

export default api
