# Logo Wall Slider 组件需求文档

## 背景

当前 `Zider Logo Loop` 插件已有两类 logo 展示组件：

- `Zider Logo Loop`：单行或双行连续横向滚动，适合通用品牌墙。
- `Zider Trusted Logo Rotator`：固定槽位向上替换，适合 pricing、enterprise、trust section。

新需求希望新增一种更具视觉承载力的 logo wall 样式：多个横向轨道排列成多排，每排 logo 放在卡片中左右滑动，形成类似品牌墙、客户墙、合作机构墙的展示效果。

参考交互：

```text
https://kayreachasia-wixstudio-com.filesusr.com/html/cca041_6392940300868f1a84f6dd73877a8d48.html
```

参考页面核心特征：

- 多排 logo 卡片。
- 每排横向连续 marquee。
- 相邻行方向相反。
- hover 整个区域暂停。
- 左右边缘有渐隐遮罩。
- logo 卡片有白底、圆角、轻阴影。
- hover 单个卡片轻微上浮并高亮边框。

## 命名

建议组件名称：

- 编辑器展示名：`Zider Logo Wall Slider`
- 组件类型名：`Logo Wall Slider`
- 自定义元素标签：`zider-logo-wall-slider`
- 代码目录：`src/extensions/site/logo-wall-slider/`
- 预览缩略图：`public/logo-wall-slider-preview.svg`

命名说明：

- 不叫 `Carousel`，因为第一版不提供箭头、分页点、拖拽或 swipe。
- 不叫 `Rotator`，因为它不是固定槽位替换。
- 使用 `Logo Wall Slider` 表达“多排 logo 墙 + 横向滑动”的视觉结果，用户更容易理解。

## 产品定位

`Logo Wall Slider` 是现有 Wix 插件中的新增组件样式，不是新插件。

它与现有组件关系：

```text
Zider Logo Loop              连续横向滚动，偏轻量
Zider Trusted Logo Rotator   固定槽位替换，偏克制
Zider Logo Wall Slider       多排卡片滑动，偏品牌墙展示
```

三个组件复用同一个 Dashboard 和同一个 CMS logo 数据。

## 目标

- 新增一个独立 site component。
- 支持多排 logo 卡片横向连续滑动。
- 按 logo 顺序自动分行，不要求用户手动维护行号。
- 支持每排方向交替滑动。
- 支持 hover 暂停所有行。
- 支持卡片样式、间距、行数、速度、边缘渐隐等配置。
- 复用现有 CMS 数据和 Dashboard 管理入口。
- CMS 无数据时不展示默认品牌假数据。
- 不影响现有 `Logo Loop` 和 `Trusted Logo Rotator` 行为。

## 非目标

- 不新建插件。
- 不新建第二个 logo collection。
- 不复制参考页面的具体 logo、品牌名或页面背景。
- 不做箭头控制、分页点、拖拽、swipe 手势。
- 不做点击切换下一页。
- 不做瀑布流或 masonry 布局。
- 不要求用户必须手动维护每个 logo 的行号。
- 不改变旧组件已有配置和默认表现。

## 用户场景

1. 用户希望在首页展示合作客户墙，需要比单行 marquee 更饱满。
2. 用户希望在落地页中展示多行业、多客户 logo，形成强信任背书。
3. 用户希望默认自动分行，不额外维护数据。
4. 用户希望只通过调整 `Sort Number` 控制整体 logo 顺序。
5. 用户希望移动端保留多排效果，但减少行数和卡片尺寸。

## 视觉需求

### 默认视觉

- 容器为大圆角矩形。
- 背景默认透明或浅色，可配置。
- 可选细边框。
- 左右边缘有渐隐遮罩。
- 每个 logo 在独立卡片中展示。
- 卡片默认白底、圆角、轻阴影。
- logo 保持原比例，居中展示。
- logo 不应被拉伸、压扁或裁切。

### Hover 效果

hover 单个 logo 卡片：

- 卡片轻微上浮。
- 阴影略增强。
- 边框颜色高亮。
- 如果开启灰度模式，hover 当前 logo 恢复彩色。

hover 整个组件：

- 所有行暂停滚动。

### 边缘渐隐

- 整个 logo wall 左右两侧需要渐隐。
- 渐隐遮罩覆盖所有行，而不是每行单独处理。
- 支持透明渐隐或指定背景色渐隐。

## 数据需求

### 默认数据源

复用现有 Collection：

```text
@zider-ink/zider-loop-logo/database
```

现有字段：

```text
title        logo 名称，用于 alt/name
image        logo 图片
description  alt fallback
sortNumber   排序
link         可选链接
```

读取规则：

- 按 `sortNumber` 升序。
- 最多读取 50 条。
- 不使用 OpenAI、Google 等默认假数据。
- 查询失败时保持空状态，并输出安全 console warning。
- CMS 为空时不渲染 logo 卡片。

### 是否需要新增字段

第一版不新增字段。

`Logo Wall Slider` 默认根据现有 `sortNumber` 自动分组：

```text
sortNumber 越小越靠前
组件根据 rows 自动把 logo 分配到每一行
```

这意味着用户只需要维护现有字段，不需要理解或配置 Row。

后续如果确实需要“指定某几个 logo 固定在同一行”，再新增可选字段：

```text
rowNumber
```

字段定义：

```text
key: rowNumber
displayName: Row
type: NUMBER
required: false
```

取值规则：

```text
空值      Auto，由组件自动分配
1         固定展示在第 1 行
2         固定展示在第 2 行
3         固定展示在第 3 行
4         固定展示在第 4 行
```

兼容规则：

- 旧数据没有 `rowNumber`，全部按 Auto 处理。
- 旧组件可以忽略 `rowNumber`，不改变 `Logo Loop` 和 `Trusted Logo Rotator`。
- 如果组件设置为 2 行，但某个 logo 配置了 Row 3 或 Row 4，该 logo 不丢弃，按 Auto 处理。
- 如果 `rowNumber` 不是有效数字，也按 Auto 处理。

### Dashboard 分组展示

第一版 Dashboard 不展示 Row 配置。

后续加入手动分组时，Dashboard 中不建议让用户直接输入数字，应展示为下拉：

```text
Auto
Row 1
Row 2
Row 3
Row 4
```

Dashboard 表格建议增加一列：

```text
Row
```

展示规则：

- `rowNumber` 为空显示 `Auto`。
- `1` 显示 `Row 1`。
- `2` 显示 `Row 2`。
- `3` 显示 `Row 3`。
- `4` 显示 `Row 4`。

手动 Row 属于增强能力，不进入第一版开发范围。

## 分行规则

### 自动分行

第一版只支持自动分行。

组件先按现有 `sortNumber` 得到一个有序 logo 列表，再根据 `rows` 自动分配到每一行。

推荐策略：按排序后的列表 round-robin 分配。

2 行示例，假设 CMS 排序结果为 1 到 10：

```text
Row 1: 1, 3, 5, 7, 9
Row 2: 2, 4, 6, 8, 10
```

3 行示例：

```text
Row 1: 1, 4, 7, 10
Row 2: 2, 5, 8
Row 3: 3, 6, 9
```

4 行示例：

```text
Row 1: 1, 5, 9
Row 2: 2, 6, 10
Row 3: 3, 7
Row 4: 4, 8
```

原因：

- 每行 logo 数量更均匀。
- 用户只维护 `sortNumber` 就能得到自然排列。
- 不需要理解复杂分组规则。
- 不新增数据库字段，旧数据完全兼容。

### 自动分行细节

自动分行需要保持视觉均衡，而不是简单把前半段放第一行、后半段放第二行。

不推荐：

```text
Row 1: 1, 2, 3, 4, 5
Row 2: 6, 7, 8, 9, 10
```

原因：

- 第一行会集中展示排序靠前的 logo。
- 第二行会集中展示排序靠后的 logo。
- 如果前几个是重点客户，会导致视觉分布不均。

推荐：

```text
Row 1: 1, 3, 5, 7, 9
Row 2: 2, 4, 6, 8, 10
```

这样重点 logo 会自然分散到各行。

### 手动分组

手动分组不进入第一版。以下为后续增强方案。

当部分 logo 设置了 `rowNumber` 时：

1. 先把有效 `rowNumber` 的 logo 放入指定行。
2. 每行内部仍按 `sortNumber` 升序。
3. 未指定行的 Auto logo 进入自动池。
4. Auto logo 优先填充当前数量较少的行，保证每行相对均衡。
5. 如果某行手动指定过多，不做强制平衡，尊重用户指定。

示例：

```text
Shell    rowNumber 1  sortNumber 10
IKEA     rowNumber 1  sortNumber 20
Grab     rowNumber 1  sortNumber 30
DHL      rowNumber 2  sortNumber 10
Amazon   rowNumber 2  sortNumber 20
AMD      rowNumber 2  sortNumber 30
```

结果：

```text
Row 1: Shell / IKEA / Grab
Row 2: DHL / Amazon / AMD
```

### 数量不足处理

- logo 数量为 0：组件保持空状态，不报错。
- logo 数量少于行数：只渲染有 logo 的行，或按配置行数渲染空行占位。第一版建议只渲染有 logo 的行。
- 某一行 logo 数量少于 2：从完整 logo 列表中补充 clone，保证滚动不断档。
- 不足以滚动时可以静态居中展示，但仍保持卡片样式。

## 动画需求

### 滚动方式

- 每一行是独立横向 marquee。
- 每一行由 logo group + clone group 组成。
- 需要根据容器宽度动态补足 clone 数量，避免宽屏露空。
- 滚动使用 CSS transform，不使用频繁 JS 更新位置。

### 方向

默认方向模式为 `Alternate`：

```text
Row 1: left
Row 2: right
Row 3: left
Row 4: right
```

可选方向模式：

```text
Alternate
Left
Right
```

### 速度

- 使用统一 `speed` 配置。
- 数值越大滚动越快。
- 内部换算为 animation duration。
- 每行可以使用轻微速度差，例如奇数行 100%，偶数行 108%，避免机械感。
- 第一版可以先统一速度，降低实现复杂度。

### 暂停

- `pause-on-hover=true` 时，hover 整个组件暂停所有行。
- 鼠标离开后恢复。
- `prefers-reduced-motion: reduce` 时禁用无限动画，静态展示。

## 设置面板需求

### Content

- `Manage Logos`
- 提示：最多展示 50 个 logo。
- 提示：Logo Wall Slider 会根据 Sort Number 自动分行。

### Layout

- `Rows`
  - desktop 默认 2
  - 范围 1-4
- `Logo height`
  - 默认 48px
  - 范围 20-120px
- `Card width`
  - 默认 160px
  - 范围 96-260px
- `Card height`
  - 默认 78px
  - 范围 48-150px
- `Logo gap`
  - 默认 20px
  - 范围 8-64px
- `Row gap`
  - 默认 18px
  - 范围 8-56px
- `Card radius`
  - 默认 16px
  - 范围 0-32px

### Motion

- `Speed`
  - 默认 40
  - 范围 1-100
- `Direction mode`
  - `Alternate`
  - `Left`
  - `Right`
- `Pause on hover`
  - 默认开启

### Style

- `Background color`
- `Card color`
- `Border color`
- `Highlight color`
- `Edge fade color`
- `Show border`
- `Show shadow`
- `Gray mode`

### Behavior

- `Enable clickable links`
- `Hide Zider badge`

### Mobile

- `Mobile Setting`
- `Mobile rows`
  - 默认 2
  - 范围 1-3
- `Mobile logo height`
- `Mobile card width`
- `Mobile card height`
- `Mobile speed`
- `Mobile logo gap`
- `Mobile row gap`

## 默认值

Desktop:

```text
rows = 2
logoHeight = 48
cardWidth = 160
cardHeight = 78
logoGap = 20
rowGap = 18
cardRadius = 16
speed = 40
directionMode = Alternate
pauseOnHover = true
```

Mobile:

```text
rows = 2
logoHeight = 34
cardWidth = 118
cardHeight = 62
logoGap = 12
rowGap = 12
speed = 36
```

## 付费能力

沿用现有规则。

免费用户：

- 展示 ZIDER badge。
- 禁用 `Hide Zider badge`。
- 禁用 `Gray mode`。
- 禁用移动端专属设置。

付费用户：

- 可隐藏 badge。
- 可开启灰度 hover 彩色。
- 可启用 mobile settings。

如果计划校验失败，按免费用户处理。

## 技术需求

### 代码结构

新增目录：

```text
src/extensions/site/logo-wall-slider/
  logo-wall-slider.extension.ts
  logo-wall-slider.panel.tsx
  logo-wall-slider.ts
```

新增缩略图：

```text
public/logo-wall-slider-preview.svg
```

更新入口：

```text
src/extensions.ts
```

### 属性

建议属性：

```text
rows
logo-height
card-width
card-height
gap
row-gap
card-radius
speed
direction-mode
pause-on-hover
background-color
card-color
border-color
highlight-color
hidden-mask-color
mask-color
show-border
show-shadow
links
gray-mode
enable-mobile-settings
mobile-rows
mobile-logo-height
mobile-card-width
mobile-card-height
mobile-speed
mobile-gap
mobile-row-gap
hide-watermark
collection-id
```

### 渲染结构

建议结构：

```html
<div class="zider-logo-wall-slider">
  <div class="zider-logo-wall-marquee">
    <div class="zider-logo-wall-row" data-row="1" data-direction="left">
      <div class="zider-logo-wall-track">
        <div class="zider-logo-wall-group">...</div>
        <div class="zider-logo-wall-group" aria-hidden="true">...</div>
      </div>
    </div>
  </div>
  <a class="zider-watermark">...</a>
</div>
```

### 尺寸与高度

组件高度由内部计算：

```text
componentHeight = rows * cardHeight + (rows - 1) * rowGap + verticalPadding * 2
```

要求：

- host 主动设置高度，避免 Wix 编辑器裁切。
- 根容器 `overflow: hidden`。
- row `overflow: visible` 或由 marquee 容器统一裁切。
- track `width: max-content`。
- logo card `flex-shrink: 0`。
- logo image `object-fit: contain`。

### 图片加载

- 使用 `decoding="async"`。
- 首屏关键 logo 可使用 `fetchpriority="high"`。
- 其他 logo 使用 lazy 或低优先级。
- 图片加载失败时隐藏该 logo item，不让破图图标影响视觉。

### 性能

- 最多读取 50 个 logo。
- 使用 CSS animation 和 transform。
- 不使用 requestAnimationFrame 持续计算。
- resize 时 debounce 重新计算 clone 数量。
- 缓存 CMS 查询结果，避免同页多个组件重复请求。

## Dashboard 需求

第一版最小变更：

- 不新增 `rowNumber` 字段。
- Dashboard 继续维护现有 logo 数据。
- Dashboard CRUD 优先使用自己的页面：添加、编辑、删除、选择图片、上传图片。
- `Open CMS` 降级为 Advanced 入口。
- 列表顶部提示：Logo Wall Slider uses Sort Number to distribute logos across rows automatically.

### Dashboard 图片管理

为了让 Dashboard 成为主工作台，添加和编辑 logo 时必须支持图片选择或上传。

图片入口优先级：

```text
Choose from Media Manager
Upload Image
Open CMS
```

`Choose from Media Manager`：

- 使用 Wix Dashboard 的 Media Manager 能力。
- 支持从用户已有 Wix 媒体库选择图片。
- 第一版单选即可，不需要批量选择。
- 选择后立即展示预览。

`Upload Image`：

- 支持 PNG、JPG、JPEG、WebP、SVG。
- 上传到 Wix Media。
- 上传成功后保存到 CMS `image` 字段。
- 上传失败时展示 toast，不创建半成品 logo。

`Open CMS`：

- 作为 Advanced 入口保留。
- 用于用户需要进入 Wix 原生 CMS 做复杂维护时使用。

完整版本：

- CMS schema 增加可选 `rowNumber` 字段。
- Dashboard logo 列表显示 Row 列。
- Dashboard 每个 logo 支持编辑 Row。
- Row 使用下拉，不直接输入数字。
- 保存后刷新列表。
- 列表顶部提示：

```text
Logo Wall Slider can use Row to keep selected logos on the same line. Leave Row as Auto for automatic layout.
```

## 验收标准

- Wix 编辑器中可以添加 `Zider Logo Wall Slider`。
- 组件读取现有 CMS logo。
- CMS 为空时不展示默认假 logo。
- 默认展示 2 排卡片式 logo wall。
- 相邻行默认反向滚动。
- 横向滚动无明显断点、空白或跳动。
- hover 组件时所有行暂停。
- hover 单个卡片时卡片上浮并高亮。
- 开启链接后 logo 可点击跳转。
- 关闭链接后 logo 不显示 pointer，也不跳转。
- 开启灰度模式后 logo 默认灰度，hover 当前 logo 恢复彩色。
- 组件根据 `sortNumber` 自动分行。
- 用户调整 `Sort Number` 后，组件行分配随顺序自动变化。
- 移动端可使用 mobile rows 和 mobile card sizing。
- `prefers-reduced-motion: reduce` 下禁用无限动画。
- `npm run typecheck` 通过。
- `npm run build` 通过。

## 风险与注意事项

- 多排 marquee 对 clone 数量要求更高，宽屏下必须动态补足，不能只复制一份。
- 自动分行要用 round-robin，不能简单切段，否则视觉重点会集中在某一行。
- 某一行 logo 太少时，需要 fallback clone 或从完整列表补齐，避免露空。
- host 高度必须主动计算，否则 Wix 编辑器里容易裁切。
- 发布后 Wix Editor 可能缓存旧面板，需要通过新版本号验证。

## 开发计划

### Phase 0: Dashboard CRUD

- 优化现有 Dashboard logo 列表。
- 支持 Add Logo。
- 支持 Edit Logo。
- 支持 Delete Logo。
- 支持选择 Wix Media Manager 图片。
- 支持上传本地图片到 Wix Media。
- 保留 `Open CMS` 作为 Advanced 入口。
- 不新增 `rowNumber`。

### Phase 1: Logo Wall Slider MVP

- 新增 `Zider Logo Wall Slider` 组件。
- 复用现有 CMS logo 数据。
- 根据 `sortNumber` 自动分行。
- 支持 rows、speed、direction mode、card sizing、hover pause。
- 支持边缘渐隐、卡片 hover、灰度模式、链接。
- 支持 mobile rows 和 mobile sizing。
- 不新增数据库字段。

### Phase 2: 手动分组增强

- CMS 增加可选 `rowNumber`。
- Dashboard 展示 Row。
- 组件支持手动 Row 分组。

### Phase 3: 高级动效和样式

- 增加更多卡片风格配置。
- 增加每行独立速度或方向。
- 支持更多背景样式。
- 支持每行单独暂停或统一暂停策略。

推荐开发顺序：先做 `Phase 0`，再做 `Phase 1`。第一版不做手动 Row，让 logo 根据顺序自动分组，降低数据库和 Dashboard 复杂度。
