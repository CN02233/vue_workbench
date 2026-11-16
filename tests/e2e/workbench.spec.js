const { test, expect } = require('@playwright/test')

const RUN = `E2E-${Date.now().toString(36).toUpperCase()}`

// Products are permanent fixtures, not per-run data: an order writes a stock movement, the ledger is
// append-only, and a product carrying movements can never be deleted. Reusing two fixed SKUs keeps the
// database from growing by two rows per run.
const SKU = 'E2E-FIXTURE-SKU'
const FREE_SKU = 'E2E-FIXTURE-FREE'
const PROCESSING = `${RUN}-ORD1`
const SHIPPED = `${RUN}-ORD2`
const CANCELLED = `${RUN}-ORD3`

let customerId

async function call(request, method, path, data) {
  const response = await request[method](`/api${path}`, data === undefined ? {} : { data })
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : {}
  } catch (error) {
    body = { raw: text }
  }
  if (!response.ok()) {
    throw new Error(`${method.toUpperCase()} ${path} -> ${response.status()} ${text}`)
  }
  return body.data === undefined ? body : body.data
}

/** Creates the fixture product, or tops an existing one back up to its opening stock. */
async function ensureProduct(request, sku, name, stock, price) {
  const found = await request.get(`/api/products/${sku}`)
  if (!found.ok()) {
    await call(request, 'post', '/products', { sku, name, stock, price })
    return
  }
  const existing = (await found.json()).data
  const delta = stock - existing.stock
  if (delta !== 0) {
    await call(request, 'post', `/products/${sku}/stock-adjustments`, {
      delta,
      note: 'end-to-end fixture reset'
    })
  }
}

async function openCreate(page, menuLabel) {
  await page.goto('/')
  await page.getByRole('button', { name: menuLabel }).click()
  await page.getByRole('button', { name: '新增' }).click()
  return page.getByRole('dialog')
}

function orderSelect(dialog) {
  return dialog.locator('label', { hasText: '订单号' }).locator('select')
}

async function optionLabels(select) {
  return (await select.locator('option').allTextContents()).join(' | ')
}

test.beforeAll(async ({ request }) => {
  const health = await request.get('/api/health')
  expect(
    health.ok(),
    '业务 API 不可用，请先启动 springboot-api（默认 http://localhost:8081）'
  ).toBeTruthy()

  await ensureProduct(request, SKU, 'E2E fixture — ordered product', 20, '9.90')
  await ensureProduct(request, FREE_SKU, 'E2E fixture — unused product', 5, '1.00')
  const customer = await call(request, 'post', '/customers', {
    name: '端到端客户',
    email: `${RUN.toLowerCase()}@example.com`
  })
  customerId = customer.id

  // Order 1 stays in PROCESSING: the only state a new parcel may point at.
  await call(request, 'post', '/orders', {
    order_number: PROCESSING,
    customer_id: customer.id,
    items: [{ sku: SKU, quantity: 4 }]
  })

  // Order 2 ships in full, so the server flips it to SHIPPED.
  await call(request, 'post', '/orders', {
    order_number: SHIPPED,
    customer_id: customer.id,
    items: [{ sku: SKU, quantity: 2 }]
  })
  const shippedDetail = await call(request, 'get', `/orders/${SHIPPED}`)
  await call(request, 'post', '/shipments', {
    order_number: SHIPPED,
    carrier: 'SF Express',
    tracking_number: `${RUN}-T1`,
    items: [{ order_item_id: shippedDetail.items[0].id, quantity: 2 }]
  })

  // Order 3 is cancelled, which rules it out for both parcels and refunds.
  await call(request, 'post', '/orders', {
    order_number: CANCELLED,
    customer_id: customer.id,
    items: [{ sku: SKU, quantity: 1 }]
  })
  await call(request, 'put', `/orders/${CANCELLED}`, { status: 'CANCELLED' })
})

test.afterAll(async ({ request }) => {
  const quiet = async run => {
    try {
      await run()
    } catch (error) {
      // Fixtures are disposable; a failed cleanup must not fail the suite.
    }
  }

  await quiet(async () => {
    const parcels = await call(request, 'get', `/orders/${SHIPPED}/shipments`)
    const list = Array.isArray(parcels) ? parcels : parcels.content || []
    for (const parcel of list) await call(request, 'delete', `/shipments/${parcel.id}`)
  })
  for (const number of [PROCESSING, SHIPPED, CANCELLED]) {
    await quiet(() => call(request, 'delete', `/orders/${number}`))
  }
  // The two fixture products stay: the stock movements they collected are append-only, so the API
  // refuses to delete them by design. They are reused and reset at the start of the next run.
  await quiet(() => call(request, 'delete', `/customers/${customerId}`))
})

test('物流新增只允许选择处理中的订单', async ({ page }) => {
  const dialog = await openCreate(page, '物流管理')
  const labels = await optionLabels(orderSelect(dialog))

  expect(labels).toContain(PROCESSING)
  expect(labels).not.toContain(SHIPPED)
  expect(labels).not.toContain(CANCELLED)
})

test('选中订单后按剩余量预填发货数量', async ({ page }) => {
  const dialog = await openCreate(page, '物流管理')
  await orderSelect(dialog).selectOption(PROCESSING)

  const line = dialog.locator('.item-line').first()
  await expect(line).toContainText('/ 4')
  await expect(line.locator('input[type="number"]')).toHaveValue('4')
})

test('退款新增允许处理中与已发货，但不含已取消', async ({ page }) => {
  const dialog = await openCreate(page, '退款管理')
  const labels = await optionLabels(orderSelect(dialog))

  expect(labels).toContain(PROCESSING)
  expect(labels).toContain(SHIPPED)
  expect(labels).not.toContain(CANCELLED)
})

test('库存列表禁止删除已关联订单的商品', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '库存管理' }).click()

  const skuInput = page.locator('.filters input').first()
  await skuInput.fill(SKU)
  await page.locator('.filters').getByRole('button', { name: '查询' }).click()

  await expect(page.locator('tbody tr', { hasText: SKU }).locator('button.danger')).toBeDisabled()

  await skuInput.fill(FREE_SKU)
  await page.locator('.filters').getByRole('button', { name: '查询' }).click()

  await expect(
    page.locator('tbody tr', { hasText: FREE_SKU }).locator('button.danger')
  ).toBeEnabled()
})
