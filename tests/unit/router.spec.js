// EN: Router configuration and route-to-page mapping tests.
// 中文：路由配置与路由到页面映射的测试。
import router, { pageFromRoute } from '@/router'
import { PAGE_IDS } from '@/utils/routes'

describe('router configuration', () => {
  it('uses hash mode so deployment needs no index.html fallback', () => {
    expect(router.options.mode).toBe('hash')
  })

  it.each(['dashboard', 'orders', 'shipments', 'refunds', 'inventory', 'inquiries', 'customers'])(
    'defines the /%s route',
    name => {
      const route = router.options.routes.find(r => r.name === name)
      expect(route).toBeDefined()
      expect(route.path).toBe(`/${name}`)
    }
  )

  it('redirects the root path to the dashboard', () => {
    const root = router.options.routes.find(r => r.path === '/')
    expect(root.redirect).toBe('/dashboard')
  })
})

describe('route to page mapping', () => {
  it.each(PAGE_IDS)('maps %s to itself', name => {
    expect(pageFromRoute({ name })).toBe(name)
  })

  it('falls back to dashboard for unknown or missing routes', () => {
    expect(pageFromRoute({ name: 'customers' })).toBe('dashboard')
    expect(pageFromRoute(undefined)).toBe('dashboard')
  })
})
