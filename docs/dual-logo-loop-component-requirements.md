# 双行 Logo Loop 组件需求文档

## 背景

当前 `Zider Logo Loop` 组件提供单行无限滚动 logo 展示能力，适合品牌墙、合作伙伴展示、客户案例入口等场景。新需求希望新增一个独立的双行组件，呈现类似上下两条 logo 跑马灯的视觉效果，增强页面首屏或品牌证明区域的丰富度。

本需求文档将新组件定义为独立组件，而不是在现有单行组件中新增一个样式开关。这样可以降低老组件回归风险，也方便用户在 Wix 编辑器中直接选择“单行”或“双行”组件。

## 目标

- 新增一个可在 Wix 编辑器中单独添加的双行 Logo Loop 组件。
- 组件默认展示上下两条横向滚动 logo 轨道。
- 两条轨道使用同一份 CMS logo 数据，并自动错位排列。
- 保持现有核心能力：CMS 数据、链接、速度、间距、方向、暂停 hover、边缘渐隐、灰度模式、水印和移动端配置。
- 双行组件在桌面端和移动端都不裁切、不跳动、不出现明显空白。

## 非目标

- 不新增第二个 CMS Collection。
- 不要求用户为上行和下行分别维护 logo 数据。
- 不在第一版提供复杂布局模板，例如三行、网格、瀑布流或静态品牌墙。
- 不重做 Dashboard 的 logo 管理流程。
- 不改变现有 `Zider Logo Loop` 单行组件的默认行为。

## 组件定义

建议名称：

- 编辑器展示名：`Zider Dual Logo Loop`
- 自定义元素标签：`zider-dual-logo-loop`
- 代码目录：`src/extensions/site/dual-logo-loop/`
- 预览缩略图：新增 `public/dual-logo-loop-preview.svg`

组件应在 Wix 添加面板中作为一个新的 preset 出现，让用户不需要进入设置面板就能区分单行和双行版本。

## 用户场景

1. 站长希望在首页展示合作品牌，希望视觉比单行 logo 更饱满。
2. 设计师希望两个 logo 行错位滚动，形成截图中的双行品牌墙效果。
3. 免费用户可以直接使用双行展示，但保留 ZIDER badge。
4. 付费用户可以开启灰度模式、隐藏 ZIDER badge，并使用移动端专属设置。
5. 用户只在 Dashboard 维护一份 logo 数据，两个组件都能读取并展示。

## 功能需求

### 数据

- 读取现有 Collection：`@zider-ink/zider-loop-logo/database`。
- 按 `sortNumber` 升序展示。
- 单次最多读取 100 条。
- 当 CMS 为空或读取失败时，使用 fallback logos。
- 每个 logo 支持：
  - 图片
  - 标题或描述作为 `alt`
  - 可选链接

### 双行布局

- 组件包含两条 logo 行：上行和下行。
- 每一行都使用完整 logo 列表。
- 下行需要自动错位，建议将 logo 列表从中间位置切分后重排。
- 两行之间需要有行间距，第一版建议自动计算：

```text
rowGap = max(16px, round(logoHeight * 0.55))
```

- 组件总高度：

```text
totalHeight = logoHeight * 2 + rowGap
```

- 边缘渐隐遮罩覆盖整个双行区域，而不是分别覆盖每一行。
- 水印固定在组件右下角。

### 动画

- 两行都需要无限无缝滚动。
- 第一版建议默认：
  - 上行按用户设置的方向滚动。
  - 下行反向滚动，制造双行动态对比。
- 速度使用现有 `speed` 逻辑，数值越大滚动越快。
- 每行独立计算内容宽度并克隆节点，避免 logo 数量少时露空。
- hover 暂停时，两行同时暂停。
- 图片加载完成前不显示轨道，避免初始闪烁和跳位。

### 设置面板

新组件设置面板可以复用现有单行组件的信息架构：

- `Content`
  - `Manage Logos`
- `Layout`
  - `Logo height`
  - `Logo gap`
- `Motion`
  - `Speed`
  - `Direction`
  - `Pause on hover`
- `Behavior`
  - `Enable Clickable Links`
  - `Hidden Edge Fade Color`
  - `Edge Fade Color`
- `Upgrade`
  - `Hidden Zider badge`
  - `Gray Mode (Hover to Color)`
- `Mobile`
  - `Mobile Setting`
  - `Mobile Logo Height`
  - `Mobile Speed`
  - `Mobile Logo Spacing`

第一版不单独暴露 `Row gap`、`Row direction`。这两个能力可以作为后续增强，避免面板过重。

### 移动端

- 开启移动端设置后，移动端使用 `mobileLogoHeight`、`mobileGap`、`mobileSpeed`。
- 双行组件移动端总高度同样按 `mobileLogoHeight * 2 + rowGap` 计算。
- 在 Wix mobile editor 中修改高度、间距、速度时，应直接写入 mobile props。
- 移动端最小 logo 高度建议 20px，最大 96px。
- 组件宽度较窄时仍保持横向滚动，不允许 logo 自动换行。

### 付费能力

沿用现有付费规则：

- 免费用户：
  - 必须展示 ZIDER badge。
  - 禁用灰度模式。
  - 禁用移动端专属设置。
- 付费用户：
  - 可隐藏 ZIDER badge。
  - 可开启灰度模式。
  - 可开启移动端专属设置。

如果计划校验失败，设置面板应进入 `unknown` 状态。为避免误放开付费能力，`unknown` 状态按免费用户处理。

## 技术需求

### 代码结构

建议新增独立目录：

```text
src/extensions/site/dual-logo-loop/
  dual-logo-loop.extension.ts
  dual-logo-loop.panel.tsx
  dual-logo-loop.ts
```

第一版可以从现有 `logo-loop` 复制并收敛修改，保持实现风险可控。后续如果两个组件逻辑稳定，再抽公共工具函数，例如 CMS 读取、图片 URL 归一化、计划校验和颜色处理。

### 属性

新组件应支持与单行组件一致的属性：

```text
speed
gap
logo-height
direction
pause-on-hover
hidden-mask-color
mask-color
links
gray-mode
enable-mobile-settings
mobile-speed
mobile-gap
mobile-logo-height
hide-watermark
collection-id
```

不建议第一版新增配置属性。双行差异由组件内部默认行为决定。

### 渲染结构

建议结构：

```html
<div class="zider-dual-logo-loop">
  <div class="zider-dual-logo-row" data-row="top">
    <div class="zider-dual-logo-track">...</div>
  </div>
  <div class="zider-dual-logo-row" data-row="bottom">
    <div class="zider-dual-logo-track">...</div>
  </div>
  <a class="zider-watermark">...</a>
</div>
```

动画启动逻辑需要遍历所有 `.zider-dual-logo-track`，分别计算、克隆和设置动画。

### 高度与尺寸

- host 高度需要由组件主动设置为双行总高度。
- 根容器高度等于双行总高度。
- 单行 row 高度等于 `logoHeight`。
- 轨道和 logo item 必须 `flex-wrap: nowrap`、`width: max-content`、`flex-shrink: 0`。
- 图片高度为 `100%`，宽度自适应。

## 验收标准

- 在 Wix 编辑器中能看到并添加 `Zider Dual Logo Loop`。
- CMS 有数据时，双行展示 CMS logo。
- CMS 无数据或查询失败时，双行展示 fallback logos。
- 上下两行均无限滚动，无明显断点或空白。
- 下行 logo 顺序与上行错位。
- hover 组件任意区域时，两行同时暂停。
- 开启链接时，两个行里的 logo 都可点击跳转。
- 关闭链接时，logo 不显示 pointer cursor，也不会打开链接。
- 开启灰度模式后，两个行里的 logo 默认灰度，hover 单个 logo 恢复彩色。
- 隐藏边缘颜色时，边缘渐隐透明；关闭隐藏时使用用户选择的颜色。
- 免费用户无法隐藏 badge、无法启用灰度模式、无法启用移动端专属设置。
- 付费用户可以使用上述高级能力。
- 移动端启用 mobile 设置后，高度、速度、间距使用 mobile props。
- `npm run typecheck` 通过。
- `npm run build` 通过。

## 风险与注意事项

- 双行组件总高度变高，如果 Wix 容器高度没有同步，可能出现裁切，需要确保 `heightMode: 'AUTO'` 并主动设置 host 高度。
- 两行独立克隆时，如果复用单行的 `querySelector` 逻辑，只会启动第一行，需要改为 `querySelectorAll`。
- 反向滚动会让第二行使用 `animation-direction: reverse`，必须验证初始位置不会露空。
- fallback logo 数量较少时，克隆逻辑必须足够稳健。
- 现有文件已有未提交修改，实现时需要保留这些改动，不要回退。

## 后续增强

- 增加 `Row gap` 设置。
- 增加 `Row direction` 设置：同向、反向、交错。
- 增加 `Row offset` 设置，允许用户调整上下行错位程度。
- 支持分别选择 logo 数据分组。
- 支持更多预设，例如 `Compact Dual`、`Hero Brand Wall`。

## 推荐实施顺序

1. 复制现有 `logo-loop` 组件为 `dual-logo-loop` 基础版本。
2. 调整 extension 名称、id、tagName、缩略图和默认高度。
3. 修改 custom element 渲染结构为双行。
4. 修改动画启动逻辑，支持多条 track。
5. 修改高度计算，避免双行裁切。
6. 复制并调整设置面板文案。
7. 添加预览缩略图。
8. 运行 typecheck 和 build。
9. 在桌面和移动编辑器中做视觉验收。
