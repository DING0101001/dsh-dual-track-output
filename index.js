/**
 * Dual-track output: text carries the conclusion, visuals carry structure,
 * comparison, process and data.
 *
 * The whole contract is one static system-prompt section, so it costs exactly
 * one prompt block, renders identically every request (stable prefix, no cache
 * churn), and disappears with this plugin's own effect when the row is disabled.
 * Tunable parts live in the row config; nothing here reads the session.
 */

export const name = 'dsh-dual-track-output'

/** `systemPrompt` is the only service this plugin needs. */
export const inject = ['systemPrompt']

/** Where the section sits: after first-party guidance, before environment facts (10000+). */
const DEFAULT_ORDER = 9000
/** Namespaced so a scoped preset section can shadow it deliberately. */
const DEFAULT_SECTION = 'output:dual-track'

/** Block keys, in rendering order. Each one is independently switchable. */
const BLOCK_KEYS = ['structure', 'triggers', 'charts', 'figure', 'html', 'fallback', 'redlines']

const RULES = {
  zh: {
    title: '## 输出风格：文字 + 可视化双轨',
    blocks: {
      structure: `### 结构与顺序
1. 结论先行：开头 3–5 句给出核心结论，再展开分点论述。
2. 文字负责结论、推理与解释；可视化负责承载结构、对比、流程与数据，二者互补而不重复。
3. 需要配图时，图放在相关论述之后，按图1、图2…编号，正文用「（见图1）」引用。
4. 每张图后用 1–2 句说明读图要点，并且只讲这张图带来的新增信息。
5. 结尾给出小结或下一步行动建议。`,
      triggers: `### 必须出图的场景（命中其一即出图）
- 多个对象、多个方案的横向对比，或优缺点矩阵。
- 流程、步骤、时间线、因果链、决策树。
- 层级结构、架构图、分类树、关系网络。
- 趋势、占比、分布、构成等带数据的内容。
- 规则或清单达到 5 条及以上，整理为结构化图示。
- 抽象原理、机制需要示意说明。`,
      charts: `### 图表选型
- 数据比较 → 柱状图/条形图；趋势变化 → 折线图；构成占比 → 饼图/环形图；分布 → 散点图/直方图。
- 流程算法 → 流程图；层级架构 → 框图；分类归属 → 思维导图/树状图；方案决策 → 矩阵表。
- 简单一一对应 → Markdown 表格；复杂关系 → 专用结构图。`,
      figure: `### 每张图的硬性要求
- 图题在上，图例、坐标轴与口径说明齐全。
- 宽度自适应；图中数据必须与正文一致。
- 没有真实数据时显式标注「示意/假设数据」，禁止编造精确数值。`,
      html: `### HTML 交付（用户要文件，或图需要交互时）
- 单个自包含 HTML：内联 CSS/JS，浏览器直接打开；图表用 ECharts 等成熟库，CDN 引入。
- 一屏一图，图题在上；主色不超过 3 种，深色文字浅底，中文排版可读。
- 文末附「图表清单」，注明数据来源与口径；HTML 中不写死无法获取的真实数据。`,
      fallback: `### 降级（环境不能渲染图表时）
- 流程/架构/时序改用 Mermaid 代码块；对比与数据改用 Markdown 表格；层级用缩进列表。
- 主动说明「当前环境无法渲染图表，以下为 Mermaid/表格替代版」。`,
      redlines: `### 红线
- 禁止无信息增量的装饰图，一图只讲一个主题。
- 禁止图表与结论矛盾，禁止为凑格式堆砌无关图，禁止数据造假。
- 一句话能说清的不配图。`,
    },
  },
  en: {
    title: '## Output style: dual-track (text + visuals)',
    blocks: {
      structure: `### Structure and order
1. Lead with the conclusion: open with 3–5 sentences of findings, then the supporting points.
2. Text carries conclusions, reasoning and explanation; visuals carry structure, comparison, process and data. They complement each other and never repeat.
3. When a visual is needed, place it after the discussion it belongs to, number it (Figure 1, Figure 2, …), and refer to it in the text as "(see Figure 1)".
4. Follow each visual with 1–2 sentences on what to read in it, covering only what that visual adds.
5. Close with a summary or the next actions.`,
      triggers: `### Visuals are required when any of these applies
- Comparing several objects or options, or a pros/cons matrix.
- A process, procedure, timeline, causal chain or decision tree.
- Hierarchy, architecture, taxonomy or a relationship network.
- Data with trend, share, distribution or composition.
- A rule list or checklist of 5 or more items.
- An abstract principle or mechanism that needs a schematic.`,
      charts: `### Choosing the form
- Comparison → bar chart; trend → line chart; share → pie or donut; distribution → scatter or histogram.
- Process or algorithm → flowchart; hierarchy or architecture → block diagram; taxonomy → mind map or tree; option trade-offs → matrix table.
- Simple one-to-one mapping → Markdown table; complex relationships → a purpose-built structure diagram.`,
      figure: `### Every visual must
- Carry its title above, plus legend, axes and a stated basis or measure.
- Be width-responsive, with figures that match the numbers in the text.
- Mark assumed or illustrative data explicitly when no real data exists; never invent precise values.`,
      html: `### HTML delivery (the user wants a file, or the visual must be interactive)
- One self-contained HTML file: inline CSS/JS, opens directly in a browser; charts from a mature library such as ECharts over CDN.
- One visual per screen, title above; at most three main colors, dark text on a light background, readable CJK typography.
- End with a figure index and state the data source and basis; never hard-code values that cannot be obtained.`,
      fallback: `### Fallback (when the environment cannot render charts)
- Use Mermaid blocks for processes, architecture and sequences; Markdown tables for comparisons and data; indented lists for hierarchy.
- Say so explicitly: "This environment cannot render charts; a Mermaid/table version follows."`,
      redlines: `### Never
- Add decoration with no information gain; one visual carries one topic.
- Contradict the conclusion, pad the answer with unrelated visuals, or fabricate data.
- Draw a visual for something one sentence already explains.`,
    },
  },
}

/**
 * Config is normalized rather than schema-validated: the plugin stays loadable
 * with a hand-edited patch, and every value has a working default.
 */
function normalizeConfig(raw) {
  const config = raw && typeof raw === 'object' ? raw : {}
  const language = config.language === 'en' ? 'en' : 'zh'
  const order = Number(config.order)
  const section =
    typeof config.section === 'string' && config.section.trim() ? config.section.trim() : DEFAULT_SECTION
  const blocks = {}
  const requested = config.blocks && typeof config.blocks === 'object' ? config.blocks : {}
  for (const key of BLOCK_KEYS) blocks[key] = requested[key] !== false
  const append = typeof config.append === 'string' && config.append.trim() ? config.append.trim() : ''
  return {
    enabled: config.enabled !== false,
    language,
    order: Number.isFinite(order) ? order : DEFAULT_ORDER,
    section,
    blocks,
    append,
  }
}

/**
 * The exact prompt text. Exported so the rendered section can be inspected or
 * tested without activating a row.
 */
export function renderSection(rawConfig) {
  const options = normalizeConfig(rawConfig)
  const pack = RULES[options.language]
  const parts = [pack.title]
  for (const key of BLOCK_KEYS) if (options.blocks[key]) parts.push(pack.blocks[key])
  if (options.append) parts.push(options.append)
  return parts.join('\n\n')
}

export function apply(ctx, config) {
  const options = normalizeConfig(config)
  if (!options.enabled) return
  const text = renderSection(config)
  ctx.effect(() =>
    ctx.systemPrompt.section({
      name: options.section,
      order: options.order,
      text,
      // The contract contains no template variables; rendering it literally keeps the prefix byte-stable.
      interpolate: false,
    }),
  )
}