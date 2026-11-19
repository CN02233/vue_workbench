// EN: Vue Router 3 for page navigation. The workbench keeps its single App shell; routes map to
//     the existing `page` state so no business logic is rewritten in this task.
// 中文：使用 Vue Router 3 管理页面导航。工作台仍保持单 App 外壳；路由映射到既有 `page` 状态，
//      本任务不重写任何业务逻辑。
import Vue from 'vue'
import VueRouter from 'vue-router'
import App from '../App.vue'
import { pageFromRoute } from '../utils/routes'

Vue.use(VueRouter)

// EN: Hash mode avoids requiring index.html fallback on the deployment server. Re-export the
//     mapping helper for tests and callers.
// 中文：hash 模式无需部署服务器配置 index.html 回退。重新导出映射辅助函数供测试与调用方使用。
export { pageFromRoute }

const router = new VueRouter({
  mode: 'hash',
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: App },
    { path: '/orders', name: 'orders', component: App },
    { path: '/shipments', name: 'shipments', component: App },
    { path: '/refunds', name: 'refunds', component: App },
    { path: '/inventory', name: 'inventory', component: App },
    { path: '/inquiries', name: 'inquiries', component: App },
    // EN: Customer management currently lives on the dashboard; this route is reserved for the
    //     dedicated view planned in a later task and resolves to that screen for now.
    // 中文：客户管理目前位于工作台；此路由为后续独立页面预留，当前解析到工作台。
    { path: '/customers', name: 'customers', component: App }
  ]
})

export default router
