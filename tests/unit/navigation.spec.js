// EN: Navigation integration: active menu, URL changes and locale persistence across pages.
// 中文：导航集成测试：激活菜单、URL 变化以及跨页面切换后的语言持久化。
jest.mock('axios', () => {
  const instance = {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }
  return {
    __esModule: true,
    default: { create: jest.fn(() => instance) },
    create: jest.fn(() => instance)
  }
})

import { createLocalVue, mount } from '@vue/test-utils'
import VueRouter from 'vue-router'
import App from '@/App.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

async function mountAt(path, locale = 'zh') {
  localStorage.setItem('order-ai-locale', locale)
  const router = new VueRouter({
    mode: 'abstract',
    routes: [
      { path: '/', redirect: '/dashboard' },
      ...['dashboard', 'orders', 'shipments', 'refunds', 'inventory', 'inquiries', 'customers'].map(
        name => ({ path: `/${name}`, name, component: App })
      )
    ]
  })
  router.push(path)
  await router.isReady?.()
  const wrapper = mount(App, { localVue, router })
  await flush()
  return { wrapper, router }
}

describe('router-driven navigation', () => {
  it('initializes the page from the current route', async () => {
    const { wrapper } = await mountAt('/orders')
    expect(wrapper.vm.page).toBe('orders')
  })

  it('marks the current page as the active menu item', async () => {
    const { wrapper } = await mountAt('/shipments')
    const active = wrapper.findAll('nav.menu button.active')
    expect(active.length).toBe(1)
    expect(active.at(0).text()).toContain('物流管理')
  })

  it('updates the URL when a menu item is clicked', async () => {
    const { wrapper, router } = await mountAt('/dashboard')
    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()
    expect(router.currentRoute.path).toBe('/orders')
    expect(wrapper.vm.page).toBe('orders')
  })

  it('syncs the page on browser back/forward', async () => {
    const { wrapper, router } = await mountAt('/dashboard')
    router.push('/refunds')
    await flush()
    expect(wrapper.vm.page).toBe('refunds')

    router.back()
    await flush()
    expect(wrapper.vm.page).toBe('dashboard')
  })

  it('keeps the selected locale after navigating to another page', async () => {
    const { wrapper } = await mountAt('/dashboard', 'en')
    await wrapper.findAll('nav.menu button').at(2).trigger('click')
    await flush()
    expect(wrapper.vm.locale).toBe('en')
    expect(localStorage.getItem('order-ai-locale')).toBe('en')
    expect(wrapper.vm.t('orders')).toBe('Orders')
  })
})
