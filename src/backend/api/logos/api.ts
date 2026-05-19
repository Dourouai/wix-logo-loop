import { auth } from '@wix/essentials';
import { items } from '@wix/data';

const COLLECTION_ID = '@zider-ink/zider-loop-logo/database';
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

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

async function resolveCurrentSiteId(req: Request) {
  try {
    const tokenInfo = await auth.getTokenInfo();

    if (tokenInfo.siteId?.trim()) {
      return tokenInfo.siteId;
    }
  } catch {
    // Fall back to request headers in environments where token introspection is unavailable.
  }

  return (
    extractSiteId(req.headers.get('referer')) ??
    extractSiteId(req.headers.get('x-wix-request-url')) ??
    extractSiteId(req.headers.get('origin'))
  );
}

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = readPositiveInteger(url.searchParams.get('page'), 1);
    const limit = Math.min(
      readPositiveInteger(url.searchParams.get('limit'), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const siteId = await resolveCurrentSiteId(req);
    const result = await items
      .query(COLLECTION_ID)
      .ascending('sortNumber')
      .skip((page - 1) * limit)
      .limit(limit)
      .find({ consistentRead: true, returnTotalCount: true });

    return Response.json({
      collectionId: COLLECTION_ID,
      siteId,
      items: result.items,
      total: result.totalCount ?? result.items.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logo data could not be loaded.';

    return Response.json(
      {
        message,
      },
      { status: 500 },
    );
  }
}
