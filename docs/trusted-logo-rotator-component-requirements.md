# Trusted Logo Rotator 组件需求文档

## 背景

当前 `Zider Logo Loop` 插件已有基础的横向 logo 跑马灯能力。为了覆盖更高级、克制的品牌信任展示场景，需要在同一个 Wix 插件内新增一个 logo 展示样式组件。

参考交互来自 ChatGPT Pricing 页面中的品牌信任区块：一排 logo 固定在各自位置，随后按顺序向上替换为下一组 logo。它不是横向 marquee，也不是整条轨道横向滑动的 slider，而是固定槽位里的 logo rotator。

参考页面：

```text
https://chatgpt.com/zh-Hant/pricing/
```

## 命名

建议组件名称：

- 编辑器展示名：`Zider Trusted Logo Rotator`
- 组件类型名：`Trusted Logo Rotator`
- 自定义元素标签：`zider-trusted-logo-rotator`
- 代码目录：`src/extensions/site/trusted-logo-rotator/`
- 预览缩略图：新增 `public/trusted-logo-rotator-preview.svg`

说明：

- 不叫 `Slider`，因为该交互不是传统横向滑动。
- 不叫 `Carousel`，因为第一版不提供箭头、分页点或拖拽。
- 使用 `Rotator` 更准确表达“固定位置中内容轮换替换”。

## 产品定位

`Trusted Logo Rotator` 是原 `Zider Logo Loop` Wix 插件内新增的组件样式，不是新插件。

它与现有组件关系：

- `Zider Logo Loop`：连续横向滚动，适合动态品牌墙。
- `Zider Trusted Logo Rotator`：固定槽位、向上依次替换，适合 pricing、enterprise、about、homepage trust section。

目标用户可以在 Wix 编辑器中添加不同组件：

```text
Zider Logo Loop
Zider Trusted Logo Rotator
```

二者复用同一个 Dashboard 和同一个 CMS logo 数据。

## 目标

- 在当前 Wix 插件中新增一个独立 site component。
- 复用现有 logo CMS 数据和 Dashboard 管理入口。
- 实现固定槽位 logo 展示，每隔一段时间向上依次替换。
- 桌面端默认显示 5 个 logo。
- 平板端默认显示 4 个 logo。
- 手机端默认显示 3 个 logo。
- 保持高级、安静、留白充足的视觉气质。
- 不展示默认假数据，CMS 没有可用 logo 时不渲染品牌 logo。

## 非目标

- 不新建插件。
- 不新建 CMS Collection。
- 不复制参考页面的具体品牌 logo、文案或页面布局。
- 不做横向 marquee。
- 不做整组横向 slide。
- 不做箭头按钮、分页点、拖拽、swipe 手势。
- 不做多行 logo rotator。
- 不做复杂 3D、翻牌或弹跳动画。
- 不改变现有 `Zider Logo Loop` 的行为。

## 用户场景

1. 用户在 Pricing 页面展示“客户信任”品牌列表，希望动效轻微、不干扰购买决策。
2. 用户在 Enterprise 页面展示合作客户，希望比静态 logo wall 更有动态感。
3. 用户已经在 Dashboard 中维护 logo，希望同一份数据可以同时用于 Loop 和 Rotator。
4. 手机端页面空间有限，但仍希望一屏展示 3 个 logo，而不是 1 个或 2 个。
5. 用户不想配置复杂 slider，只需要选择组件并调整高度、间距、速度。

## 交互需求

### 基础展示

- 组件由多个固定 logo slot 组成。
- 每个 slot 保持固定宽度和固定高度。
- slot 数量根据设备宽度决定：
  - Desktop：5 个
  - Tablet：4 个
  - Mobile：3 个
- 所有 slot 在一行内平均分布。
- 每个 slot 内 logo 居中显示。
- logo 使用 `object-fit: contain`，不拉伸、不裁切。

### 轮换方式

轮换是“向上依次替换”，不是横向移动。

示例，Desktop 每屏 5 个：

```text
初始：
slot 1: logo 1
slot 2: logo 2
slot 3: logo 3
slot 4: logo 4
slot 5: logo 5

下一轮目标：
slot 1: logo 6
slot 2: logo 7
slot 3: logo 8
slot 4: logo 9
slot 5: logo 10
```

替换过程：

1. 等待 `interval` 时间。
2. slot 1 当前 logo 向上移动并淡出。
3. slot 1 新 logo 从下方轻微进入并淡入。
4. 延迟 `stagger` 时间。
5. slot 2 执行同样的向上替换。
6. 继续按 slot 顺序依次更新。
7. 所有 slot 替换完成后，进入下一轮等待。

推荐默认值：

```text
interval = 3200ms
transitionDuration = 520ms
stagger = 140ms
verticalOffset = 16px
```

### 循环规则

- 数据按 `sortNumber` 升序排列。
- 单次最多展示前 50 个 logo。
- 轮换按顺序向后取下一组。
- 到末尾后回到开头继续循环。
- 如果最后一组不足一屏，继续从开头补齐，保持 slot 数量稳定。

示例，Desktop 每屏 5 个，总共 12 个 logo：

```text
第 1 屏：1 2 3 4 5
第 2 屏：6 7 8 9 10
第 3 屏：11 12 1 2 3
第 4 屏：4 5 6 7 8
```

### 不足数量处理

- logo 数量为 0：不显示 logo 区域内容，但保持组件安全，不报错。
- logo 数量小于等于当前 slot 数量：静态居中展示，不启动轮换。
- logo 数量大于当前 slot 数量：启动轮换。

### 暂停与可访问性

- hover 组件时暂停轮换。
- 鼠标离开后继续轮换。
- 组件不可聚焦，不做键盘 slider 交互。
- 使用 `prefers-reduced-motion: reduce` 时禁用自动轮换，只静态展示第一组。
- 所有 logo 图片必须有 `alt`，优先使用 CMS `title`，其次 `description`，最后使用 `Logo`。

## 视觉需求

### 风格

- 白底或透明底，由页面背景决定。
- 不使用卡片、边框、阴影、分页点。
- logo 一行横向均匀分布，留白充足。
- 视觉重心是安静的品牌信任背书，而不是广告横幅。

### Logo 样式

- 默认保持 logo 原图颜色。
- 付费用户可开启 `Gray Mode`：
  - 默认灰度。
  - hover 单个 logo 时恢复彩色。
- 图片使用异步解码：

```html
decoding="async"
```

### 尺寸建议

Desktop 默认：

```text
slots = 5
logoHeight = 44px
gap = 64px
componentHeight = 96px
```

Tablet 默认：

```text
slots = 4
logoHeight = 40px
gap = 40px
componentHeight = 88px
```

Mobile 默认：

```text
slots = 3
logoHeight = 30px
gap = 20px
componentHeight = 72px
```

移动端必须保持 3 个 logo 一屏展示。极窄屏下不降为 2 个，而是让 logo 在 slot 内自适应缩小。

## 数据需求

复用现有 Collection：

```text
@zider-ink/zider-loop-logo/database
```

读取规则：

- 按 `sortNumber` 升序。
- 最多读取 50 条。
- 不使用默认品牌 fallback。
- 查询失败时保持空状态，并输出安全 console warning。
- 不阻塞页面其他内容。

字段映射：

- `image` -> logo 图片
- `title` -> alt / name
- `description` -> alt fallback
- `link` -> 可点击链接
- `sortNumber` -> 排序

## 设置面板需求

第一版复用现有设置面板的信息架构，但去掉不适用于 Rotator 的方向类配置。

### Content

- `Manage Logos`
- 提示：组件最多展示 50 个 logo，按 Sort Number 排序。

### Layout

- `Logo height`
- `Logo gap`

第一版不暴露 desktop/tablet/mobile slot 数量，使用固定策略：

```text
Desktop = 5
Tablet = 4
Mobile = 3
```

### Motion

- `Auto rotate`
- `Rotate interval`
- `Pause on hover`

第一版不暴露 `stagger` 和 `transitionDuration`，使用默认值。

### Behavior

- `Enable Clickable Links`

不需要 edge fade，因为该组件不是横向滚动，也不需要左右遮罩。

### Upgrade

- `Hidden Zider badge`
- `Gray Mode (Hover to Color)`

沿用现有付费逻辑。

### Mobile

- `Mobile Setting`
- `Mobile Logo Height`
- `Mobile Logo Spacing`

手机端 slot 数固定为 3，不提供调整项。

## 付费规则

沿用现有插件规则：

- 免费用户：
  - 必须展示 ZIDER badge。
  - 禁用灰度模式。
  - 禁用移动端专属设置。
- 付费用户：
  - 可隐藏 ZIDER badge。
  - 可开启灰度模式。
  - 可开启移动端专属设置。

如果计划状态无法识别，按免费用户处理。

## 技术方案

### 文件结构

```text
src/extensions/site/trusted-logo-rotator/
  trusted-logo-rotator.extension.ts
  trusted-logo-rotator.panel.tsx
  trusted-logo-rotator.ts
```

后续可逐步抽公共工具到：

```text
src/extensions/shared/
  logo-data.ts
  logo-media.ts
  plan.ts
```

### 渲染结构

建议结构：

```html
<div class="zider-trusted-logo-rotator" data-ready="true">
  <div class="zider-rotator-slots">
    <a class="zider-rotator-slot">
      <span class="zider-rotator-logo zider-rotator-logo-current">
        <img />
      </span>
      <span class="zider-rotator-logo zider-rotator-logo-next">
        <img />
      </span>
    </a>
  </div>
  <a class="zider-watermark">...</a>
</div>
```

每个 slot 需要两个 logo layer：

- current layer：当前可见 logo。
- next layer：下一张 logo，进入动画时使用。

轮换完成后交换 current / next 数据，避免重建整个 DOM。

### 状态模型

核心状态：

```text
logos: LogoViewItem[]
slotCount: number
visibleStartIndex: number
isPaused: boolean
isAnimating: boolean
timerId?: number
```

计算当前屏：

```text
currentItems = getWindow(logos, visibleStartIndex, slotCount)
nextItems = getWindow(logos, visibleStartIndex + slotCount, slotCount)
```

一轮动画完成后：

```text
visibleStartIndex = (visibleStartIndex + slotCount) % logos.length
```

### 响应式规则

slot 数量由组件宽度优先决定，而不是只看 window 宽度：

```text
width <= 767px: 3
width <= 1024px: 4
otherwise: 5
```

组件使用 `ResizeObserver`：

- 宽度变化时重新计算 `slotCount`。
- slotCount 变化时重置当前屏数据。
- 正在动画时避免中途重排，下一帧或下一轮再应用。

### 动画 CSS

推荐使用 CSS class 控制：

```css
.zider-rotator-logo-current {
  transform: translateY(0);
  opacity: 1;
}

.zider-rotator-slot[data-animating="true"] .zider-rotator-logo-current {
  transform: translateY(-16px);
  opacity: 0;
}

.zider-rotator-logo-next {
  transform: translateY(16px);
  opacity: 0;
}

.zider-rotator-slot[data-animating="true"] .zider-rotator-logo-next {
  transform: translateY(0);
  opacity: 1;
}
```

使用 JS 只控制每个 slot 何时加 `data-animating="true"`，动画由 CSS 完成。

## 验收标准

- Wix 编辑器中可添加 `Zider Trusted Logo Rotator`。
- 组件仍属于当前 `Zider Logo Loop` 插件。
- 读取同一个 CMS logo 数据。
- 最多展示前 50 个 logo。
- CMS 已维护 logo 时，不显示任何默认假数据。
- Desktop 一屏显示 5 个 logo。
- Tablet 一屏显示 4 个 logo。
- Mobile 一屏显示 3 个 logo。
- 每个 slot 固定位置，logo 按顺序向上依次替换。
- 替换过程有 stagger，不是全部同时替换。
- 不出现横向滑动、marquee、箭头或分页点。
- hover 后停止轮换，离开后继续。
- logo 不变形、不裁切、不撑开容器。
- logo 数量不足当前 slot 数时静态居中展示。
- `prefers-reduced-motion` 下不自动轮换。
- 链接开关生效。
- 灰度模式和隐藏 ZIDER badge 的付费规则生效。
- 移动端启用 mobile 设置后，使用 mobile logo height 和 mobile gap。
- `npm run typecheck` 通过。
- `npm run build` 通过。

## 风险与注意事项

- 该组件不要复用 marquee 的动画距离计算逻辑；它不需要克隆轨道。
- 不要等待所有图片加载完才开始渲染，否则会产生空白时间。
- 可以先渲染 slot，再等图片自然加载；图片加载后仍保持 slot 尺寸稳定。
- Rotator 的高度必须固定，否则每轮替换可能导致 Wix 页面布局跳动。
- 如果使用链接包装 slot，空链接时要渲染 `span` 而不是空 `a`。
- 编辑器环境下 `ResizeObserver` 可能频繁触发，需要防抖或只在 slotCount 变化时重渲染。
- 现有工作区已有未提交修改，实施时不要回退其他文件。

## 后续增强

- 暴露 slot 数量设置。
- 暴露 stagger 设置。
- 支持从上往下替换。
- 支持随机轮换模式。
- 支持只在进入视口后开始轮换。
- 支持标题文案，例如 `Trusted by leading teams`。
- 支持静态模式，完全不自动轮换。

## 推荐实施顺序

1. 新建 `trusted-logo-rotator` site component 目录。
2. 注册新的 custom element extension 和 preset。
3. 复用现有 CMS 查询逻辑，限制 50 条，不使用 fallback。
4. 实现固定 slot 渲染。
5. 实现向上依次替换动画。
6. 实现 responsive slotCount：5 / 4 / 3。
7. 复制并精简设置面板。
8. 加 Dashboard 文案提示，如果现有提示已覆盖 50 个限制则复用。
9. 添加预览缩略图。
10. 运行 typecheck 和 build。
11. 在桌面、平板、手机宽度下做视觉验收。
