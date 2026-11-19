// EN: Application shell tests: extracted layout components, navigation, locale and feedback.
// 中文：应用外壳测试：提取出的布局组件、导航、语言与全局反馈。
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

import { createLocalVue, mount, shallowMount } from '@vue/test-utils'
import VueRouter from 'vue-router'
import App from '@/App.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import AppNavigation from '@/components/common/AppNavigation.vue'
import GlobalFeedback from '@/components/common/GlobalFeedback.vue'
import { MENU_ITEMS } from '@/utils/constants'

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

describe('application shell composition', () => {
  it('renders header navigation and feedback as reusable components', async () => {
    const { wrapper } = await mountAt('/dashboard')

    expect(wrapper.findComponent(AppHeader).exists()).toBe(true)
    expect(wrapper.findComponent(AppNavigation).exists()).toBe(true)
    expect(wrapper.findComponent(GlobalFeedback).exists()).toBe(true)
    expect(wrapper.find('header h1').text()).toBe('客服工作台')
    expect(wrapper.find('header p').text()).toBe('咨询处理 · 订单查询 · 退款审核')
    expect(wrapper.findAll('nav.menu button').length).toBe(MENU_ITEMS.length)
    expect(wrapper.find('.toast').exists()).toBe(false)
  })

  it('keeps the original header actions and status indicators', async () => {
    const { wrapper } = await mountAt('/dashboard')

    expect(wrapper.find('header small').text()).toBe('ORDER AI · CUSTOMER OPERATIONS')
    expect(
      wrapper
        .find('header select')
        .findAll('option')
        .wrappers.map(o => o.text())
    ).toEqual(['中文', 'English', 'Español'])
    await wrapper.setData({ health: false })
    expect(wrapper.find('header .status').text()).toContain('未连接')
    await wrapper.setData({ health: true })
    expect(wrapper.find('header .status').text()).toContain('在线')
  })
})

describe('shell navigation', () => {
  it('navigates to the route matching a clicked menu item', async () => {
    const { wrapper, router } = await mountAt('/dashboard')

    await wrapper.findAll('nav.menu button').at(1).trigger('click')
    await flush()

    expect(router.currentRoute.path).toBe('/orders')
    expect(wrapper.vm.page).toBe('orders')
  })

  it('keeps menu labels identical to the original for role-based lookups', async () => {
    const { wrapper } = await mountAt('/dashboard', 'zh')

    expect(wrapper.findAll('nav.menu button').wrappers.map(b => b.text())).toEqual([
      '工作台',
      '订单管理',
      '物流管理',
      '退款管理',
      '库存管理',
      '客户咨询管理'
    ])
  })

  it('marks exactly the menu item matching the current route as active', async () => {
    const { wrapper, router } = await mountAt('/shipments')

    let active = wrapper.findAll('nav.menu button.active')
    expect(active.length).toBe(1)
    expect(active.at(0).text()).toBe('物流管理')

    router.push('/inventory')
    await flush()

    active = wrapper.findAll('nav.menu button.active')
    expect(active.length).toBe(1)
    expect(active.at(0).text()).toBe('库存管理')
  })

  it('emits navigate from the navigation component without owning the route', () => {
    const nav = shallowMount(AppNavigation, {
      propsData: { menu: MENU_ITEMS, page: 'dashboard', locale: 'zh' }
    })

    nav.findAll('button').at(2).trigger('click')

    expect(nav.emitted().navigate[0]).toEqual(['shipments'])
  })
})

describe('shell language switching', () => {
  it('updates the locale persists it and re-renders header and navigation', async () => {
    const { wrapper } = await mountAt('/dashboard', 'zh')

    await wrapper.find('header select').setValue('es')
    await flush()

    expect(wrapper.vm.locale).toBe('es')
    expect(localStorage.getItem('order-ai-locale')).toBe('es')
    expect(wrapper.find('header h1').text()).toBe('Panel de Atención al Cliente')
    expect(wrapper.findAll('nav.menu button').at(1).text()).toBe('Pedidos')
  })

  it('forwards locale changes from the header component', () => {
    const header = shallowMount(AppHeader, { propsData: { locale: 'zh', health: true } })

    header.find('select').setValue('en')

    expect(header.emitted()['change-locale'][0]).toEqual(['en'])
  })
})

describe('global feedback', () => {
  it('shows the error message through GlobalFeedback and hides it when cleared', async () => {
    const { wrapper } = await mountAt('/dashboard')

    await wrapper.setData({ error: '请求失败' })
    expect(wrapper.findComponent(GlobalFeedback).props('error')).toBe('请求失败')
    expect(wrapper.find('.toast').text()).toBe('请求失败')

    await wrapper.setData({ error: '' })
    expect(wrapper.find('.toast').exists()).toBe(false)
  })

  it('surfaces failures from the shared run helper in the global feedback', async () => {
    const { wrapper } = await mountAt('/dashboard')

    await wrapper.vm.run(() => Promise.reject(new Error('boom')))
    await flush()

    expect(wrapper.find('.toast').text()).toBe('boom')
    expect(wrapper.vm.busy).toBe(false)
  })

  it('renders an error passed directly to the feedback component', () => {
    const feedback = shallowMount(GlobalFeedback, { propsData: { error: 'boom' } })

    expect(feedback.classes()).toContain('toast')
    expect(feedback.text()).toBe('boom')
  })
})
