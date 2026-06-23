import { items } from '@wix/data';
import { sortLogoItems } from '../../shared/logo-order';

const DEFAULT_COLLECTION_ID = '@zider-ink/zider-loop-logo/database';
const WATERMARK_URL = 'https://static.wixstatic.com/shapes/46696d_df515679c6e04f618b508fb4336421f5.svg';
const INITIAL_RENDER_DELAY_MS = 120;
const DISPLAY_LOGO_LIMIT = 50;
const INITIAL_IMAGE_READY_COUNT = 6;
const INITIAL_IMAGE_READY_TIMEOUT_MS = 700;
const DESKTOP_LOGO_IMAGE_TRANSFORM_WIDTH = 720;
const DESKTOP_LOGO_IMAGE_TRANSFORM_HEIGHT = 240;
const MOBILE_LOGO_IMAGE_TRANSFORM_WIDTH = 480;
const MOBILE_LOGO_IMAGE_TRANSFORM_HEIGHT = 160;
const LOGO_ITEMS_CACHE_TTL_MS = 60_000;
const PERSISTED_LOGO_ITEMS_CACHE_TTL_MS = 10 * 60_000;
const PERSISTED_LOGO_ITEMS_CACHE_PREFIX = 'zider-logo-loop:items:v2';
const RESIZE_ANIMATION_DEBOUNCE_MS = 120;

type LogoItem = {
  image?: unknown;
  title?: string;
  description?: string;
  link?: string;
  sortNumber?: unknown;
};

type LogoViewItem = {
  imageSource: string;
  alt: string;
  link: string;
};

type LoopConfig = {
  useMobileValues: boolean;
  speed: number;
  gap: number;
  height: number;
  direction: 'left' | 'right';
  pauseOnHover: boolean;
  hiddenMaskColor: boolean;
  maskColor: string;
  links: boolean;
  grayMode: boolean;
  hideWatermark: boolean;
};

export default class ZiderLogoLoop extends HTMLElement {
  static get observedAttributes() {
    return [
      'speed',
      'gap',
      'logo-height',
      'direction',
      'pause-on-hover',
      'hidden-mask-color',
      'mask-color',
      'links',
      'gray-mode',
      'enable-mobile-settings',
      'mobile-speed',
      'mobile-gap',
      'mobile-logo-height',
      'hide-watermark',
      'collection-id',
    ];
  }

  private logos: LogoViewItem[] = [];
  private loadToken = 0;
  private renderToken = 0;
  private readyRenderToken = 0;
  private hasConnected = false;
  private hasLoadedLogos = false;
  private hasRendered = false;
  private renderedUsesMobileValues = false;
  private renderTimeoutId?: number;
  private animationFrameId?: number;
  private resizeTimeoutId?: number;
  private resizeObserver?: ResizeObserver;

  connectedCallback() {
    this.hasConnected = true;
    this.applyHostSize(this.config.height);
    this.loadLogos();

    this.resizeObserver = new ResizeObserver(() => {
      if (this.hasRendered && this.shouldUseMobileValues() !== this.renderedUsesMobileValues) {
        this.queueRender();
        return;
      }

      this.scheduleResizeAnimation();
    });
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.cancelQueuedRender();
    this.cancelResizeAnimation();
    this.cancelScheduledAnimation();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this.hasConnected || oldValue === newValue) {
      return;
    }

    if (name === 'collection-id') {
      this.hasLoadedLogos = false;
      this.loadLogos();
      return;
    }

    if (!this.hasLoadedLogos && !this.hasRendered) {
      this.applyHostSize(this.config.height);
      return;
    }

    this.queueRender(this.hasRendered ? 0 : INITIAL_RENDER_DELAY_MS);
  }

  private async loadLogos() {
    const token = ++this.loadToken;
    const cachedItems = readPersistedLogoItems(this.collectionId, DISPLAY_LOGO_LIMIT);

    if (cachedItems.length > 0) {
      this.applyLogoItems(token, cachedItems);
    }

    try {
      const cmsItems = await queryOrderedLogoItems(this.collectionId, DISPLAY_LOGO_LIMIT);
      this.applyLogoItems(token, cmsItems);
    } catch (error) {
      if (token === this.loadToken && !this.hasLoadedLogos) {
        console.warn('[ZIDER LOGO LOOP] CMS query failed, leaving logo list empty.', error);
      }
    }
  }

  private applyLogoItems(token: number, items: LogoItem[]) {
    if (token !== this.loadToken) {
      return;
    }

    const nextLogos = items
      .map((item) => normalizeLogoItem(item as LogoItem))
      .filter((item): item is LogoViewItem => Boolean(item?.imageSource));

    this.logos = nextLogos;
    this.hasLoadedLogos = true;

    if (this.hasConnected) {
      this.queueRender();
    }
  }

  private get collectionId() {
    return this.getAttribute('collection-id') || DEFAULT_COLLECTION_ID;
  }

  private get config(): LoopConfig {
    const useMobileValues = this.shouldUseMobileValues();

    return {
      useMobileValues,
      speed: this.getNumberAttr(useMobileValues ? 'mobile-speed' : 'speed', 60),
      gap: this.getNumberAttr(useMobileValues ? 'mobile-gap' : 'gap', 40),
      height: this.getNumberAttr(useMobileValues ? 'mobile-logo-height' : 'logo-height', 50),
      direction: this.getDirectionAttr(),
      pauseOnHover: this.getBooleanAttr('pause-on-hover', true),
      hiddenMaskColor: this.getBooleanAttr('hidden-mask-color', true),
      maskColor: sanitizeColor(this.getAttribute('mask-color') || '#ffffff'),
      links: this.getBooleanAttr('links', true),
      grayMode: this.getBooleanAttr('gray-mode', false),
      hideWatermark: this.getBooleanAttr('hide-watermark', false),
    };
  }

  private render() {
    this.cancelQueuedRender();
    this.hasRendered = true;

    const renderToken = ++this.renderToken;
    this.readyRenderToken = 0;
    const config = this.config;
    this.renderedUsesMobileValues = config.useMobileValues;
    this.applyHostSize(config.height);

    const maskColor = config.hiddenMaskColor ? 'rgba(255,255,255,0)' : config.maskColor;
    const logoMarkup = this.logos.map((logo, index) => this.renderLogo(logo, config, index)).join('');

    this.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          min-width: 120px;
          min-height: ${Math.max(config.height, 24)}px;
          box-sizing: border-box;
        }

        .zider-logo-loop {
          --zider-logo-height: ${config.height}px;
          --zider-logo-gap: ${config.gap}px;
          --zider-mask-color: ${maskColor};
          position: relative;
          width: 100%;
          height: var(--zider-logo-height);
          min-height: var(--zider-logo-height);
          display: flex;
          align-items: center;
          overflow: hidden;
          box-sizing: border-box;
        }

        .zider-logo-loop::before,
        .zider-logo-loop::after {
          content: '';
          position: absolute;
          top: 0;
          width: 48px;
          height: 100%;
          z-index: 2;
          pointer-events: none;
        }

        .zider-logo-loop::before {
          left: 0;
          background: linear-gradient(to right, var(--zider-mask-color), rgba(255,255,255,0));
        }

        .zider-logo-loop::after {
          right: 0;
          background: linear-gradient(to left, var(--zider-mask-color), rgba(255,255,255,0));
        }

        .zider-logo-track {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          width: max-content;
          opacity: 0;
          will-change: transform;
          transition: opacity 120ms ease;
        }

        .zider-logo-loop[data-ready="true"] .zider-logo-track {
          opacity: 1;
        }

        .zider-logo-item {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          height: var(--zider-logo-height);
          margin-right: var(--zider-logo-gap);
        }

        .zider-logo-image {
          display: block;
          width: auto;
          max-width: none;
          height: 100%;
          object-fit: contain;
          transition: filter 180ms ease, opacity 180ms ease;
        }

        .zider-logo-loop[data-gray-mode="true"] .zider-logo-image {
          filter: grayscale(100%);
        }

        .zider-logo-loop[data-gray-mode="true"] .zider-logo-image:hover {
          filter: grayscale(0%);
        }

        .zider-watermark {
          position: absolute;
          right: 8px;
          bottom: 6px;
          z-index: 3;
          display: ${config.hideWatermark ? 'none' : 'inline-flex'};
          width: 44px;
          opacity: 0.72;
          transition: opacity 160ms ease;
        }

        .zider-watermark:hover {
          opacity: 1;
        }

        .zider-watermark img {
          width: 100%;
          height: auto;
          display: block;
        }

        @keyframes zider-logo-loop-slide {
          from { transform: translateX(0); }
          to { transform: translateX(calc(var(--zider-loop-distance, 0px) * -1)); }
        }
      </style>
      <div class="zider-logo-loop" data-gray-mode="${String(config.grayMode)}" data-ready="false">
        <div class="zider-logo-track">${logoMarkup}</div>
        <a class="zider-watermark" href="https://zider.ink/" target="_blank" rel="noopener noreferrer" aria-label="Powered by ZIDER">
          <img src="${WATERMARK_URL}" alt="ZIDER" />
        </a>
      </div>
    `;

    this.bindInteractions(config);
    this.waitForInitialImages().then(() => {
      if (renderToken === this.renderToken) {
        this.readyRenderToken = renderToken;
        this.scheduleAnimation();
      }
    });
    this.waitForImages().then(() => {
      if (renderToken === this.renderToken) {
        this.readyRenderToken = renderToken;
        this.scheduleAnimation();
      }
    });
  }

  private applyHostSize(height: number) {
    const heightValue = `${Math.max(height, 24)}px`;

    this.style.display = 'block';
    this.style.removeProperty('width');
    this.style.maxWidth = '100%';
    this.style.minWidth = '120px';
    this.style.height = heightValue;
    this.style.minHeight = heightValue;
    this.style.boxSizing = 'border-box';
    this.style.overflow = 'hidden';
  }

  private renderLogo(logo: LogoViewItem, config: LoopConfig, index: number) {
    const tag = config.links && logo.link ? 'a' : 'span';
    const href = tag === 'a' ? ` href="${escapeAttr(logo.link)}" target="_blank" rel="noopener noreferrer"` : '';
    const cursor = tag === 'a' ? 'pointer' : 'default';
    const fetchPriority = index < INITIAL_IMAGE_READY_COUNT ? 'high' : 'low';
    const loading = index < INITIAL_IMAGE_READY_COUNT ? 'eager' : 'lazy';
    const src = resolveImageUrl(logo.imageSource, config);

    return `
      <${tag} class="zider-logo-item" ${href}>
        <img class="zider-logo-image" src="${escapeAttr(src)}" alt="${escapeAttr(logo.alt)}" decoding="async" loading="${loading}" fetchpriority="${fetchPriority}" style="cursor:${cursor};" />
      </${tag}>
    `;
  }

  private bindInteractions(config: LoopConfig) {
    const root = this.querySelector<HTMLElement>('.zider-logo-loop');
    const track = this.querySelector<HTMLElement>('.zider-logo-track');

    if (!root || !track) {
      return;
    }

    root.onmouseenter = config.pauseOnHover ? () => (track.style.animationPlayState = 'paused') : null;
    root.onmouseleave = config.pauseOnHover ? () => (track.style.animationPlayState = 'running') : null;
  }

  private shouldUseMobileValues() {
    if (!this.getBooleanAttr('enable-mobile-settings', false) || typeof window === 'undefined') {
      return false;
    }

    const elementWidth = this.getBoundingClientRect().width || this.offsetWidth;

    return (
      window.matchMedia('(max-width: 767px)').matches ||
      (elementWidth > 0 && elementWidth <= 767)
    );
  }

  private async waitForImages() {
    const images = Array.from(this.querySelectorAll<HTMLImageElement>('.zider-logo-image'));

    await this.waitForImageElements(images);
  }

  private async waitForInitialImages() {
    const images = Array.from(this.querySelectorAll<HTMLImageElement>('.zider-logo-image'));
    const initialImages = images.slice(0, INITIAL_IMAGE_READY_COUNT);

    await Promise.race([
      this.waitForImageElements(initialImages),
      delay(INITIAL_IMAGE_READY_TIMEOUT_MS),
    ]);
  }

  private async waitForImageElements(images: HTMLImageElement[]) {
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          }),
      ),
    );
  }

  private startAnimation() {
    const root = this.querySelector<HTMLElement>('.zider-logo-loop');
    const track = this.querySelector<HTMLElement>('.zider-logo-track');

    if (!root || !track || track.children.length === 0) {
      return;
    }

    if (this.readyRenderToken !== this.renderToken) {
      return;
    }

    const config = this.config;
    track.style.animation = 'none';
    track.style.transform = 'translateX(0)';
    Array.from(track.querySelectorAll('[data-zider-clone="true"]')).forEach((clone) => clone.remove());

    const containerWidth = root.offsetWidth || window.innerWidth || 1000;
    const baseChildren = Array.from(track.children);
    const baseWidth = track.scrollWidth;

    if (baseWidth <= 0 || baseChildren.length === 0) {
      return;
    }

    const cloneCycles = Math.max(Math.ceil(containerWidth / baseWidth), 1);
    const maxCloneCount = baseChildren.length * Math.max(cloneCycles + 1, 2);
    const fragment = document.createDocumentFragment();
    const cloneCount = Math.min(cloneCycles * baseChildren.length, maxCloneCount);

    for (let index = 0; index < cloneCount; index += 1) {
      const child = baseChildren[index % baseChildren.length];
      const clone = child.cloneNode(true) as HTMLElement;

      clone.setAttribute('data-zider-clone', 'true');
      fragment.appendChild(clone);
    }

    track.appendChild(fragment);

    const distance = Math.max(baseWidth, 1);
    const duration = Math.max(distance / Math.max(config.speed, 1), 6);

    track.style.setProperty('--zider-loop-distance', `${distance}px`);
    track.style.animationName = 'zider-logo-loop-slide';
    track.style.animationDuration = `${duration}s`;
    track.style.animationTimingFunction = 'linear';
    track.style.animationIterationCount = 'infinite';
    track.style.animationDirection = config.direction === 'right' ? 'reverse' : 'normal';
    track.style.animationPlayState = 'running';
    root.dataset.ready = 'true';
  }

  private queueRender(delay = 0) {
    this.cancelQueuedRender();

    this.renderTimeoutId = window.setTimeout(() => {
      this.renderTimeoutId = undefined;
      this.render();
    }, delay);
  }

  private cancelQueuedRender() {
    if (this.renderTimeoutId !== undefined) {
      window.clearTimeout(this.renderTimeoutId);
      this.renderTimeoutId = undefined;
    }
  }

  private scheduleAnimation() {
    this.cancelScheduledAnimation();

    this.animationFrameId = window.requestAnimationFrame(() => {
      this.animationFrameId = undefined;
      this.startAnimation();
    });
  }

  private scheduleResizeAnimation() {
    this.cancelResizeAnimation();

    this.resizeTimeoutId = window.setTimeout(() => {
      this.resizeTimeoutId = undefined;
      this.scheduleAnimation();
    }, RESIZE_ANIMATION_DEBOUNCE_MS);
  }

  private cancelResizeAnimation() {
    if (this.resizeTimeoutId !== undefined) {
      window.clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = undefined;
    }
  }

  private cancelScheduledAnimation() {
    if (this.animationFrameId !== undefined) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private getNumberAttr(name: string, fallback: number) {
    const rawValue = this.getAttribute(name);
    const value = rawValue ? Number.parseFloat(rawValue.replace(/[^0-9.]/g, '')) : Number.NaN;

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private getBooleanAttr(name: string, fallback: boolean) {
    const value = this.getAttribute(name);

    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    return value !== 'false';
  }

  private getDirectionAttr(): 'left' | 'right' {
    return this.getAttribute('direction') === 'right' ? 'right' : 'left';
  }
}

function normalizeLogoItem(item: LogoItem): LogoViewItem | null {
  const imageSource = resolveImageSource(item.image);

  if (!imageSource) {
    return null;
  }

  return {
    imageSource,
    alt: item.title || item.description || 'Logo',
    link: item.link || '',
  };
}

async function queryOrderedLogoItems(collectionId: string, limit: number) {
  const cacheKey = `${collectionId}:${limit}`;
  const cachedItems = logoItemsCache.get(cacheKey);

  if (cachedItems && cachedItems.expiresAt > Date.now()) {
    return cachedItems.promise;
  }

  const promise = fetchOrderedLogoItems(collectionId, limit).catch((error) => {
    logoItemsCache.delete(cacheKey);
    throw error;
  });

  logoItemsCache.set(cacheKey, {
    expiresAt: Date.now() + LOGO_ITEMS_CACHE_TTL_MS,
    promise,
  });

  return promise;
}

async function fetchOrderedLogoItems(collectionId: string, limit: number) {
  const numberedResult = await items
    .query(collectionId)
    .isNotEmpty('sortNumber')
    .ascending('sortNumber')
    .limit(limit)
    .find();
  const sortedItems = sortLogoItems(numberedResult.items as LogoItem[]).slice(0, limit);

  if (sortedItems.length < limit) {
    const emptyResult = await items
      .query(collectionId)
      .isEmpty('sortNumber')
      .limit(limit - sortedItems.length)
      .find();

    sortedItems.push(...(emptyResult.items as LogoItem[]));
  }

  writePersistedLogoItems(collectionId, limit, sortedItems);

  return sortedItems;
}

const logoItemsCache = new Map<string, { expiresAt: number; promise: Promise<LogoItem[]> }>();

function readPersistedLogoItems(collectionId: string, limit: number): LogoItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storage = getLogoItemsStorage();
    const cachedValue = storage?.getItem(getPersistedLogoItemsCacheKey(collectionId, limit));

    if (!cachedValue) {
      return [];
    }

    const cachedData = JSON.parse(cachedValue) as { expiresAt?: number; items?: LogoItem[] };

    if (!cachedData.expiresAt || cachedData.expiresAt <= Date.now() || !Array.isArray(cachedData.items)) {
      return [];
    }

    return cachedData.items;
  } catch {
    return [];
  }
}

function writePersistedLogoItems(collectionId: string, limit: number, logoItems: LogoItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    getLogoItemsStorage()?.setItem(
      getPersistedLogoItemsCacheKey(collectionId, limit),
      JSON.stringify({
        expiresAt: Date.now() + PERSISTED_LOGO_ITEMS_CACHE_TTL_MS,
        items: logoItems.map(toCacheableLogoItem),
      }),
    );
  } catch {
    // Storage can be unavailable in strict privacy modes. The in-memory cache still works.
  }
}

function getLogoItemsStorage(): Storage | null {
  try {
    return window.localStorage || window.sessionStorage || null;
  } catch {
    return null;
  }
}

function getPersistedLogoItemsCacheKey(collectionId: string, limit: number) {
  return `${PERSISTED_LOGO_ITEMS_CACHE_PREFIX}:${collectionId}:${limit}`;
}

function toCacheableLogoItem(item: LogoItem): LogoItem {
  return {
    image: resolveImageSource(item.image),
    title: typeof item.title === 'string' ? item.title : '',
    description: typeof item.description === 'string' ? item.description : '',
    link: typeof item.link === 'string' ? item.link : '',
    sortNumber: item.sortNumber,
  };
}

function resolveImageSource(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const rawUrl = record.url || record.src || record.fileUrl || record.imageUrl;

    if (typeof rawUrl === 'string') {
      return rawUrl;
    }
  }

  return '';
}

function resolveImageUrl(url: string, config: LoopConfig) {
  return normalizeWixMediaUrl(url, getLogoImageTransformSize(config));
}

function normalizeWixMediaUrl(url: string, size: LogoImageTransformSize) {
  if (url.startsWith('data:image')) {
    return url;
  }

  if (url.startsWith('http') || url.startsWith('//')) {
    return optimizeStaticWixImageUrl(url, size);
  }

  if (url.startsWith('wix:image://')) {
    const match = url.match(/wix:image:\/\/v1\/([^/#?]+)/);
    return match?.[1] ? createOptimizedWixImageUrl(match[1], size) : url;
  }

  if (url.startsWith('wix:vector://') || url.startsWith('wix:shape://')) {
    const match = url.match(/wix:(?:vector|shape):\/\/v1\/([^/#?]+)/);
    const id = match?.[1]?.replace(/\.svg$/i, '');
    return id ? `https://static.wixstatic.com/shapes/${id}.svg` : url;
  }

  return url;
}

type LogoImageTransformSize = {
  width: number;
  height: number;
};

function getLogoImageTransformSize(config: LoopConfig): LogoImageTransformSize {
  if (config.useMobileValues || config.height <= 80) {
    return {
      width: MOBILE_LOGO_IMAGE_TRANSFORM_WIDTH,
      height: MOBILE_LOGO_IMAGE_TRANSFORM_HEIGHT,
    };
  }

  return {
    width: DESKTOP_LOGO_IMAGE_TRANSFORM_WIDTH,
    height: DESKTOP_LOGO_IMAGE_TRANSFORM_HEIGHT,
  };
}

function optimizeStaticWixImageUrl(url: string, size: LogoImageTransformSize) {
  const normalizedUrl = url.startsWith('//') ? `https:${url}` : url;

  if (!normalizedUrl.startsWith('https://static.wixstatic.com/media/')) {
    return normalizedUrl;
  }

  const match = normalizedUrl.match(/^https?:\/\/static\.wixstatic\.com\/media\/([^/?#]+)(?:\/v1\/.*)?$/i);
  const mediaId = match?.[1];

  if (!mediaId || /\.svg$/i.test(mediaId)) {
    return normalizedUrl;
  }

  return createOptimizedWixImageUrl(mediaId, size);
}

function createOptimizedWixImageUrl(mediaId: string, size: LogoImageTransformSize) {
  return `https://static.wixstatic.com/media/${mediaId}/v1/fit/w_${size.width},h_${size.height},al_c,q_85,enc_avif,quality_auto/${mediaId}`;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function sanitizeColor(value: string) {
  const trimmedValue = value.trim();

  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return '#ffffff';
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[char];
  });
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}
