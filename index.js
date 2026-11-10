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
const BLOCK_KEYS = ['structure', 'triggers', 'charts', 'figure', 'layout', 'geometry', 'html', 'fallback', 'redlines']

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
      layout: `### 图表尺寸与图文排版（硬性指标，违反即返工）
**尺寸底线**
1. 每个图表容器占满内容区整行宽度，禁止放进多列卡片栅格；两图并排时每张渲染宽度须 ≥520px，不足则改为上下单列。
2. 内容区宽度 1100–1280px（窄屏自适应），图表占满整个内容区，不得再套一层窄容器。
3. 图表高度 min(60vh, 520px)，且不低于 360px；纵轴类别 >6 项时按每项 ≥48px 加高。
4. 图表必须由 ECharts 渲染，禁止用手写 SVG 或小 canvas 充当数据图表。
5. 容器尺寸变化必须重绘（ResizeObserver 或 window resize 监听 chart.resize()），禁止拉伸位图。

**图内可读性**
6. 轴标签、图例、提示框字号 ≥13px；图表标题 16–18px；数值标注 13px 加粗。
7. grid 用 containLabel: true，left/right 按最长标签预留（长标签 ≥6 字时 left 留 18%–25%）。
8. 类别 >8 项改横向条形图；竖排长标签旋转 30°–45° 或隔项显示，禁止压成竖排单字。
9. 图例置于图顶左侧，不压数据区；除网格线外不显示装饰线条。

**图文搭配**
10. 区块顺序固定：结论段（3–5 句）→ 图表（独占整行）→ 读图要点（1–2 句）；说明文字不与图表左右并列挤压。
11. 图表标题写结论，不写「XX图表」（例：「直营渠道成本是加盟的 3 倍」，不是「渠道成本对比图」）。
12. 图内只标关键数值（最大/最小/目标/异常），不逐点标注；文字不复述图内已有标签。
13. 一图一结论；整页配色固定为一个主色阶 + 一个对比色，禁止彩虹色板、禁止每图换色。
14. 区块间距 40–64px，图表卡片内边距 ≥24px，背景与页面同色，不加厚边框和层叠阴影。
15. 移动端图表容器宽度占视口 ≥65%，默认单列堆叠，不缩字号硬塞。

**图片呈现（等比例放大到正文列宽）**
16. 图在正文里按容器宽度 100% 显示，左右边缘与正文文字对齐；禁止设更小的 max-width、禁止居中留白、禁止左右再垫内边距。
17. 高度按原始宽高比自动计算（height: auto），禁止写死 height、禁止 object-fit: cover 裁切、禁止单向拉伸——只允许整体等比例缩放。
18. 位图像素按目标显示宽度的 2 倍导出（列宽 1280px 就出 ≥2560px 宽），放大后不糊；HTML 里写 width:100%; height:auto; max-width:100%。
19. 图内字号、线宽、间距随整体缩放同步变化：放大是"把整张图放大"，不是只把画布加宽。`,
      geometry: `### 构图几何：元素不重叠，连线落在边框上
1. 同类元素只给「尺寸 + 最小间距」两个常量，位置循环累加推出（next = prev + size + gap），禁止逐个手写坐标——重叠就藏在某个手写的数字里。
2. 生成后立即自检：任意两个元素间距 ≥ 设定值、文本宽度 ≤ 容器宽度；把检查写成断言或脚本，失败就报错重排，不要靠肉眼看图。
3. 连线终点由目标框的 x/y/w/h 反推：从左侧进入取 x，从上/下进入取 y；多路汇入同一面时入点错开（1/6、1/2、5/6），禁止几条线共用一点，禁止终点落进框内。
4. 连线不得压过边框和文字：转折放在框外，箭头尖端停在边界上。
5. 分组底色、图例、编号等第二层结构由第一层元素算出（包围盒 + 间隙中点），不要另写一套坐标。
6. 文本先量后放：字号与文案定下后先估宽度，超宽就换行、缩字号或改短，不允许溢出压到相邻元素。`,
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
      layout: `### Chart sizing and typography (hard limits; rework if violated)
**Size floor**
1. Every chart container spans the full content row; never place it inside a multi-column card grid. Two charts side by side must each render ≥520px wide, otherwise stack them in one column.
2. The content area is 1100–1280px wide (fluid on narrow screens); charts fill the whole content area, with no extra narrow wrapper.
3. Chart height is min(60vh, 520px) and never below 360px; past 6 axis categories, grow by at least 48px per category.
4. Data charts must be rendered by ECharts; hand-written SVG or small canvases are not acceptable.
5. Redraw on container resize (ResizeObserver, or window resize calling chart.resize()); never scale a bitmap.

**Readability inside the chart**
6. Axis labels, legend and tooltip text ≥13px; chart title 16–18px; value labels 13px bold.
7. Use containLabel: true in the grid and reserve left/right for the longest label (18%–25% on the left once labels reach 6+ characters).
8. Past 8 categories switch to a horizontal bar chart; rotate long labels 30°–45° or show every other one — never squeeze them into vertical characters.
9. Legend sits at the top left, clear of the plot area; no decorative lines beyond the grid.

**Text and figure together**
10. Fixed block order: conclusion paragraph (3–5 sentences) → chart (full row) → 1–2 sentences on what to read. Prose never squeezes beside a chart.
11. The chart title states the conclusion ("Direct-channel cost is 3× the franchise channel"), never "Channel cost comparison chart".
12. Label only the key values (max/min/target/outlier), not every point; the text does not restate labels already in the chart.
13. One chart, one conclusion; a page keeps one primary ramp plus one accent — no rainbow palettes and no per-chart recolouring.
14. Section spacing 40–64px, chart card padding ≥24px, background matches the page, no heavy borders or stacked shadows.
15. On mobile the chart container is ≥65% of the viewport, single-column by default, and fonts are never shrunk to force a fit.

**Image presentation (scale up to the text column)**
16. In the body a figure renders at 100% of the container width, with its edges aligned to the text; no smaller max-width, no centring with empty gutters, no extra horizontal padding.
17. Height follows the intrinsic aspect ratio (height: auto): never hard-code height, never crop with object-fit: cover, never stretch one axis — only uniform, proportional scaling.
18. Export bitmaps at 2× the target display width (a 1280px column needs ≥2560px of pixels) so scaling up stays sharp; in HTML write width:100%; height:auto; max-width:100%.
19. Type size, stroke width and spacing scale with the figure as a whole: enlarging means scaling the whole figure, not just widening the canvas.`,
      geometry: `### Composition geometry: no overlaps, connectors stop on borders
1. Repeated elements get two constants only — size and minimum gap; positions follow next = prev + size + gap. Never hand-write every coordinate: an overlap hides inside one of those typed numbers.
2. Self-check right after generation: minimum gap between any two elements ≥ the constant, and text width ≤ container width. Encode it as an assertion or script that fails loudly and re-lays out — do not rely on eyeballing the render.
3. Derive connector endpoints from the target box's x/y/w/h: enter on the left → use x; enter from the top or bottom → use y; stagger entry points (1/6, 1/2, 5/6) when several connectors share one side. Never let several arrows land on one point, and never let an endpoint fall inside the box.
4. Connectors must not cross a border or text: put the elbow outside the box and stop the arrowhead on the border.
5. Second-layer structure (group backgrounds, legends, numbering) is computed from first-layer elements (bounding box plus gap midpoints), never from a second set of coordinates.
6. Measure text before placing it: with the size and copy fixed, estimate the width first; if it overflows, wrap, shrink or shorten — never let it bleed into a neighbour.`,
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