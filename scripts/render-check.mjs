import assert from 'node:assert/strict'
import { renderSection, apply } from '../index.js'

const zh = renderSection({})
assert.match(zh, /^## 输出风格：文字 \+ 可视化双轨/, 'zh title')
for (const heading of [
  '### 结构与顺序',
  '### 必须出图的场景（命中其一即出图）',
  '### 图表选型',
  '### 每张图的硬性要求',
  '### 图表尺寸与图文排版（硬性指标，违反即返工）',
  '### 构图几何：元素不重叠，连线落在边框上',
  '### HTML 交付（用户要文件，或图需要交互时）',
  '### 降级（环境不能渲染图表时）',
  '### 红线',
]) {
  assert.ok(zh.includes(heading), `zh block missing: ${heading}`)
}
assert.ok(zh.includes('containLabel: true'), 'zh layout block keeps the grid rule')
assert.ok(zh.includes('图表高度 min(60vh, 520px)'), 'zh layout block keeps the height rule')
assert.ok(zh.includes('**图片呈现（等比例放大到正文列宽）**'), 'zh layout block keeps the image-presentation rules')
assert.ok(zh.includes('width:100%; height:auto'), 'zh image rules forbid hard-coded height')
assert.ok(zh.includes('next = prev + size + gap'), 'zh geometry block keeps the layout-constant rule')
assert.ok(zh.trimEnd().endsWith('- 一句话能说清的不配图。'), 'zh ends with the last red line')

const trimmed = renderSection({ blocks: { html: false, fallback: false, layout: false, geometry: false } })
assert.ok(!trimmed.includes('### HTML 交付'), 'html block can be switched off')
assert.ok(!trimmed.includes('### 降级'), 'fallback block can be switched off')
assert.ok(!trimmed.includes('### 图表尺寸与图文排版'), 'layout block can be switched off')
assert.ok(!trimmed.includes('### 构图几何'), 'geometry block can be switched off')
assert.ok(trimmed.includes('### 红线'), 'remaining blocks stay')

const en = renderSection({ language: 'en' })
assert.match(en, /^## Output style: dual-track \(text \+ visuals\)/, 'en title')
assert.ok(en.includes('### Structure and order'), 'en block')
assert.ok(en.includes('### Chart sizing and typography (hard limits; rework if violated)'), 'en layout block')
assert.ok(en.includes('**Image presentation (scale up to the text column)**'), 'en image-presentation rules')
assert.ok(en.includes('### Composition geometry: no overlaps, connectors stop on borders'), 'en geometry block')

const appended = renderSection({ append: 'Use the team template.' })
assert.ok(appended.trimEnd().endsWith('Use the team template.'), 'append goes last')

// A disabled row registers nothing: apply must not touch the context.
let registered = 0
apply({ systemPrompt: { section: () => (registered++, () => {}) }, effect: (fn) => fn() }, { enabled: false })
assert.equal(registered, 0, 'disabled row registers no section')

const sections = []
apply(
  {
    systemPrompt: {
      section: (definition) => {
        sections.push(definition)
        return () => {}
      },
    },
    effect: (fn) => fn(),
  },
  {},
)
assert.equal(sections.length, 1, 'enabled row registers exactly one section')
assert.equal(sections[0].name, 'output:dual-track')
assert.equal(sections[0].order, 9000)
assert.equal(sections[0].interpolate, false)
assert.equal(sections[0].text, zh)

console.log('render-check: ok')