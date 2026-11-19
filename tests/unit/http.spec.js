// EN: Tests for the extracted HTTP layer: envelope handling and Idempotency-Key rules.
// 中文：针对提取出的 HTTP 层的测试：信封处理与 Idempotency-Key 规则。
import { requestInterceptor, responseInterceptor, newIdempotencyKey } from '@/api/http'

describe('API response envelope', () => {
  it('unwraps a success envelope to its data payload', () => {
    const response = { data: { status: 'ok', data: { id: 1 } } }
    const result = responseInterceptor(response)
    expect(result.data).toEqual({ id: 1 })
  })

  it('rejects an error envelope with its message', async () => {
    const response = { data: { status: 'error', message: '请求失败', data: null } }
    await expect(responseInterceptor(response)).rejects.toThrow('请求失败')
  })

  it('leaves a non-envelope response untouched', () => {
    const response = { data: { content: [] } }
    expect(responseInterceptor(response).data).toEqual({ content: [] })
  })
})

describe('Idempotency-Key placement', () => {
  const createPaths = [
    '/orders',
    '/shipments',
    '/products',
    '/inquiries',
    '/refund-requests',
    '/customers'
  ]

  it.each(createPaths)('adds a key to create POST %s', path => {
    const config = { method: 'post', url: path, headers: {} }
    requestInterceptor(config)
    expect(config.headers['Idempotency-Key']).toBeTruthy()
  })

  it.each(['get', 'put', 'delete'])('does not add a key to %s requests', method => {
    const config = { method, url: '/orders', headers: {} }
    requestInterceptor(config)
    expect(config.headers['Idempotency-Key']).toBeUndefined()
  })

  it.each([
    '/refund-requests/1/approve',
    '/refund-requests/1/reject',
    '/refund-requests/1/receive',
    '/products/SKU-1/stock-adjustments'
  ])('does not add a key to the action POST %s', path => {
    const config = { method: 'post', url: path, headers: {} }
    requestInterceptor(config)
    expect(config.headers['Idempotency-Key']).toBeUndefined()
  })

  it('reuses an existing key so a logical retry is deduplicated', () => {
    const config = { method: 'post', url: '/orders', headers: { 'Idempotency-Key': 'retry-key' } }
    requestInterceptor(config)
    expect(config.headers['Idempotency-Key']).toBe('retry-key')
  })

  it('generates unique keys for separate submissions', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey())
  })
})
