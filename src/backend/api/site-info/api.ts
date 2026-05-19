import { auth } from '@wix/essentials';

const COLLECTION_ID = '@zider-ink/zider-loop-logo/database';

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
      return {
        siteId: tokenInfo.siteId,
        source: 'auth.getTokenInfo.siteId',
      };
    }
  } catch {
    // Fall back to request headers in environments where token introspection is unavailable.
  }

  const headerCandidates = [
    { source: 'referer', value: req.headers.get('referer') },
    { source: 'x-wix-request-url', value: req.headers.get('x-wix-request-url') },
    { source: 'origin', value: req.headers.get('origin') },
  ];

  for (const candidate of headerCandidates) {
    const siteId = extractSiteId(candidate.value);

    if (siteId) {
      return {
        siteId,
        source: candidate.source,
      };
    }
  }

  return {
    siteId: null,
    source: 'unresolved',
  };
}

export async function GET(req: Request) {
  try {
    const resolved = await resolveCurrentSiteId(req);

    return Response.json({
      collectionId: COLLECTION_ID,
      siteId: resolved.siteId,
      source: resolved.source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Site info could not be loaded.';

    return Response.json(
      {
        message,
      },
      { status: 500 },
    );
  }
}
