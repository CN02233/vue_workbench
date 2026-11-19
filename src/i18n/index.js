// EN: Single i18n entry point; the merged dictionaries mirror App.vue's original lookup order.
// 中文：统一的多语言入口；合并后的字典复刻了 App.vue 原有的查找顺序。
import zh from './zh'
import en from './en'
import es from './es'

export const messages = { zh, en, es }
export const locales = ['zh', 'en', 'es']

// EN: Translate a key, falling back to the key itself when no locale has it.
// 中文：按 key 翻译，所有语言都缺失时回退为 key 本身。
export function translate(locale, key) {
  return messages[locale]?.[key] || key
}
