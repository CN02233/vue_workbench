# Order AI workbench

Vue 2.7 single-page console for the order, inventory, refund and logistics loop. It talks JSON to
the Spring Boot business API through the dev-server proxy; nothing about the backend is baked in at
build time.

## Start

```sh
npm install
npm run serve     # http://localhost:8082
```

`/api` is proxied to `http://localhost:8081` (`vue.config.js`). Point it at another instance without
editing the file:

```sh
BUSINESS_API_URL=http://127.0.0.1:8091 npm run serve
```

## Test

Two layers. The unit layer never touches the network; the end-to-end layer clicks a real browser
against a running API. They are complementary: Jest proves the component refuses an illegal option,
Playwright proves the rendered page actually behaves that way.

### Unit — Jest + Vue Test Utils

```sh
npm run test:unit
```

Mounts `App.vue` with a stubbed HTTP client, so it runs in about a second and needs no backend. It
covers the rules the UI must not break:

- the logistics order dropdown offers only `PROCESSING`, and editing keeps the parcel's own order
  visible even after that order moved on
- the refund order dropdown offers `PROCESSING/SHIPPED/DELIVERED` and never `CANCELLED`
- the parcel status machine is forward-only (`DELIVERED` and `CANCELLED` are terminal)
- shipment quantities prefill with `quantity - shipped_quantity`, and fully shipped lines disappear
- an inventory row with `order_count > 0` keeps its delete button disabled
- parcels already picked up or delivered lose their delete button
- empty values render as `—`, timestamps truncate to the minute, statuses follow the active locale
- every column header resolves to a translation instead of a raw field name
- paging metadata is read from the nested `page` object

### End-to-end — Playwright

```sh
PW_CHANNEL=chrome npm run test:e2e
```

Requires the business API on `http://localhost:8081`. The dev server on 8082 is started automatically
and shut down afterwards (an already-running one is reused). Each run:

1. probes `/api/health` and fails fast with a hint when the API is down
2. reuses two fixture products (`E2E-FIXTURE-SKU`, `E2E-FIXTURE-FREE`) and tops them back up to their
   opening stock, then seeds one customer and three orders — processing, fully shipped, cancelled
3. opens the logistics, refund and inventory pages and asserts what the dropdowns and buttons render
4. deletes the parcels, orders and customer it created

The two fixture products stay behind. They collect stock movements, the ledger is append-only, and
the API refuses to delete a product with movements by design. They are reused and reset on every run,
so their count never grows. For a pristine catalogue, remove them with their ledger rows:

```sql
DELETE FROM stock_movements WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'E2E-%');
DELETE FROM products WHERE sku LIKE 'E2E-%';
```

Variants:

```sh
PW_CHANNEL=chrome npx playwright test --headed                              # watch the clicks
PW_CHANNEL=chrome npx playwright test -g "库存"                            # one test only
PW_CHANNEL=chrome npx playwright test --ui                                  # step through, time-travel
BUSINESS_API_URL=http://127.0.0.1:8091 PW_CHANNEL=chrome npm run test:e2e  # other instance
```

`PW_CHANNEL=chrome` reuses an installed Chrome instead of Playwright's bundled build — handy when the
download is slow. Drop it once `npx playwright install chromium` has succeeded; CI needs that install
either way.

Failures keep a trace in `test-results/<case>/`. Replay it with:

```sh
npx playwright show-trace test-results/<case>/trace.zip
```

`error-context.md` in the same directory holds a snapshot of the page at the moment of failure, which
is usually enough to see what the assertion was actually looking at.

## Format

```sh
npm run format        # prettier --write, 100 columns, single quotes, no semicolons
npm run format:check  # verify only
```

Both cover `src/`, `tests/` and the root config files. Run `format` before committing.
