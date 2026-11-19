// EN: Business-flow orchestration for inquiries, kept separate from raw HTTP calls.
// 中文：咨询相关的业务流程编排，与底层 HTTP 调用分离。
import { createInquiry } from '@/api/inquiry'
import { newIdempotencyKey, withIdempotencyKey } from '@/api/http'

export { newIdempotencyKey }

// EN: Submit one inquiry. A caller may pass a previously generated key so a retry of the same
//     logical submission is deduplicated by the server instead of creating a second record.
// 中文：提交一条咨询。调用方可传入此前生成的 Key，使同一逻辑提交的重试被服务端去重，
//      而不会创建第二条记录。
export function submitInquiry(payload, key = newIdempotencyKey()) {
  return createInquiry(payload, withIdempotencyKey(key))
}
