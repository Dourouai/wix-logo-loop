import { items } from '@wix/data';
import { hasLogoSortNumber, sortLogoItems } from '../../shared/logo-order';

const DEFAULT_COLLECTION_ID = '@zider-ink/zider-loop-logo/database';
const WATERMARK_URL = 'https://static.wixstatic.com/shapes/46696d_df515679c6e04f618b508fb4336421f5.svg';
const DISPLAY_LOGO_LIMIT = 50;
const DEFAULT_ROTATE_INTERVAL_MS = 3200;
const TRANSITION_DURATION_MS = 520;
const STAGGER_DELAY_MS = 140;
const VERTICAL_OFFSET_PX = 16;
const DESKTOP_SLOT_COUNT = 5;
const TABLET_SLOT_COUNT = 4;
const MOBILE_SLOT_COUNT = 3;
const MOBILE_BREAKPOINT = 767;
const TABLET_BREAKPOINT = 1024;
const DESKTOP_LOGO_IMAGE_TRANSFORM_WIDTH = 520;
const DESKTOP_LOGO_IMAGE_TRANSFORM_HEIGHT = 180;
const MOBILE_LOGO_IMAGE_TRANSFORM_WIDTH = 360;
const MOBILE_LOGO_IMAGE_TRANSFORM_HEIGHT = 120;

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

type RotatorConfig = {
  useMobileValues: boolean;
  logoHeight: number;
  gap: number;
  rotateInterval: number;
  autoRotate: boolean;
  pauseOnHover: boolean;
  links: boolean;
  grayMode: boolean;
  hideWatermark: boolean;
};

export default class ZiderTrustedLogoRotator extends HTMLElement {
  static get observedAttributes() {
    return [
      'logo-height',
      'gap',
      'auto-rotate',
      'rotate-interval',
      'pause-on-hover',
      'links',
      'gray-mode',
      'enable-mobile-settings',
      'mobile-gap',
      'mobile-logo-height',
      'hide-watermark',
      'collection-id',
    ];
  }

  private logos: LogoViewItem[] = [];
  private visibleStartIndex = 0;
  private slotCount = DESKTOP_SLOT_COUNT;
  private loadToken = 0;
  private renderToken = 0;
  private hasConnected = false;
  private hasLoadedLogos = false;
  private renderedUsesMobileValues = false;
  private renderedSlotCount = DESKTOP_SLOT_COUNT;
  private isPaused = false;
  private isAnimating = false;
  private renderTimeoutId?: number;
  private rotateTimeoutId?: number;
  private finishTimeoutId?: number;
  private staggerTimeoutIds: number[] = [];
  private resizeObserver?: ResizeObserver;
  private reduceMotionQuery?: MediaQueryList;

  connectedCallback() {
    this.hasConnected = true;
    this.slotCount = this.resolveSlotCount();
    this.applyHostSize(this.config);
    this.loadLogos();

    this.resizeObserver = new ResizeObserver(() => {
      const nextSlotCount = this.resolveSlotCount();
      const nextUsesMobileValues = this.shouldUseMobileValues();

      if (
        this.hasLoadedLogos &&
        !this.isAnimating &&
        (nextSlotCount !== this.renderedSlotCount || nextUsesMobileValues !== this.renderedUsesMobileValues)
      ) {
        this.slotCount = nextSlotCount;
        this.visibleStartIndex = 0;
        this.queueRender();
        return;
      }

      this.applyHostSize(this.config);
    });
    this.resizeObserver.observe(this);

    this.reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.cancelQueuedRender();
    this.cancelRotationTimers();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this.hasConnected || oldValue === newValue) {
      return;
    }

    if (name === 'collection-id') {
      this.hasLoadedLogos = false;
      this.visibleStartIndex = 0;
      this.loadLogos();
      return;
    }

    if (!this.hasLoadedLogos) {
      this.applyHostSize(this.config);
      return;
    }

    this.queueRender();
  }

  private async loadLogos() {
    const token = ++this.loadToken;

    try {
      const cmsItems = await queryOrderedLogoItems(this.collectionId, DISPLAY_LOGO_LIMIT);

      if (token !== this.loadToken) {
        return;
      }

      this.logos = cmsItems
        .map((item) => normalizeLogoItem(item))
        .filter((item): item is LogoViewItem => Boolean(item?.imageSource));
      this.hasLoadedLogos = true;
      this.visibleStartIndex = 0;

      if (this.hasConnected) {
        this.queueRender();
      }
    } catch (error) {
      if (token === this.loadToken) {
        this.logos = [];
        this.hasLoadedLogos = true;
        console.warn('[ZIDER TRUSTED LOGO ROTATOR] CMS query failed, leaving logo list empty.', error);
        this.queueRender();
      }
    }
  }

  private get collectionId() {
    return this.getAttribute('collection-id') || DEFAULT_COLLECTION_ID;
  }

  private get config(): RotatorConfig {
    const useMobileValues = this.shouldUseMobileValues();

    return {
      useMobileValues,
      logoHeight: this.getNumberAttr(useMobileValues ? 'mobile-logo-height' : 'logo-height', useMobileValues ? 30 : 44),
      gap: this.getNumberAttr(useMobileValues ? 'mobile-gap' : 'gap', useMobileValues ? 20 : 64),
      rotateInterval: this.getNumberAttr('rotate-interval', DEFAULT_ROTATE_INTERVAL_MS),
      autoRotate: this.getBooleanAttr('auto-rotate', true),
      pauseOnHover: this.getBooleanAttr('pause-on-hover', true),
      links: this.getBooleanAttr('links', true),
      grayMode: this.getBooleanAttr('gray-mode', false),
      hideWatermark: this.getBooleanAttr('hide-watermark', false),
    };
  }

  private render() {
    this.cancelQueuedRender();
    this.cancelRotationTimers();
    this.isAnimating = false;

    const renderToken = ++this.renderToken;
    const config = this.config;
    this.slotCount = this.resolveSlotCount();
    this.renderedSlotCount = this.slotCount;
    this.renderedUsesMobileValues = config.useMobileValues;
    this.applyHostSize(config);

    const canRotate = this.shouldRotate(config);
    const activeSlotCount = canRotate ? this.slotCount : Math.min(this.logos.length, this.slotCount);
    const currentItems = this.getLogoWindow(this.visibleStartIndex, activeSlotCount);
    const nextItems = canRotate
      ? this.getLogoWindow(this.visibleStartIndex + this.slotCount, activeSlotCount)
      : [];
    const slotsMarkup = currentItems
      .map((logo, index) => this.renderSlot(logo, nextItems[index], config, index, canRotate))
      .join('');
    const staticMaxWidth = this.getStaticMaxWidth(activeSlotCount, config.gap);

    this.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          min-width: 120px;
          min-height: ${this.getComponentHeight(config)}px;
          box-sizing: border-box;
        }

        .zider-trusted-logo-rotator {
          --zider-logo-height: ${config.logoHeight}px;
          --zider-logo-gap: ${config.gap}px;
          --zider-transition-duration: ${TRANSITION_DURATION_MS}ms;
          --zider-vertical-offset: ${VERTICAL_OFFSET_PX}px;
          position: relative;
          width: 100%;
          height: 100%;
          min-height: ${this.getComponentHeight(config)}px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-sizing: border-box;
          padding: 0 20px;
        }

        .zider-rotator-slots {
          display: grid;
          grid-template-columns: repeat(${Math.max(activeSlotCount, 1)}, minmax(0, 1fr));
          align-items: center;
          width: 100%;
          column-gap: var(--zider-logo-gap);
          box-sizing: border-box;
        }

        .zider-rotator-slots[data-static="true"] {
          max-width: ${staticMaxWidth}px;
          margin: 0 auto;
        }

        .zider-rotator-slot {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          height: calc(var(--zider-logo-height) + var(--zider-vertical-offset) * 2);
          color: inherit;
          text-decoration: none;
          overflow: hidden;
        }

        .zider-rotator-logo {
          position: absolute;
          inset: var(--zider-vertical-offset) 0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          opacity: 1;
          transform: translateY(0);
          transition:
            transform var(--zider-transition-duration) cubic-bezier(0.22, 1, 0.36, 1),
            opacity var(--zider-transition-duration) ease;
          will-change: transform, opacity;
        }

        .zider-rotator-logo-next {
          opacity: 0;
          transform: translateY(var(--zider-vertical-offset));
        }

        .zider-rotator-slot[data-animating="true"] .zider-rotator-logo-current {
          opacity: 0;
          transform: translateY(calc(var(--zider-vertical-offset) * -1));
        }

        .zider-rotator-slot[data-animating="true"] .zider-rotator-logo-next {
          opacity: 1;
          transform: translateY(0);
        }

        .zider-rotator-image {
          display: block;
          max-width: 100%;
          max-height: var(--zider-logo-height);
          width: auto;
          height: auto;
          object-fit: contain;
          transition: filter 180ms ease, opacity 180ms ease;
        }

        .zider-trusted-logo-rotator[data-gray-mode="true"] .zider-rotator-image {
          filter: grayscale(100%);
        }

        .zider-trusted-logo-rotator[data-gray-mode="true"] .zider-rotator-slot:hover .zider-rotator-image {
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
          display: block;
          width: 100%;
          height: auto;
        }

        @media (prefers-reduced-motion: reduce) {
          .zider-rotator-logo {
            transition: none;
          }
        }
      </style>
      <div class="zider-trusted-logo-rotator" data-gray-mode="${String(config.grayMode)}" data-ready="${String(this.hasLoadedLogos)}">
        <div class="zider-rotator-slots" data-static="${String(!canRotate)}">${slotsMarkup}</div>
        <a class="zider-watermark" href="https://zider.ink/" target="_blank" rel="noopener noreferrer" aria-label="Powered by ZIDER">
          <img src="${WATERMARK_URL}" alt="ZIDER" />
        </a>
      </div>
    `;

    this.bindInteractions(config);

    if (renderToken === this.renderToken) {
      this.scheduleRotation(config);
    }
  }

  private renderSlot(
    logo: LogoViewItem,
    nextLogo: LogoViewItem | undefined,
    config: RotatorConfig,
    index: number,
    canRotate: boolean,
  ) {
    const tag = config.links && logo.link ? 'a' : 'span';
    const href = tag === 'a' ? ` href="${escapeAttr(logo.link)}" target="_blank" rel="noopener noreferrer"` : '';
    const cursor = tag === 'a' ? 'pointer' : 'default';
    const currentSrc = resolveImageUrl(logo.imageSource, config);
    const nextSrc = nextLogo ? resolveImageUrl(nextLogo.imageSource, config) : '';

    return `
      <${tag} class="zider-rotator-slot" ${href} data-slot-index="${index}" style="cursor:${cursor};">
        <span class="zider-rotator-logo zider-rotator-logo-current">
          <img class="zider-rotator-image" src="${escapeAttr(currentSrc)}" alt="${escapeAttr(logo.alt)}" decoding="async" fetchpriority="${index === 0 ? 'high' : 'low'}" />
        </span>
        ${canRotate && nextLogo ? `
          <span class="zider-rotator-logo zider-rotator-logo-next" aria-hidden="true">
            <img class="zider-rotator-image" src="${escapeAttr(nextSrc)}" alt="" decoding="async" fetchpriority="low" />
          </span>
        ` : ''}
      </${tag}>
    `;
  }

  private bindInteractions(config: RotatorConfig) {
    const root = this.querySelector<HTMLElement>('.zider-trusted-logo-rotator');

    if (!root) {
      return;
    }

    root.onmouseenter = config.pauseOnHover ? () => {
      this.isPaused = true;
      if (!this.isAnimating) {
        this.cancelRotationTimers();
      }
    } : null;

    root.onmouseleave = config.pauseOnHover ? () => {
      this.isPaused = false;
      if (!this.isAnimating) {
        this.scheduleRotation(this.config);
      }
    } : null;
  }

  private scheduleRotation(config: RotatorConfig) {
    this.cancelRotationTimers();

    if (!this.shouldRotate(config) || this.isPaused || this.isReducedMotion()) {
      return;
    }

    this.rotateTimeoutId = window.setTimeout(() => {
      this.rotateTimeoutId = undefined;
      this.startRotation();
    }, Math.max(config.rotateInterval, 800));
  }

  private startRotation() {
    const root = this.querySelector<HTMLElement>('.zider-trusted-logo-rotator');
    const slots = Array.from(this.querySelectorAll<HTMLElement>('.zider-rotator-slot'));
    const renderToken = this.renderToken;

    if (!root || slots.length === 0 || this.isAnimating || this.isPaused || this.isReducedMotion()) {
      this.scheduleRotation(this.config);
      return;
    }

    this.isAnimating = true;
    root.dataset.animating = 'true';

    slots.forEach((slot, index) => {
      const timeoutId = window.setTimeout(() => {
        if (renderToken === this.renderToken) {
          slot.dataset.animating = 'true';
        }
      }, index * STAGGER_DELAY_MS);

      this.staggerTimeoutIds.push(timeoutId);
    });

    const totalDuration = ((slots.length - 1) * STAGGER_DELAY_MS) + TRANSITION_DURATION_MS;

    this.finishTimeoutId = window.setTimeout(() => {
      if (renderToken !== this.renderToken) {
        return;
      }

      this.visibleStartIndex = (this.visibleStartIndex + this.slotCount) % Math.max(this.logos.length, 1);
      this.isAnimating = false;
      this.render();
    }, totalDuration);
  }

  private shouldRotate(config: RotatorConfig) {
    return config.autoRotate && this.logos.length > this.slotCount;
  }

  private getLogoWindow(startIndex: number, count: number) {
    if (this.logos.length === 0 || count <= 0) {
      return [];
    }

    return Array.from({ length: count }, (_, index) => this.logos[(startIndex + index) % this.logos.length]);
  }

  private resolveSlotCount() {
    if (typeof window === 'undefined') {
      return DESKTOP_SLOT_COUNT;
    }

    const elementWidth = this.getBoundingClientRect().width || this.offsetWidth || window.innerWidth;

    if (elementWidth <= MOBILE_BREAKPOINT) {
      return MOBILE_SLOT_COUNT;
    }

    if (elementWidth <= TABLET_BREAKPOINT) {
      return TABLET_SLOT_COUNT;
    }

    return DESKTOP_SLOT_COUNT;
  }

  private shouldUseMobileValues() {
    if (!this.getBooleanAttr('enable-mobile-settings', false) || typeof window === 'undefined') {
      return false;
    }

    const elementWidth = this.getBoundingClientRect().width || this.offsetWidth;

    return (
      window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches ||
      (elementWidth > 0 && elementWidth <= MOBILE_BREAKPOINT)
    );
  }

  private isReducedMotion() {
    return Boolean(this.reduceMotionQuery?.matches);
  }

  private applyHostSize(config: RotatorConfig) {
    const heightValue = `${this.getComponentHeight(config)}px`;

    this.style.display = 'block';
    this.style.removeProperty('width');
    this.style.maxWidth = '100%';
    this.style.minWidth = '120px';
    this.style.height = heightValue;
    this.style.minHeight = heightValue;
    this.style.boxSizing = 'border-box';
    this.style.overflow = 'hidden';
  }

  private getComponentHeight(config: RotatorConfig) {
    if (config.useMobileValues || this.slotCount === MOBILE_SLOT_COUNT) {
      return Math.max(config.logoHeight + 42, 72);
    }

    if (this.slotCount === TABLET_SLOT_COUNT) {
      return Math.max(config.logoHeight + 48, 88);
    }

    return Math.max(config.logoHeight + 52, 96);
  }

  private getStaticMaxWidth(slotCount: number, gap: number) {
    if (slotCount <= 0) {
      return 0;
    }

    return (slotCount * 180) + ((slotCount - 1) * gap);
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

  private cancelRotationTimers() {
    if (this.rotateTimeoutId !== undefined) {
      window.clearTimeout(this.rotateTimeoutId);
      this.rotateTimeoutId = undefined;
    }

    if (this.finishTimeoutId !== undefined) {
      window.clearTimeout(this.finishTimeoutId);
      this.finishTimeoutId = undefined;
    }

    this.staggerTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    this.staggerTimeoutIds = [];
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
}

async function queryOrderedLogoItems(collectionId: string, limit: number) {
  const numberedPage = await items
    .query(collectionId)
    .isNotEmpty('sortNumber')
    .ascending('sortNumber')
    .limit(limit)
    .find();
  const numberedItems = sortLogoItems((numberedPage.items as LogoItem[]).filter(hasLogoSortNumber));

  if (numberedItems.length >= limit) {
    return numberedItems.slice(0, limit);
  }

  const emptyPage = await items
    .query(collectionId)
    .isEmpty('sortNumber')
    .limit(limit - numberedItems.length)
    .find();

  return [...numberedItems, ...(emptyPage.items as LogoItem[])].slice(0, limit);
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

function resolveImageUrl(url: string, config: RotatorConfig) {
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

function getLogoImageTransformSize(config: RotatorConfig): LogoImageTransformSize {
  if (config.useMobileValues || config.logoHeight <= 40) {
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
