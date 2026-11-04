# dsh-dual-track-output

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件包：让Agent按「双轨」作答——**文字负责结论与推理，图负责结构、对比、流程与数据**。

它只做一件事：给予系统一个提示词。不含工具、不含界面、没有依赖、不联网。

## 它对模型提了什么要求

| 规则块 | 约定 |
|---|---|
| `structure` | 开头 3–5 句给结论；图放在相关论述之后，按图1、图2…编号，正文用「（见图1）」引用；每张图后接 1–2 句读图要点；结尾给小结或下一步。 |
| `triggers` | 命中需要出图的场景后出图：多方案横向对比、流程与时间线、层级结构、带数据的趋势或占比、五条以上清单、抽象机制示意等。 |
| `charts` | 按内容选型：柱状图、折线图、饼图/环形图、散点图、流程图、框图、树状图、矩阵表、Markdown 表格等。 |
| `figure` | 图题在上，图例与坐标轴齐全，宽度自适应，数值与正文一致；没有真实数据时显式标注「示意/假设数据」，禁止编造精确数值。 |
| `html` | 需要交付文件或交互时：单个自包含 HTML，内联 CSS/JS，图表用成熟库（如 CDN 引入 ECharts），一屏一图，主色不超过三种，文末附图表明细与数据口径。 |
| `fallback` | 环境无法渲染图表时，改用 Mermaid 代码块、Markdown 表格、缩进列表，并主动说明这是替代版。 |
| `redlines` | 禁止无信息增量的装饰图，禁止图表与结论矛盾，禁止堆砌无关图，禁止数据造假。 |

默认文本为中文；设置 `language: en` 可切换到结构完全相同的英文版。

## 安装

这是一个带 `dsh.bundle.patch` 的普通包，装进 DeepSeek Harness 的 **profile** 即可。

1. 在 **Plugin Manager** 里用包规格 `github:DingJinSun/dsh-dual-track-output` 安装（pnpm 的 git 规格），或直接写进 profile 的 `package.json`：

   ```json
   {
     "dependencies": { "dsh-dual-track-output": "github:DingJinSun/dsh-dual-track-output" },
     "dsh": { "profile": { "bundles": ["dsh-dual-track-output"] } }
   }
   ```

   安装依赖后重启，或让 profile 自动重载。
2. 启用该行。bundle 的 patch 会插入 `dual-track-output` 一行并带上 `enabled: true`，profile 激活后立即生效。

这样安装时包会被**复制**进 profile 目录，因此与打开哪个工作区无关；该 profile 下的所有会话和子代理都能看到这段契约。

### 多个 profile 各装一次

profile 之间互相独立：你用的每个 profile（例如 `desktop` 和 `web`）都要各装一次。

## 配置

在 profile 的 `cordis.patch.yml` 里覆盖 `dual-track-output` 行。覆盖会**整体替换** `config`，所以要保留的字段必须全部重写。

```yaml
- id: dual-track-output
  name: dsh-dual-track-output
  config:
    enabled: true          # false 即完全移除
    language: zh           # zh | en
    order: 9000            # 提示词顺序；官方环境事实从 10000 起
    section: output:dual-track
    append: ''             # 追加到最后一条启用块之后的额外条款
    blocks:
      structure: true
      triggers: true
      charts: true
      figure: true
      html: true
      fallback: true
      redlines: true
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `enabled` | `true` | 设为 false 时插件不注册任何内容。 |
| `language` | `zh` | 文本包，`zh` 或 `en`。 |
| `order` | `9000` | 段落顺序。官方行为指导在 10000 以下，环境事实在 10000 以上。 |
| `section` | `output:dual-track` | 注册的段落名；同名的 scoped 段落可对单个 agent 覆盖它。 |
| `blocks.*` | `true` | 逐个开关七个规则块。 |
| `append` | `''` | 追加在末尾的团队自定义条款。 |

## 验证

```bash
npm test            # 离线渲染该段落，逐块检查内容与开关行为
```

在真实 profile 里，新开一个会话问它「你的系统提示词里关于输出风格的段落是什么」，它应能复述标题 `## 输出风格：文字 + 可视化双轨` 及七个小节名。也可以在命令面板里直接看系统提示词的拼装结果。

## 实现要点

- 只在 `ctx.effect()` 内做一次 `ctx.systemPrompt.section()` 注册；插件卸载或被禁用时，这段文字随之移除。
- 静态文本 + `interpolate: false`：提示词前缀逐字节稳定，不会破坏 KV cache 复用。
- 仅声明 `inject: ['systemPrompt']`，不读会话状态、不写文件。

## 兼容性

基于 DeepSeek Harness `0.2.x` 编写（`ctx.systemPrompt.section({ name, order, text, interpolate })`），依赖 `system-prompt` 包，标准 profile 均自带。

## 卸载

删掉该行（或设 `enabled: false`），从 `dsh.profile.bundles` 里去掉包名，再移除依赖即可。

## 许可

MIT。
