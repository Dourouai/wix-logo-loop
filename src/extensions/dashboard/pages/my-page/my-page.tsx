import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FC,
  type FormEvent,
} from 'react';
import { dashboard } from '@wix/dashboard';
import { items } from '@wix/data';
import { files } from '@wix/media';
import { appInstances } from '@wix/app-management';
import { Page, WixDesignSystemProvider } from '@wix/design-system';
import { getLogoSortNumber, hasLogoSortNumber, sortLogoItems } from '../../../shared/logo-order';
import '@wix/design-system/styles.global.css';

const COLLECTION_ID = '@zider-ink/zider-loop-logo/database';
const HELP_URL = 'https://www.youtube.com/watch?v=GdubbsSq_yA';
const IMAGE_COMPRESSOR_URL = 'https://squoosh.app/';
const DASHBOARD_VERSION = '7.1.0';
const PAGE_SIZE = 10;

type LogoItem = {
  _id?: string;
  image?: unknown;
  title?: string;
  description?: string;
  sortNumber?: unknown;
  link?: unknown;
  [key: string]: unknown;
};

type LogoRow = {
  id: string;
  cmsItemId: string;
  image: unknown;
  imageSrc: string;
  name: string;
  title: string;
  description: string;
  sortNumber: number | null;
  link: string;
  rawItem: LogoItem;
};

type LogoFormState = {
  id: string;
  title: string;
  description: string;
  sortNumber: string;
  link: string;
  image: unknown;
  imagePreview: string;
  imageLabel: string;
};

type LogoEditorState = {
  mode: 'add' | 'edit';
  row?: LogoRow;
  form: LogoFormState;
};

type MediaFileDescriptor = Record<string, unknown>;

const styles: Record<string, CSSProperties> = {
  pageShell: {
    minHeight: '100vh',
    height: '100%',
    background: '#eef2f6',
    position: 'relative',
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
    alignItems: 'flex-start',
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
  displayLimitNote: {
    color: '#7f8ba0',
    fontSize: 13,
    lineHeight: 1.4,
    margin: '8px 0 0',
  },
  noteLink: {
    color: '#1264ff',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
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
  secondaryButton: {
    minWidth: 128,
    height: 38,
    border: '1px solid #c7dcff',
    borderRadius: 19,
    background: '#fff',
    color: '#1264ff',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'nowrap',
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
    minWidth: 64,
    height: 32,
    border: '1px solid #c7dcff',
    borderRadius: 16,
    background: '#fff',
    color: '#1264ff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  dangerButton: {
    borderColor: '#ffd2d2',
    color: '#c62828',
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    width: '100vw',
    minHeight: '100vh',
    height: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'rgba(5, 11, 45, 0.42)',
    overflowY: 'auto',
  },
  modal: {
    width: '100%',
    maxWidth: 620,
    maxHeight: 'calc(100vh - 48px)',
    overflow: 'auto',
    borderRadius: 8,
    background: '#fff',
    boxShadow: '0 18px 48px rgba(5, 11, 45, 0.24)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '22px 24px 16px',
    borderBottom: '1px solid #e1e5ea',
  },
  modalTitle: {
    margin: 0,
    color: '#10172f',
    fontSize: 20,
    lineHeight: 1.25,
    fontWeight: 700,
  },
  modalCopy: {
    margin: '4px 0 0',
    color: '#4f5d73',
    fontSize: 14,
    lineHeight: 1.45,
  },
  closeButton: {
    width: 32,
    height: 32,
    border: '1px solid #d8e1ea',
    borderRadius: 16,
    background: '#fff',
    color: '#2f3b58',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
  },
  form: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    padding: 24,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldFull: {
    gridColumn: '1 / -1',
  },
  label: {
    color: '#2f3b58',
    fontSize: 13,
    fontWeight: 600,
  },
  input: {
    width: '100%',
    minHeight: 38,
    border: '1px solid #c9d4e2',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#10172f',
    fontSize: 15,
    boxSizing: 'border-box',
  },
  textarea: {
    minHeight: 72,
    resize: 'vertical',
  },
  imagePicker: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: 14,
    alignItems: 'center',
    border: '1px solid #e1e5ea',
    borderRadius: 8,
    padding: 12,
    background: '#f7f9fc',
  },
  imagePreview: {
    width: 160,
    height: 96,
    borderRadius: 6,
    background: '#fff',
    border: '1px solid #e1e5ea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePreviewLogo: {
    display: 'block',
    maxWidth: 130,
    maxHeight: 66,
    objectFit: 'contain',
  },
  pickerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  formHelp: {
    color: '#7f8ba0',
    fontSize: 13,
    lineHeight: 1.4,
    margin: 0,
  },
  formAlert: {
    border: '1px solid #ffd2d2',
    borderRadius: 6,
    background: '#fff4f4',
    color: '#a81919',
    fontSize: 13,
    lineHeight: 1.4,
    margin: '8px 0 0',
    padding: '8px 10px',
  },
  modalActions: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 4,
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
  const [siteId, setSiteId] = useState(() => resolveSiteId());
  const [editorState, setEditorState] = useState<LogoEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LogoRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  const loadPage = useCallback(async (nextPage: number) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      debugLog('load logo data:start', {
        collectionId: COLLECTION_ID,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      const result = await queryOrderedLogoPage(nextPage, PAGE_SIZE);
      const nextTotalCount = result.totalCount;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / PAGE_SIZE));

      debugLog('load logo data:success', {
        collectionId: COLLECTION_ID,
        receivedItems: result.items.length,
        numberedItems: result.numberedCount,
        emptySortNumberItems: result.emptyCount,
        totalCount: nextTotalCount,
        page: nextPage,
        totalPages: nextTotalPages,
      });

      if (nextPage > nextTotalPages && nextTotalCount > 0) {
        debugLog('load logo data:page overflow, redirecting page', {
          requestedPage: nextPage,
          nextTotalPages,
        });
        setPage(nextTotalPages);
        return;
      }

      setRows(result.items.map((item) => mapLogoRow(item as LogoItem)));
      setTotalCount(nextTotalCount);
      setSiteId((currentSiteId) => currentSiteId ?? resolveSiteId('loadPage'));
      void resolveSiteIdAsync('loadPage:async').then((resolvedSiteId) => {
        if (resolvedSiteId) {
          setSiteId((currentSiteId) => currentSiteId ?? resolvedSiteId);
        }
      });
    } catch (error) {
      debugError('load logo data:failed', error);
      setRows([]);
      setTotalCount(0);
      setErrorMessage('Logo data could not be loaded. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (siteId) {
      return;
    }

    const nextSiteId = resolveSiteId('effect:initial');

    if (nextSiteId) {
      setSiteId(nextSiteId);
      return;
    }

    let isCancelled = false;

    void resolveSiteIdAsync('effect:async').then((resolvedSiteId) => {
      if (!isCancelled && resolvedSiteId) {
        setSiteId(resolvedSiteId);
      }
    });

    const timeoutId = window.setTimeout(() => {
      const resolvedSiteId = resolveSiteId('effect:delayed');

      if (resolvedSiteId) {
        setSiteId(resolvedSiteId);
      }
    }, 400);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [siteId]);

  const openCmsCollection = useCallback(async () => {
    const resolvedSiteId = siteId ?? await resolveSiteIdAsync('openCmsCollection');

    debugLog('open cms collection:start', {
      collectionId: COLLECTION_ID,
      cachedSiteId: siteId,
      resolvedSiteId,
    });

    if (resolvedSiteId) {
      setSiteId(resolvedSiteId);
      const cmsUrl = buildCmsCollectionUrl(resolvedSiteId, COLLECTION_ID);

      debugLog('open cms collection:url', {
        cmsUrl,
      });

      window.open(cmsUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    debugLog('open cms collection:failed, missing site id', {
      collectionId: COLLECTION_ID,
    });

    dashboard.showToast({
      message: 'Unable to open CMS because the site ID could not be resolved. Check console logs and refresh the dashboard.',
    });
  }, [siteId]);

  const openCmsItem = useCallback(async (itemId: string) => {
    if (!itemId) {
      dashboard.showToast({
        message: 'This row is missing its CMS item ID. Please refresh the dashboard and try again.',
      });
      return;
    }

    const resolvedSiteId = siteId ?? await resolveSiteIdAsync('openCmsItem');

    debugLog('open cms item:start', {
      collectionId: COLLECTION_ID,
      itemId,
      cachedSiteId: siteId,
      resolvedSiteId,
    });

    if (resolvedSiteId) {
      setSiteId(resolvedSiteId);
      const cmsUrl = buildCmsItemUrl(resolvedSiteId, COLLECTION_ID, itemId);

      debugLog('open cms item:url', {
        cmsUrl,
      });

      window.open(cmsUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    debugLog('open cms item:failed, missing site id', {
      collectionId: COLLECTION_ID,
      itemId,
    });

    dashboard.showToast({
      message: 'Unable to open CMS item because the site ID could not be resolved. Check console logs and refresh the dashboard.',
    });
  }, [siteId]);

  const openAddLogo = useCallback(() => {
    setUploadError('');
    setEditorState({
      mode: 'add',
      form: createEmptyLogoForm(totalCount + 1),
    });
  }, [totalCount]);

  const openEditLogo = useCallback((row: LogoRow) => {
    setUploadError('');
    setEditorState({
      mode: 'edit',
      row,
      form: createLogoFormFromRow(row),
    });
  }, []);

  const closeEditor = useCallback(() => {
    if (isSaving || isUploading) {
      return;
    }

    setEditorState(null);
    setUploadError('');
  }, [isSaving, isUploading]);

  const updateEditorForm = useCallback((patch: Partial<LogoFormState>) => {
    setEditorState((current) => current ? {
      ...current,
      form: {
        ...current.form,
        ...patch,
      },
    } : current);
  }, []);

  const chooseMedia = useCallback(async () => {
    const openMediaManager = dashboard.openMediaManager;

    if (!openMediaManager) {
      dashboard.showToast({
        message: 'Media Manager is not available in this Dashboard context. Try again from the Wix dashboard.',
      });
      return;
    }

    try {
      setUploadError('');
      const result = await openMediaManager({
        category: 'image',
        multiSelect: false,
      });
      const selectedItem = result?.items?.[0];

      if (!selectedItem) {
        return;
      }

      const image = resolveMediaManagerImage(selectedItem);

      if (!image.value) {
        dashboard.showToast({
          message: 'The selected media item is missing an image URL. Please choose another image.',
        });
        return;
      }

      updateEditorForm({
        image: image.value,
        imagePreview: resolveImageUrl(image.value),
        imageLabel: image.label,
      });
      setUploadError('');
    } catch (error) {
      debugError('choose media:failed', error);
      dashboard.showToast({
        message: 'Media Manager could not be opened. Please try again.',
      });
    }
  }, [updateEditorForm]);

  const uploadImage = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      dashboard.showToast({
        message: 'Please upload an image file.',
      });
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const image = await uploadImageToMediaManager(file);

      updateEditorForm({
        image: image.value,
        imagePreview: resolveImageUrl(image.value),
        imageLabel: image.label,
      });
      dashboard.showToast({
        message: 'Image uploaded. It may take a few seconds for Wix Media Manager to finish processing it.',
      });
    } catch (error) {
      debugError('upload image:failed', error);
      setUploadError('Direct upload failed. Opening Wix Media Manager so you can upload or choose the logo there.');
      await chooseMedia();
    } finally {
      setIsUploading(false);
    }
  }, [chooseMedia, updateEditorForm]);

  const saveLogo = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editorState) {
      return;
    }

    const form = editorState.form;
    const title = form.title.trim();
    const description = form.description.trim();
    const link = form.link.trim();
    const parsedSortNumber = parseSortNumberInput(form.sortNumber);

    if (!title) {
      dashboard.showToast({
        message: 'Logo name is required.',
      });
      return;
    }

    if (!form.image) {
      dashboard.showToast({
        message: 'Please choose or upload a logo image.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const basePayload = copyEditableLogoItem(editorState.row?.rawItem);
      const normalizedLink = link || null;
      const payload: LogoItem = {
        ...basePayload,
        title,
        description,
        link: normalizedLink,
        image: form.image,
        sortNumber: parsedSortNumber,
      };

      if (editorState.mode === 'edit' && editorState.row?.cmsItemId) {
        await items.update(COLLECTION_ID, {
          ...payload,
          _id: editorState.row.cmsItemId,
        });
      } else {
        await items.insert(COLLECTION_ID, payload);
      }

      dashboard.showToast({
        message: editorState.mode === 'edit' ? 'Logo updated.' : 'Logo added.',
      });
      setEditorState(null);
      await loadPage(page);
    } catch (error) {
      debugError('save logo:failed', error);
      dashboard.showToast({
        message: 'Logo could not be saved. Please check the fields and try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [editorState, loadPage, page]);

  const confirmDeleteLogo = useCallback(async () => {
    if (!deleteTarget?.cmsItemId) {
      return;
    }

    setIsDeleting(true);

    try {
      await items.remove(COLLECTION_ID, deleteTarget.cmsItemId);
      dashboard.showToast({
        message: 'Logo deleted.',
      });
      setDeleteTarget(null);
      await loadPage(page);
    } catch (error) {
      debugError('delete logo:failed', error);
      dashboard.showToast({
        message: 'Logo could not be deleted. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, loadPage, page]);

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
                  <p style={styles.subtitle}>ZIDER.ink · V{DASHBOARD_VERSION}</p>
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
                      Add, edit, delete, and reorder logos from this dashboard.
                    </p>
                    <p style={styles.displayLimitNote}>
                      Sort order: lower Sort Number values appear first. Blank values appear after numbered logos.
                    </p>
                    <p style={styles.displayLimitNote}>
                      Site components display up to the first 50 logos from this list.
                    </p>
                    <p style={styles.displayLimitNote}>
                      Image tip: keep each logo in its original proportion, avoid oversized files, and compress images with{' '}
                      <a
                        href={IMAGE_COMPRESSOR_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.noteLink}
                      >
                        Squoosh
                      </a>
                      {' '}before uploading.
                    </p>
                  </div>
                  <div style={styles.headerActions}>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={openAddLogo}
                    >
                      Add Logo
                    </button>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={openCmsCollection}
                    >
                      Advanced CMS
                    </button>
                  </div>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead style={styles.tableHead}>
                      <tr>
                        <th style={{ ...styles.headerCell, width: 92 }}>Sort No.</th>
                        <th style={{ ...styles.headerCell, width: 190 }}>Name</th>
                        <th style={{ ...styles.headerCell, width: 230 }}>Logo</th>
                        <th style={styles.headerCell}>Link</th>
                        <th style={{ ...styles.headerCell, width: 220 }}>Action</th>
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
                            No logo records found. Add your first logo from this dashboard.
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
                              <div style={styles.actionGroup}>
                                <button
                                  type="button"
                                  style={{ ...styles.itemButton, ...(!item.cmsItemId ? styles.disabledButton : undefined) }}
                                  disabled={!item.cmsItemId}
                                  onClick={() => openEditLogo(item)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  style={{ ...styles.itemButton, ...styles.dangerButton, ...(!item.cmsItemId ? styles.disabledButton : undefined) }}
                                  disabled={!item.cmsItemId}
                                  onClick={() => setDeleteTarget(item)}
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  style={{ ...styles.itemButton, ...(!item.cmsItemId ? styles.disabledButton : undefined) }}
                                  disabled={!item.cmsItemId}
                                  onClick={() => openCmsItem(item.cmsItemId)}
                                >
                                  CMS
                                </button>
                              </div>
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

              {editorState ? (
                <div style={styles.modalBackdrop} role="presentation">
                  <section style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="logo-editor-title">
                    <header style={styles.modalHeader}>
                      <div>
                        <h2 id="logo-editor-title" style={styles.modalTitle}>
                          {editorState.mode === 'edit' ? 'Edit logo' : 'Add logo'}
                        </h2>
                        <p style={styles.modalCopy}>
                          Choose or upload logos with Wix Media Manager. Local upload is kept as a fallback.
                        </p>
                      </div>
                      <button
                        type="button"
                        style={styles.closeButton}
                        onClick={closeEditor}
                        aria-label="Close"
                        disabled={isSaving || isUploading}
                      >
                        x
                      </button>
                    </header>

                    <form style={styles.form} onSubmit={saveLogo}>
                      <label style={styles.field}>
                        <span style={styles.label}>Logo name</span>
                        <input
                          type="text"
                          value={editorState.form.title}
                          onChange={(event) => updateEditorForm({ title: event.target.value })}
                          style={styles.input}
                          placeholder="Company name"
                          required
                        />
                      </label>

                      <label style={styles.field}>
                        <span style={styles.label}>Sort Number</span>
                        <input
                          type="number"
                          value={editorState.form.sortNumber}
                          onChange={(event) => updateEditorForm({ sortNumber: event.target.value })}
                          style={styles.input}
                          min={0}
                          step={1}
                          placeholder="1"
                        />
                      </label>

                      <label style={{ ...styles.field, ...styles.fieldFull }}>
                        <span style={styles.label}>Link</span>
                        <input
                          type="url"
                          value={editorState.form.link}
                          onChange={(event) => updateEditorForm({ link: event.target.value })}
                          style={styles.input}
                          placeholder="https://example.com"
                        />
                      </label>

                      <label style={{ ...styles.field, ...styles.fieldFull }}>
                        <span style={styles.label}>Description</span>
                        <textarea
                          value={editorState.form.description}
                          onChange={(event) => updateEditorForm({ description: event.target.value })}
                          style={{ ...styles.input, ...styles.textarea }}
                          placeholder="Optional alt text or internal note"
                        />
                      </label>

                      <div style={{ ...styles.field, ...styles.fieldFull }}>
                        <span style={styles.label}>Logo image</span>
                        <div style={styles.imagePicker}>
                          <div style={styles.imagePreview}>
                            {editorState.form.imagePreview ? (
                              <img
                                src={editorState.form.imagePreview}
                                alt={editorState.form.title || 'Logo preview'}
                                style={styles.imagePreviewLogo}
                              />
                            ) : (
                              <span style={styles.logoPlaceholder}>No image</span>
                            )}
                          </div>
                          <div>
                            <div style={styles.pickerActions}>
                              <button type="button" style={styles.secondaryButton} onClick={chooseMedia}>
                                Media Manager
                              </button>
                              <button
                                type="button"
                                style={{ ...styles.secondaryButton, ...(isUploading ? styles.disabledButton : undefined) }}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                              >
                                {isUploading ? 'Uploading...' : 'Local Upload'}
                              </button>
                              <button
                                type="button"
                                style={styles.itemButton}
                                onClick={() => {
                                  setUploadError('');
                                  updateEditorForm({ image: '', imagePreview: '', imageLabel: '' });
                                }}
                              >
                                Clear
                              </button>
                            </div>
                            <p style={styles.formHelp}>
                              Recommended: use Media Manager to upload or select SVG, PNG, JPG, or WebP logos.
                            </p>
                            {uploadError ? (
                              <p role="alert" style={styles.formAlert}>
                                {uploadError}
                              </p>
                            ) : null}
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={uploadImage}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={styles.modalActions}>
                        <button type="button" style={styles.secondaryButton} onClick={closeEditor} disabled={isSaving || isUploading}>
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{ ...styles.primaryButton, ...(isSaving || isUploading ? styles.disabledButton : undefined) }}
                          disabled={isSaving || isUploading}
                        >
                          {isSaving ? 'Saving...' : 'Save Logo'}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              ) : null}

              {deleteTarget ? (
                <div style={styles.modalBackdrop} role="presentation">
                  <section style={{ ...styles.modal, maxWidth: 420 }} role="dialog" aria-modal="true" aria-labelledby="delete-logo-title">
                    <header style={styles.modalHeader}>
                      <div>
                        <h2 id="delete-logo-title" style={styles.modalTitle}>Delete logo?</h2>
                        <p style={styles.modalCopy}>
                          This removes “{deleteTarget.name}” from the logo collection.
                        </p>
                      </div>
                      <button
                        type="button"
                        style={styles.closeButton}
                        onClick={() => setDeleteTarget(null)}
                        aria-label="Close"
                        disabled={isDeleting}
                      >
                        x
                      </button>
                    </header>
                    <div style={{ ...styles.form, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => setDeleteTarget(null)}
                        disabled={isDeleting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        style={{ ...styles.primaryButton, background: '#c62828', ...(isDeleting ? styles.disabledButton : undefined) }}
                        onClick={confirmDeleteLogo}
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </section>
                </div>
              ) : null}
            </main>
          </Page.Content>
        </Page>
      </div>
    </WixDesignSystemProvider>
  );
};

export default DashboardPage;

async function queryOrderedLogoPage(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  const [numberedCountResult, emptyCountResult] = await Promise.all([
    items
      .query(COLLECTION_ID)
      .isNotEmpty('sortNumber')
      .limit(1)
      .find({ consistentRead: true, returnTotalCount: true }),
    items
      .query(COLLECTION_ID)
      .isEmpty('sortNumber')
      .limit(1)
      .find({ consistentRead: true, returnTotalCount: true }),
  ]);
  const numberedCount = numberedCountResult.totalCount ?? numberedCountResult.items.length;
  const emptyCount = emptyCountResult.totalCount ?? emptyCountResult.items.length;
  const pageItems: LogoItem[] = [];

  if (offset < numberedCount) {
    const numberedLimit = Math.min(pageSize, numberedCount - offset);
    const numberedPage = await items
      .query(COLLECTION_ID)
      .isNotEmpty('sortNumber')
      .ascending('sortNumber')
      .skip(offset)
      .limit(numberedLimit)
      .find({ consistentRead: true });

    pageItems.push(...sortLogoItems((numberedPage.items as LogoItem[]).filter(hasLogoSortNumber)));
  }

  if (pageItems.length < pageSize) {
    const emptyOffset = Math.max(0, offset - numberedCount);
    const emptyPage = await items
      .query(COLLECTION_ID)
      .isEmpty('sortNumber')
      .skip(emptyOffset)
      .limit(pageSize - pageItems.length)
      .find({ consistentRead: true });

    pageItems.push(...(emptyPage.items as LogoItem[]));
  }

  return {
    items: pageItems,
    totalCount: numberedCount + emptyCount,
    numberedCount,
    emptyCount,
  };
}

function mapLogoRow(item: LogoItem): LogoRow {
  const sortNumber = getLogoSortNumber(item.sortNumber);
  const title = typeof item.title === 'string' ? item.title : '';
  const description = typeof item.description === 'string' ? item.description : '';

  return {
    id: item._id || `${item.title || item.description || 'logo'}-${item.sortNumber || 0}`,
    cmsItemId: item._id || '',
    image: item.image,
    imageSrc: resolveImageUrl(item.image),
    name: title || description || 'Untitled logo',
    title,
    description,
    sortNumber,
    link: resolveLinkUrl(item.link),
    rawItem: item,
  };
}

function createEmptyLogoForm(nextSortNumber: number): LogoFormState {
  return {
    id: '',
    title: '',
    description: '',
    sortNumber: String(Math.max(nextSortNumber, 1)),
    link: '',
    image: '',
    imagePreview: '',
    imageLabel: '',
  };
}

function createLogoFormFromRow(row: LogoRow): LogoFormState {
  return {
    id: row.cmsItemId,
    title: row.title,
    description: row.description,
    sortNumber: row.sortNumber === null ? '' : String(row.sortNumber),
    link: row.link,
    image: row.image,
    imagePreview: row.imageSrc,
    imageLabel: getImageLabel(row.image),
  };
}

function parseSortNumberInput(value: string): number | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const sortNumber = Number.parseFloat(trimmedValue);

  return Number.isFinite(sortNumber) ? sortNumber : null;
}

function copyEditableLogoItem(item?: LogoItem): LogoItem {
  if (!item) {
    return {};
  }

  return Object.entries(item).reduce<LogoItem>((result, [key, value]) => {
    if (key === '_id' || !key.startsWith('_')) {
      result[key] = value;
    }

    return result;
  }, {});
}

function getImageLabel(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return shortenText(value);
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const rawLabel = record.filename || record.fileName || record.displayName || record.title || record.altText || record.url;

    return typeof rawLabel === 'string' ? shortenText(rawLabel) : 'Wix media image selected';
  }

  return '';
}

function shortenText(value: string) {
  return value.length > 90 ? `${value.slice(0, 87)}...` : value;
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

function resolveMediaManagerImage(file: unknown): { value: unknown; label: string } {
  const imageValue = extractImageValue(file);

  return {
    value: imageValue,
    label: getMediaFileLabel(file, imageValue),
  };
}

function extractImageValue(value: unknown): unknown {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value !== 'object') {
    return '';
  }

  const record = value as Record<string, unknown>;
  const media = isRecord(record.media) ? record.media : null;
  const imageMedia = media && isRecord(media.image) ? media.image : null;
  const vectorMedia = media && isRecord(media.vector) ? media.vector : null;

  const candidates = [
    imageMedia && isRecord(imageMedia.image) ? imageMedia.image : null,
    vectorMedia && isRecord(vectorMedia.image) ? vectorMedia.image : null,
    isRecord(record.image) ? record.image : null,
    typeof record.url === 'string' ? record.url : null,
    typeof record.src === 'string' ? record.src : null,
    typeof record.fileUrl === 'string' ? record.fileUrl : null,
    typeof record.imageUrl === 'string' ? record.imageUrl : null,
    typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : null,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (typeof candidate === 'string') {
      return candidate;
    }

    if (isRecord(candidate)) {
      const candidateUrl = candidate.url || candidate.src || candidate.fileUrl || candidate.imageUrl;

      if (typeof candidateUrl === 'string') {
        return candidate;
      }
    }
  }

  return '';
}

function getMediaFileLabel(fileValue: unknown, imageValue: unknown) {
  const file = normalizeRecord(fileValue);
  const labelCandidates = [
    file.displayName,
    file.filename,
    file.fileName,
    isRecord(imageValue) ? imageValue.filename : null,
    isRecord(imageValue) ? imageValue.altText : null,
    isRecord(imageValue) ? imageValue.url : null,
    typeof imageValue === 'string' ? imageValue : null,
  ];

  const label = labelCandidates.find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);

  return label ? shortenText(label) : 'Wix media image selected';
}

async function uploadImageToMediaManager(file: File): Promise<{ value: unknown; label: string }> {
  const upload = await files.generateFileUploadUrl(file.type || 'application/octet-stream', {
    fileName: file.name,
    sizeInBytes: String(file.size),
    private: false,
    labels: ['zider-logo-loop'],
    filePath: '/zider-logo-loop',
  });

  if (!upload.uploadUrl) {
    throw new Error('Wix did not return a media upload URL.');
  }

  const uploadResponse = await uploadFileBytes(upload.uploadUrl, file);
  const imageValue = extractImageValue(uploadResponse);

  if (imageValue) {
    return {
      value: imageValue,
      label: getMediaFileLabel(normalizeRecord(uploadResponse), imageValue),
    };
  }

  const fileId = findUploadedFileId(uploadResponse);

  if (fileId) {
    const descriptor = await files.getFileDescriptor(fileId);
    const descriptorImage = extractImageValue(descriptor);

    if (descriptorImage) {
      return {
        value: descriptorImage,
        label: getMediaFileLabel(normalizeRecord(descriptor), descriptorImage),
      };
    }
  }

  throw new Error('The uploaded image did not return a usable media URL.');
}

async function uploadFileBytes(uploadUrl: string, file: File): Promise<unknown> {
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (response.ok) {
    return readResponseJson(response);
  }

  if (response.status !== 405 && response.status !== 404 && response.status !== 400) {
    throw new Error(`Upload failed with status ${response.status}.`);
  }

  const fallbackResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!fallbackResponse.ok) {
    throw new Error(`Upload failed with status ${fallbackResponse.status}.`);
  }

  return readResponseJson(fallbackResponse);
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function findUploadedFileId(value: unknown): string {
  if (!isRecord(value)) {
    return '';
  }

  const directId = value.id || value._id || value.fileId;

  if (typeof directId === 'string') {
    return directId;
  }

  const file = isRecord(value.file) ? value.file : null;
  const item = isRecord(value.item) ? value.item : null;
  const nestedId = file?.id || file?._id || item?.id || item?._id;

  return typeof nestedId === 'string' ? nestedId : '';
}

function normalizeRecord(value: unknown): MediaFileDescriptor {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

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

function parseEncodedJson<T extends Record<string, unknown>>(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    return null;
  }
}

function readQueryParamSiteId() {
  if (typeof window === 'undefined') {
    return null;
  }

  const queryParams = new URLSearchParams(window.location.search);
  const siteInfo = parseEncodedJson<Record<string, unknown>>(queryParams.get('siteInfo'));
  const directSiteId = queryParams.get('siteId') ?? queryParams.get('metaSiteId');

  return (
    (typeof siteInfo?.siteId === 'string' ? siteInfo.siteId : null) ??
    (typeof siteInfo?.metaSiteId === 'string' ? siteInfo.metaSiteId : null) ??
    extractSiteId(typeof siteInfo?.editorUrl === 'string' ? siteInfo.editorUrl : null) ??
    directSiteId
  );
}

function readTopLocationHref() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.top?.location.href ?? null;
  } catch {
    return null;
  }
}

function resolveSiteId(context = 'unknown') {
  const siteInfo = (dashboard.getSiteInfo?.() ?? null) as
    | {
        editorUrl?: string;
        siteUrl?: string;
        siteId?: string;
        metaSiteId?: string;
      }
    | null;
  const candidates: Array<{ source: string; value?: string | null }> = [
    { source: 'dashboard.getSiteInfo.siteId', value: siteInfo?.siteId },
    { source: 'dashboard.getSiteInfo.metaSiteId', value: siteInfo?.metaSiteId },
    { source: 'query.siteInfo/siteId', value: readQueryParamSiteId() },
    { source: 'dashboard.getSiteInfo.editorUrl', value: siteInfo?.editorUrl },
    { source: 'document.referrer', value: typeof document !== 'undefined' ? document.referrer : null },
    { source: 'window.top.location.href', value: readTopLocationHref() },
    { source: 'window.location.href', value: typeof window !== 'undefined' ? window.location.href : null },
  ];

  debugLog('resolve site id:start', {
    context,
    hasSiteInfo: Boolean(siteInfo),
    candidateSources: candidates.map((candidate) => ({
      source: candidate.source,
      hasValue: Boolean(candidate.value),
      preview: previewDebugValue(candidate.value),
      extractedSiteId: extractSiteId(candidate.value),
    })),
  });

  for (const candidate of candidates) {
    const siteId = extractSiteId(candidate.value);

    if (siteId) {
      debugLog('resolve site id:success', {
        context,
        source: candidate.source,
        siteId,
      });

      return siteId;
    }
  }

  debugLog('resolve site id:failed', {
    context,
  });

  return null;
}

async function resolveSiteIdAsync(context = 'unknown') {
  const immediateSiteId = resolveSiteId(`${context}:sync`);

  if (immediateSiteId) {
    return immediateSiteId;
  }

  const appInstanceSiteId = await resolveSiteIdFromAppInstance(context);

  if (appInstanceSiteId) {
    return appInstanceSiteId;
  }

  const tokenSiteId = await resolveSiteIdFromDashboardToken(context);

  if (tokenSiteId) {
    return tokenSiteId;
  }

  return null;
}

async function resolveSiteIdFromAppInstance(context: string) {
  try {
    debugLog('resolve site id app instance:start', {
      context,
    });

    const response = await appInstances.getAppInstance();
    const siteId = response.site?.siteId ?? findSiteIdInRecord(response);

    debugLog('resolve site id app instance:result', {
      context,
      hasInstance: Boolean(response.instance),
      instanceId: response.instance?.instanceId ?? null,
      hasSite: Boolean(response.site),
      siteKeys: response.site ? Object.keys(response.site).slice(0, 20) : [],
      siteId,
    });

    return siteId;
  } catch (error) {
    debugError('resolve site id app instance:failed', error);
    return null;
  }
}

async function resolveSiteIdFromDashboardToken(context: string) {
  const getAccessToken = (dashboard as typeof dashboard & { getAccessToken?: () => Promise<string> }).getAccessToken;

  if (!getAccessToken) {
    debugLog('resolve site id token:unavailable', {
      context,
    });
    return null;
  }

  try {
    const token = await getAccessToken();
    const payload = parseJwtPayload(token);
    const siteId = findSiteIdInRecord(payload);

    debugLog('resolve site id token:result', {
      context,
      hasToken: Boolean(token),
      payloadKeys: payload ? Object.keys(payload).slice(0, 20) : [],
      siteId,
    });

    return siteId;
  } catch (error) {
    debugError('resolve site id token:failed', error);
    return null;
  }
}

function parseJwtPayload(token: string) {
  const payloadPart = token.split('.')[1];

  if (!payloadPart) {
    return null;
  }

  try {
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
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

function buildCmsCollectionUrl(siteId: string, collectionId: string) {
  return `https://manage.wix.com/dashboard/${siteId}/database/data/${encodeURIComponent(collectionId)}`;
}

function buildCmsItemUrl(siteId: string, collectionId: string, itemId: string) {
  return `https://manage.wix.com/dashboard/${siteId}/database/data/${encodeURIComponent(collectionId)}/${encodeURIComponent(itemId)}`;
}

function debugLog(message: string, payload?: unknown) {
  console.log(`[ZIDER LOGO LOOP] ${message}`, payload ?? '');
}

function debugError(message: string, error: unknown) {
  console.error(`[ZIDER LOGO LOOP] ${message}`, serializeError(error));
}

function previewDebugValue(value?: string | null) {
  if (!value) {
    return '';
  }

  const withoutSearch = value.split('?')[0] ?? value;

  return withoutSearch.length > 140 ? `${withoutSearch.slice(0, 140)}...` : withoutSearch;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
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
