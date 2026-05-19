# Wix Dashboard 打开 CMS 列表方案

这份文档记录 `Zider Logo Loop` 中 Dashboard 打开站点 CMS Collection 的可复用方案。适用于 Wix CLI / Astro App 的 Dashboard 页面，需要从自定义 Dashboard 打开当前站点的 CMS 列表或某条 CMS 数据。

## 场景

Dashboard 页面中常见需求：

- 展示 App 自己的 CMS 数据列表。
- 点击 `Open CMS` 打开当前站点对应 Collection。
- 点击 `Open item` 打开某条 CMS 数据。

关键点是：CMS 管理地址必须带当前安装站点的 `siteId`。

```text
https://manage.wix.com/dashboard/{siteId}/database/data/{collectionId}
https://manage.wix.com/dashboard/{siteId}/database/data/{collectionId}/{itemId}
```

## 推荐方案

优先在 Dashboard 前端通过 `@wix/app-management` 获取当前 App Instance，再读取 `response.site.siteId`。

安装依赖：

```bash
npm install @wix/app-management
```

核心代码：

```ts
import { dashboard } from '@wix/dashboard';
import { appInstances } from '@wix/app-management';

function extractSiteId(value?: string | null) {
  if (!value) {
    return null;
  }

  if (/^[0-9a-f-]{36}$/i.test(value)) {
    return value;
  }

  const dashboardMatch = value.match(/\/dashboard\/([0-9a-f-]{36})(?:\/|$)/i);

  if (dashboardMatch?.[1]) {
    return dashboardMatch[1];
  }

  const editorMatch = value.match(/\/editor\/([0-9a-f-]{36})(?:\/|$)/i);
  return editorMatch?.[1] ?? null;
}

function findSiteIdInRecord(value: unknown, depth = 0): string | null {
  if (!value || depth > 3) {
    return null;
  }

  if (typeof value === 'string') {
    return extractSiteId(value);
  }

  if (typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const directCandidates = [
    record.siteId,
    record.site_id,
    record.metaSiteId,
    record.metasiteId,
    record.metasite_id,
  ];

  for (const candidate of directCandidates) {
    const siteId = findSiteIdInRecord(candidate, depth + 1);

    if (siteId) {
      return siteId;
    }
  }

  for (const [key, candidate] of Object.entries(record)) {
    if (!/site|instance|context/i.test(key)) {
      continue;
    }

    const siteId = findSiteIdInRecord(candidate, depth + 1);

    if (siteId) {
      return siteId;
    }
  }

  return null;
}

async function resolveSiteIdFromAppInstance(context = 'unknown') {
  try {
    console.log('[APP] resolve site id app instance:start', { context });

    const response = await appInstances.getAppInstance();
    const siteId = response.site?.siteId ?? findSiteIdInRecord(response);

    console.log('[APP] resolve site id app instance:result', {
      context,
      hasInstance: Boolean(response.instance),
      instanceId: response.instance?.instanceId ?? null,
      hasSite: Boolean(response.site),
      siteKeys: response.site ? Object.keys(response.site).slice(0, 20) : [],
      siteId,
    });

    return siteId;
  } catch (error) {
    console.error('[APP] resolve site id app instance:failed', error);
    return null;
  }
}
```

## 打开 CMS

```ts
const COLLECTION_ID = '@zider-ink/zider-loop-logo/database';

function buildCmsCollectionUrl(siteId: string, collectionId: string) {
  return `https://manage.wix.com/dashboard/${siteId}/database/data/${encodeURIComponent(collectionId)}`;
}

function buildCmsItemUrl(siteId: string, collectionId: string, itemId: string) {
  return `https://manage.wix.com/dashboard/${siteId}/database/data/${encodeURIComponent(collectionId)}/${encodeURIComponent(itemId)}`;
}

async function openCmsCollection() {
  const siteId = await resolveSiteIdFromAppInstance('openCmsCollection');

  if (!siteId) {
    dashboard.showToast({
      message: 'Unable to open CMS because the site ID could not be resolved. Please refresh the dashboard and try again.',
    });
    return;
  }

  window.open(buildCmsCollectionUrl(siteId, COLLECTION_ID), '_blank', 'noopener,noreferrer');
}

async function openCmsItem(itemId: string) {
  const siteId = await resolveSiteIdFromAppInstance('openCmsItem');

  if (!siteId) {
    dashboard.showToast({
      message: 'Unable to open CMS item because the site ID could not be resolved. Please refresh the dashboard and try again.',
    });
    return;
  }

  window.open(buildCmsItemUrl(siteId, COLLECTION_ID, itemId), '_blank', 'noopener,noreferrer');
}
```

## 建议解析顺序

在生产代码里可以做多层 fallback：

1. `dashboard.getSiteInfo()`、URL query、`document.referrer`、`window.location.href` 中直接提取。
2. `appInstances.getAppInstance()` 读取 `response.site.siteId`。
3. 如果项目已有可用后端 API，再从后端返回 `siteId`。
4. 最后再展示 toast，提示刷新 Dashboard。

`Zider Logo Loop` 当前采用：同步 URL/SDK 提取 -> App Instance -> Dashboard token fallback。

## 不推荐方案

这些方案在本项目中已经踩过坑：

- 不要依赖 `import.meta.env.BASE_API_URL`，当前 Astro Dashboard bundle 里可能是 `undefined`。
- 不要假设 `src/backend/api/*/api.ts` 一定会被当前项目模板打包成 Dashboard 可调用 API，需要先检查 build 产物。
- 不要用 `dashboard.navigate()` 打开外部 CMS URL，可能触发 `Unknown link`。
- 不要拼 `https://manage.wix.comundefined/`，必须先拿到真实 `siteId`。

## 调试日志

建议保留这几个日志点：

```ts
console.log('[APP] resolve site id:start', { context });
console.log('[APP] resolve site id app instance:start', { context });
console.log('[APP] resolve site id app instance:result', {
  context,
  hasInstance: Boolean(response.instance),
  instanceId: response.instance?.instanceId ?? null,
  hasSite: Boolean(response.site),
  siteKeys: response.site ? Object.keys(response.site).slice(0, 20) : [],
  siteId,
});
console.log('[APP] open cms collection:start', {
  collectionId,
  siteId,
});
console.log('[APP] open cms collection:url', {
  cmsUrl,
});
```

如果仍然打不开 CMS，优先检查：

- Dashboard 页面显示的版本号是否是最新发布版本。
- `appInstances.getAppInstance()` 是否成功。
- 返回值里是否存在 `site.siteId`。
- App 是否有 `MANAGE YOUR APP` 相关权限。
- 当前站点是否已经安装了这次发布的 app version。

## 发布前检查

```bash
npm run typecheck
npm run build
npx wix release --version-type minor --comment "Resolve dashboard CMS site ID through app instance"
```

发布后打开 Dashboard，确认页面版本号和 console 日志都来自最新代码。
