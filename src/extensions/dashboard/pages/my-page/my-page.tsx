import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FC } from 'react';
import { dashboard } from '@wix/dashboard';
import { items } from '@wix/data';
import { Page, WixDesignSystemProvider } from '@wix/design-system';
import '@wix/design-system/styles.global.css';

const COLLECTION_ID = '@zider-ink/zider-loop-logo/database';
const CMS_PAGE_ID = '6513755b-2a3b-45b9-8172-99c16e00dfde';
const HELP_URL = 'https://www.youtube.com/watch?v=GdubbsSq_yA';
const PAGE_SIZE = 10;

type LogoItem = {
  _id?: string;
  image?: unknown;
  title?: string;
  description?: string;
  sortNumber?: number;
  link?: unknown;
};

type LogoRow = {
  id: string;
  cmsItemId: string;
  imageSrc: string;
  name: string;
  sortNumber: number | null;
  link: string;
};

type DashboardDestination = {
  pageId: string;
  relativeUrl?: string;
};

const styles: Record<string, CSSProperties> = {
  pageShell: {
    minHeight: '100vh',
    background: '#eef2f6',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 1040,
    margin: '0 auto',
    padding: '32px 16px 48px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 24,
    marginBottom: 28,
  },
  title: {
    color: '#050b2d',
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1.2,
    margin: 0,
  },
  subtitle: {
    color: '#4f5d73',
    fontSize: 16,
    lineHeight: 1.4,
    margin: '4px 0 0',
  },
  helpButton: {
    minWidth: 142,
    height: 38,
    border: '1px solid #c7dcff',
    borderRadius: 19,
    background: '#fff',
    color: '#1264ff',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 500,
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 24,
    boxShadow: '0 1px 2px rgba(22, 45, 61, 0.08)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#10172f',
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },
  cardCopy: {
    color: '#2f3b58',
    fontSize: 16,
    lineHeight: 1.45,
    margin: '4px 0 0',
  },
  primaryButton: {
    minWidth: 150,
    height: 38,
    border: 0,
    borderRadius: 19,
    background: '#3d4bd8',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
  },
  tableWrap: {
    border: '1px solid #9fc3ff',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  tableHead: {
    background: '#e8f1ff',
  },
  headerCell: {
    color: '#0f1734',
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'left',
    padding: '13px 20px',
  },
  tableCell: {
    borderTop: '1px solid #e1e5ea',
    color: '#10172f',
    fontSize: 16,
    padding: '16px 20px',
    verticalAlign: 'middle',
  },
  numberCell: {
    color: '#2f3b58',
    fontVariantNumeric: 'tabular-nums',
  },
  logoCell: {
    height: 54,
    display: 'flex',
    alignItems: 'center',
  },
  logoImage: {
    display: 'block',
    maxWidth: 170,
    maxHeight: 54,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    width: 96,
    height: 40,
    borderRadius: 6,
    background: '#f3f6fa',
    color: '#7f8ba0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
  },
  link: {
    color: '#2f3b58',
    textDecoration: 'underline',
    maxWidth: 260,
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mutedText: {
    color: '#7f8ba0',
  },
  stateRow: {
    borderTop: '1px solid #e1e5ea',
    color: '#4f5d73',
    fontSize: 15,
    padding: '36px 28px',
    textAlign: 'center',
  },
  errorRow: {
    borderTop: '1px solid #e1e5ea',
    color: '#c62828',
    fontSize: 15,
    padding: '36px 28px',
    textAlign: 'center',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 18,
  },
  paginationText: {
    color: '#4f5d73',
    fontSize: 14,
  },
  paginationActions: {
    display: 'flex',
    gap: 8,
  },
  pageButton: {
    minWidth: 92,
    height: 34,
    border: '1px solid #c7dcff',
    borderRadius: 17,
    background: '#fff',
    color: '#1264ff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  itemButton: {
    minWidth: 92,
    height: 32,
    border: '1px solid #c7dcff',
    borderRadius: 16,
    background: '#fff',
    color: '#1264ff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  disabledButton: {
    cursor: 'not-allowed',
    opacity: 0.45,
  },
};

const DashboardPage: FC = () => {
  const [rows, setRows] = useState<LogoRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  const loadPage = useCallback(async (nextPage: number) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await items
        .query(COLLECTION_ID)
        .ascending('sortNumber')
        .skip((nextPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .find({ consistentRead: true, returnTotalCount: true });

      const nextTotalCount = result.totalCount ?? result.items.length;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / PAGE_SIZE));

      if (nextPage > nextTotalPages && nextTotalCount > 0) {
        setPage(nextTotalPages);
        return;
      }

      setRows(result.items.map((item) => mapLogoRow(item as LogoItem)));
      setTotalCount(nextTotalCount);
    } catch (error) {
      console.warn('[ZIDER LOGO LOOP] Failed to load logo data.', error);
      setRows([]);
      setTotalCount(0);
      setErrorMessage('Logo data could not be loaded. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openCmsCollection = useCallback(async () => {
    await openDashboardDestination(
      buildCmsCollectionDestination(COLLECTION_ID),
      'Unable to open CMS. Please refresh the dashboard and try again.',
    );
  }, []);

  const openCmsItem = useCallback(async (itemId: string) => {
    if (!itemId) {
      dashboard.showToast({
        message: 'This row is missing its CMS item ID. Please refresh the dashboard and try again.',
      });
      return;
    }

    await openDashboardDestination(
      buildCmsItemDestination(COLLECTION_ID, itemId),
      'Unable to open CMS item. Please refresh the dashboard and try again.',
    );
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const canGoPrev = page > 1 && !isLoading;
  const canGoNext = page < totalPages && !isLoading;

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <div style={styles.pageShell}>
        <Page>
          <Page.Content>
            <main style={styles.contentWrap}>
              <header style={styles.topBar}>
                <div>
                  <h1 style={styles.title}>Zider Logo Loop</h1>
                  <p style={styles.subtitle}>ZIDER.ink</p>
                </div>
                <button
                  type="button"
                  style={styles.helpButton}
                  onClick={() => window.open(HELP_URL, '_blank', 'noopener,noreferrer')}
                >
                  Help
                </button>
              </header>

              <section style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h2 style={styles.cardTitle}>Logo List</h2>
                    <p style={styles.cardCopy}>
                      Preview the current CMS logo records. Edit logo content from your site CMS.
                    </p>
                  </div>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={openCmsCollection}
                  >
                    Open CMS
                  </button>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead style={styles.tableHead}>
                      <tr>
                        <th style={{ ...styles.headerCell, width: 92 }}>Sort No.</th>
                        <th style={{ ...styles.headerCell, width: 190 }}>Name</th>
                        <th style={{ ...styles.headerCell, width: 230 }}>Logo</th>
                        <th style={styles.headerCell}>Link</th>
                        <th style={{ ...styles.headerCell, width: 140 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td style={styles.stateRow} colSpan={5}>
                            Loading logo data...
                          </td>
                        </tr>
                      ) : errorMessage ? (
                        <tr>
                          <td style={styles.errorRow} colSpan={5}>
                            {errorMessage}
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td style={styles.stateRow} colSpan={5}>
                            No logo records found. Add logos in the CMS collection first.
                          </td>
                        </tr>
                      ) : (
                        rows.map((item) => (
                          <tr key={item.id}>
                            <td style={{ ...styles.tableCell, ...styles.numberCell }}>
                              {item.sortNumber ?? <span style={styles.mutedText}>-</span>}
                            </td>
                            <td style={styles.tableCell}>{item.name}</td>
                            <td style={styles.tableCell}>
                              <div style={styles.logoCell}>
                                {item.imageSrc ? (
                                  <img style={styles.logoImage} src={item.imageSrc} alt={item.name} />
                                ) : (
                                  <span style={styles.logoPlaceholder}>No image</span>
                                )}
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              {item.link ? (
                                <a style={styles.link} href={item.link} target="_blank" rel="noreferrer">
                                  {item.link}
                                </a>
                              ) : (
                                <span style={styles.mutedText}>-</span>
                              )}
                            </td>
                            <td style={styles.tableCell}>
                              <button
                                type="button"
                                style={{ ...styles.itemButton, ...(!item.cmsItemId ? styles.disabledButton : undefined) }}
                                disabled={!item.cmsItemId}
                                onClick={() => openCmsItem(item.cmsItemId)}
                              >
                                Open item
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={styles.pagination}>
                  <span style={styles.paginationText}>
                    {totalCount} records · Page {page} of {totalPages}
                  </span>
                  <div style={styles.paginationActions}>
                    <button
                      type="button"
                      style={{ ...styles.pageButton, ...(!canGoPrev ? styles.disabledButton : undefined) }}
                      disabled={!canGoPrev}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.pageButton, ...(!canGoNext ? styles.disabledButton : undefined) }}
                      disabled={!canGoNext}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>
            </main>
          </Page.Content>
        </Page>
      </div>
    </WixDesignSystemProvider>
  );
};

export default DashboardPage;

function mapLogoRow(item: LogoItem): LogoRow {
  return {
    id: item._id || `${item.title || item.description || 'logo'}-${item.sortNumber || 0}`,
    cmsItemId: item._id || '',
    imageSrc: resolveImageUrl(item.image),
    name: item.title || item.description || 'Untitled logo',
    sortNumber: typeof item.sortNumber === 'number' ? item.sortNumber : null,
    link: resolveLinkUrl(item.link),
  };
}

function resolveLinkUrl(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const rawUrl = record.url || record.href || record.link || record.value;

    return typeof rawUrl === 'string' ? rawUrl : '';
  }

  return '';
}

function buildCmsCollectionDestination(collectionId: string): DashboardDestination {
  return {
    pageId: CMS_PAGE_ID,
    relativeUrl: `/data/${encodeURIComponent(collectionId)}`,
  };
}

function buildCmsItemDestination(collectionId: string, itemId: string): DashboardDestination {
  return {
    pageId: CMS_PAGE_ID,
    relativeUrl: `/data/${encodeURIComponent(collectionId)}/${encodeURIComponent(itemId)}`,
  };
}

async function openDashboardDestination(destination: DashboardDestination, errorMessage: string) {
  try {
    const url = await dashboard.getPageUrl(destination);
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.warn('[ZIDER LOGO LOOP] Failed to open dashboard destination.', error);

    try {
      dashboard.navigate(destination, {
        displayMode: 'main',
        history: 'push',
      });
    } catch (navigateError) {
      console.warn('[ZIDER LOGO LOOP] Failed to navigate dashboard destination.', navigateError);
      dashboard.showToast({
        message: errorMessage,
      });
    }
  }
}

function resolveImageUrl(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return normalizeWixMediaUrl(value);
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const rawUrl = record.url || record.src || record.fileUrl || record.imageUrl;

    if (typeof rawUrl === 'string') {
      return normalizeWixMediaUrl(rawUrl);
    }
  }

  return '';
}

function normalizeWixMediaUrl(url: string) {
  if (url.startsWith('http') || url.startsWith('//') || url.startsWith('data:image')) {
    return url;
  }

  if (url.startsWith('wix:image://')) {
    const match = url.match(/wix:image:\/\/v1\/([^/#?]+)/);
    return match?.[1] ? `https://static.wixstatic.com/media/${match[1]}` : url;
  }

  if (url.startsWith('wix:vector://') || url.startsWith('wix:shape://')) {
    const match = url.match(/wix:(?:vector|shape):\/\/v1\/([^/#?]+)/);
    const id = match?.[1]?.replace(/\.svg$/i, '');
    return id ? `https://static.wixstatic.com/shapes/${id}.svg` : url;
  }

  return url;
}
