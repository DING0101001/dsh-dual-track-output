# dsh-dual-track-output

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) bundle that makes the agent answer in two tracks: **text carries the conclusion and the reasoning, visuals carry structure, comparison, process and data**.

It registers one static system-prompt section, no tools, no UI, no dependencies, no network.

## What it tells the model

| Block | Contract |
|---|---|
| `structure` | Lead with 3–5 sentences of conclusion; place each figure after the discussion it belongs to, number it, refer to it as "(see Figure 1)"; follow it with 1–2 sentences on what to read; close with a summary or next actions. |
| `triggers` | A visual is required when comparing options, describing a process, showing hierarchy, carrying data, listing 5+ rules, or explaining an abstract mechanism. |
| `charts` | Pick the form from the content: bar, line, pie/donut, scatter, flowchart, block diagram, tree, matrix, Markdown table. |
| `figure` | Title above, legend and axes, responsive width, values that match the text, and explicit "illustrative data" marking instead of invented numbers. |
| `html` | For file or interactive output: one self-contained HTML file, inline CSS/JS, charts from a mature library (e.g. ECharts over CDN), one visual per screen, at most three main colors, figure index with data basis. |
| `fallback` | When the environment cannot render charts: Mermaid blocks, Markdown tables, indented lists, and say so. |
| `redlines` | No decoration without information gain, no figure that contradicts the conclusion, no padding with unrelated visuals, no fabricated data. |

The default text is Chinese (the contract was written for Chinese replies); set `language: en` for an English pack with the same block structure.

## Install

The bundle is a normal package with a `dsh.bundle.patch` install it into a DeepSeek Harness profile.

1. In **Plugin Manager**, install the bundle from the package spec `github:DingJinSun/dsh-dual-track-output` (pnpm git spec), or add it to your profile's `package.json`:

   ```json
   {
     "dependencies": { "dsh-dual-track-output": "github:DingJinSun/dsh-dual-track-output" },
     "dsh": { "profile": { "bundles": ["dsh-dual-track-output"] } }
   }
   ```

   Install the dependency, then restart or let the profile reload.
2. Enable the bundle's row. The bundle patch inserts `dual-track-output` with `enabled: true`, so it is live as soon as the profile activates it.

Installed this way the package is copied into the profile, so it keeps working regardless of which workspace you open, and every session and subagent in that profile sees the section.


## Configure

Override the row in your profile's `cordis.patch.yml`. An override replaces the complete `config`, so repeat every field you keep.

```yaml
- id: dual-track-output
  name: dsh-dual-track-output
  config:
    enabled: true          # false removes the section entirely
    language: zh           # zh | en
    order: 9000            # prompt order; first-party environment facts start at 10000
    section: output:dual-track
    append: ''             # extra text appended after the last enabled block
    blocks:
      structure: true
      triggers: true
      charts: true
      figure: true
      html: true
      fallback: true
      redlines: true
```

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `true` | When false the plugin registers nothing. |
| `language` | `zh` | Text pack; `zh` or `en`. |
| `order` | `9000` | Section order. First-party behaviour guidance sits below 10000; environment facts at 10000+. |
| `section` | `output:dual-track` | Registered section name; a scoped section with the same name can shadow it for one agent. |
| `blocks.*` | `true` | Switch each rule block on or off. |
| `append` | `''` | Team-specific rules appended last. |

## Verify

```bash
npm test            # offline: renders the section and checks every block and switch
```

In a live profile, ask a fresh agent what its system prompt says about output style; it should quote the heading `## 输出风格：文字 + 可视化双轨` and the seven sub-headings.

## How it works

- One ctx.systemPrompt.section()` registration inside `ctx.effect()`, so unloading or disabling the plugin removes the text.
- Static text with `interpolate: false`: the prompt prefix is byte-stable across requests, so it does not churn KV cache reuse.
- The plugin declares `inject: ['systemPrompt']` and nothing else; it reads no session state and writes no files.

## Compatibility

Built against DeepSeek Harness `0.2.x` (`ctx.systemPrompt.section({ name, order, text, interpolate })`). Requires the `system-prompt` package, which any standard profile includes.

## Uninstall

Remove the row (or set `enabled: false`) and drop the bundle from `dsh.profile.bundles`; then remove the dependency.

## License

MIT.

---

## 中文说明

**这是什么**：一个 DeepSeek Harness 插件包，往系统提示词里注册一条「文字 + 可视化双轨」输出契约。文字给结论和推理，图承载结构、对比、流程与数据；插件本身不含工具、界面和依赖。

**装在哪**：装进 **profile** 而不是工作区，因此对所有会话、所有子代理生效，换工作区不受影响。多个 profile（如 desktop、web）需要各装一次。

**怎么装**：在 Plugin Manager 里用包规格 `github:DingJinSun/dsh-dual-track-output` 安装并启用；或把依赖写进 profile 的 `package.json`，再把包名加进 `dsh.profile.bundles`。

**怎么配**：在 profile 的 `cordis.patch.yml` 里覆盖 `dual-track-output` 行，可关掉整块（`enabled: false`）、切换中英文、单独关闭七个规则块之一，或用 `append` 追加自己的条款。注意覆盖会整体替换 `config`，需保留要用的字段。

**怎么验**：`npm test` 离线渲染并检查每个块；线上则问一个新会话「你的系统提示词里关于输出风格的段落是什么」，它应能逐字复述标题和七个小节名。

**许可**：MIT。
