// EN: Route-to-page mapping in a dependency-free module, so App.vue and the router can share it
//     without a circular import.
// 中文：路由与页面的映射放在无依赖模块中，供 App.vue 与 router 共用且避免循环引用。

export const PAGE_IDS = ['dashboard', 'orders', 'shipments', 'refunds', 'inventory', 'inquiries']

// EN: Unknown route names fall back to the dashboard.
// 中文：未知路由名回退到工作台。
export function pageFromRoute(route) {
  const name = route?.name
  return PAGE_IDS.includes(name) ? name : 'dashboard'
}
