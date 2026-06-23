import { items } from '@wix/data';
import { sortLogoItems } from '../../shared/logo-order';

const DEFAULT_COLLECTION_ID = '@zider-ink/zider-loop-logo/database';
const WATERMARK_URL = 'https://static.wixstatic.com/shapes/46696d_df515679c6e04f618b508fb4336421f5.svg';
const DISPLAY_LOGO_LIMIT = 50;
const INITIAL_RENDER_DELAY_MS = 120;
const INITIAL_IMAGE_READY_COUNT = 8;
const INITIAL_IMAGE_READY_TIMEOUT_MS = 800;
const LOGO_ITEMS_CACHE_TTL_MS = 60_000;
const PERSISTED_LOGO_ITEMS_CACHE_TTL_MS = 10 * 60_000;
const PERSISTED_LOGO_ITEMS_CACHE_PREFIX = 'zider-logo-wall-slider:items:v1';
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

type DirectionMode = 'alternate' | 'left' | 'right';
type StylePreset = 'soft-cards' | 'clean-enterprise' | 'borderless' | 'compact-wall' | 'showcase' | 'pill-cards';

type WallConfig = {
  useMobileValues: boolean;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  logoHeight: number;
  gap: number;
  rowGap: number;
  cardRadius: number;
  backgroundRadius: number;
  backgroundBorderWidth: number;
  backgroundBorderColor: string;
  cardBorderWidth: number;
  speed: number;
  directionMode: DirectionMode;
  pauseOnHover: boolean;
  backgroundColor: string;
  cardColor: string;
  borderColor: string;
  highlightColor: string;
  hiddenMaskColor: boolean;
  maskColor: string;
  showBorder: boolean;
  showShadow: boolean;
  links: boolean;
  grayMode: boolean;
  hideWatermark: boolean;
};

type WallPresetConfig = {
  rows: number;
  cardWidth: number;
  cardHeight: number;
  logoHeight: number;
  gap: number;
  rowGap: number;
  cardRadius: number;
  backgroundRadius: number;
  backgroundBorderWidth: number;
  backgroundBorderColor: string;
  cardBorderWidth: number;
  speed: number;
  mobileRows: number;
  mobileCardWidth: number;
  mobileCardHeight: number;
  mobileLogoHeight: number;
  mobileGap: number;
  mobileRowGap: number;
  mobileSpeed: number;
  backgroundColor: string;
  cardColor: string;
  borderColor: string;
  highlightColor: string;
  hiddenMaskColor: boolean;
  maskColor: string;
  showBorder: boolean;
  showShadow: boolean;
};

type LogoImageTransformSize = {
  width: number;
  height: number;
};

export default class ZiderLogoWallSlider extends HTMLElement {
  static get observedAttributes() {
    return [
      'rows',
      'style-preset',
      'card-width',
      'card-height',
      'logo-height',
      'gap',
      'row-gap',
      'card-radius',
      'background-radius',
      'background-border-width',
      'background-border-color',
      'card-border-width',
      'speed',
      'direction-mode',
      'pause-on-hover',
      'background-color',
      'card-color',
      'border-color',
      'highlight-color',
      'hidden-mask-color',
      'mask-color',
      'show-border',
      'show-shadow',
      'links',
      'gray-mode',
      'enable-mobile-settings',
      'mobile-rows',
      'mobile-card-width',
      'mobile-card-height',
      'mobile-logo-height',
      'mobile-gap',
      'mobile-row-gap',
      'mobile-speed',
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
    const config = this.config;

    this.applyHostSize(config);
    this.renderSkeleton(config);
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
      this.applyHostSize(this.config);
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
        console.warn('[ZIDER LOGO WALL SLIDER] CMS query failed, leaving logo list empty.', error);
        this.logos = [];
        this.hasLoadedLogos = true;

        if (this.hasConnected) {
          this.queueRender();
        }
      }
    }
  }

  private applyLogoItems(token: number, cmsItems: LogoItem[]) {
    if (token !== this.loadToken) {
      return;
    }

    this.logos = cmsItems
      .map((item) => normalizeLogoItem(item))
      .filter((item): item is LogoViewItem => Boolean(item?.imageSource));
    this.hasLoadedLogos = true;

    if (this.hasConnected) {
      this.queueRender();
    }
  }

  private get collectionId() {
    return this.getAttribute('collection-id') || DEFAULT_COLLECTION_ID;
  }

  private get config(): WallConfig {
    const useMobileValues = this.shouldUseMobileValues();
    const preset = getPresetConfig(this.getStylePresetAttr());
    const legacyShowBorder = this.getBooleanAttr('show-border', preset.showBorder);

    return {
      useMobileValues,
      rows: this.getNumberAttr(useMobileValues ? 'mobile-rows' : 'rows', useMobileValues ? preset.mobileRows : preset.rows, 1, 4),
      cardWidth: this.getNumberAttr(useMobileValues ? 'mobile-card-width' : 'card-width', useMobileValues ? preset.mobileCardWidth : preset.cardWidth, 76, 280),
      cardHeight: this.getNumberAttr(useMobileValues ? 'mobile-card-height' : 'card-height', useMobileValues ? preset.mobileCardHeight : preset.cardHeight, 44, 150),
      logoHeight: this.getNumberAttr(useMobileValues ? 'mobile-logo-height' : 'logo-height', useMobileValues ? preset.mobileLogoHeight : preset.logoHeight, 20, 110),
      gap: this.getNumberAttr(useMobileValues ? 'mobile-gap' : 'gap', useMobileValues ? preset.mobileGap : preset.gap, 6, 80),
      rowGap: this.getNumberAttr(useMobileValues ? 'mobile-row-gap' : 'row-gap', useMobileValues ? preset.mobileRowGap : preset.rowGap, 6, 80),
      cardRadius: this.getNumberAttr('card-radius', preset.cardRadius, 0, 60),
      backgroundRadius: this.getNumberAttr('background-radius', preset.backgroundRadius, 0, 80),
      backgroundBorderWidth: this.getNumberAttr('background-border-width', preset.backgroundBorderWidth, 0, 12),
      backgroundBorderColor: sanitizeColor(this.getAttribute('background-border-color') || preset.backgroundBorderColor),
      cardBorderWidth: this.getNumberAttr('card-border-width', legacyShowBorder ? preset.cardBorderWidth : 0, 0, 12),
      speed: this.getNumberAttr(useMobileValues ? 'mobile-speed' : 'speed', useMobileValues ? preset.mobileSpeed : preset.speed, 8, 160),
      directionMode: this.getDirectionModeAttr(),
      pauseOnHover: this.getBooleanAttr('pause-on-hover', true),
      backgroundColor: sanitizeColor(this.getAttribute('background-color') || preset.backgroundColor),
      cardColor: sanitizeColor(this.getAttribute('card-color') || preset.cardColor),
      borderColor: sanitizeColor(this.getAttribute('border-color') || preset.borderColor),
      highlightColor: sanitizeColor(this.getAttribute('highlight-color') || preset.highlightColor),
      hiddenMaskColor: this.getBooleanAttr('hidden-mask-color', preset.hiddenMaskColor),
      maskColor: sanitizeColor(this.getAttribute('mask-color') || preset.maskColor),
      showBorder: legacyShowBorder,
      showShadow: this.getBooleanAttr('show-shadow', preset.showShadow),
      links: this.getBooleanAttr('links', true),
      grayMode: this.getBooleanAttr('gray-mode', false),
      hideWatermark: this.getBooleanAttr('hide-watermark', false),
    };
  }

  private renderSkeleton(config: WallConfig) {
    this.applyHostSize(config);

    const skeletonRows = Array.from({ length: config.rows }, (_, rowIndex) => `
      <div class="zider-skeleton-row" style="transform: translateX(${rowIndex % 2 === 0 ? '0' : `-${Math.round(config.cardWidth / 2)}px`});">
        ${Array.from({ length: 6 }, () => '<span class="zider-skeleton-card"><span></span></span>').join('')}
      </div>
    `).join('');
    const maskColor = config.hiddenMaskColor ? 'rgba(255,255,255,0)' : config.maskColor;

    this.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          min-width: 180px;
          min-height: ${this.getHostHeight(config)}px;
          box-sizing: border-box;
        }

        .zider-logo-wall-loading {
          --zider-wall-card-width: ${config.cardWidth}px;
          --zider-wall-card-height: ${config.cardHeight}px;
          --zider-wall-gap: ${config.gap}px;
          --zider-wall-row-gap: ${config.rowGap}px;
          --zider-wall-radius: ${config.cardRadius}px;
          --zider-wall-background-radius: ${config.backgroundRadius}px;
          --zider-wall-background-border-width: ${config.backgroundBorderWidth}px;
          --zider-wall-background-border: ${config.backgroundBorderColor};
          --zider-wall-card-border-width: ${config.cardBorderWidth}px;
          --zider-wall-background: ${config.backgroundColor};
          --zider-wall-card: ${config.cardColor};
          --zider-wall-border: ${config.borderColor};
          --zider-wall-mask: ${maskColor};
          position: relative;
          width: 100%;
          height: 100%;
          min-height: ${this.getHostHeight(config)}px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: var(--zider-wall-row-gap);
          overflow: hidden;
          box-sizing: border-box;
          padding: ${getVerticalPadding(config)}px 0;
          border: ${config.backgroundBorderWidth > 0 ? 'var(--zider-wall-background-border-width) solid var(--zider-wall-background-border)' : '0'};
          border-radius: var(--zider-wall-background-radius);
          background: var(--zider-wall-background);
          animation: zider-wall-fade-in 220ms ease both;
        }

        .zider-logo-wall-loading::before,
        .zider-logo-wall-loading::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: min(56px, 8vw);
          z-index: 2;
          pointer-events: none;
        }

        .zider-logo-wall-loading::before {
          left: 0;
          background: linear-gradient(to right, var(--zider-wall-mask), rgba(255,255,255,0));
        }

        .zider-logo-wall-loading::after {
          right: 0;
          background: linear-gradient(to left, var(--zider-wall-mask), rgba(255,255,255,0));
        }

        .zider-skeleton-row {
          display: flex;
          align-items: center;
          gap: var(--zider-wall-gap);
          height: var(--zider-wall-card-height);
          flex: 0 0 var(--zider-wall-card-height);
        }

        .zider-skeleton-card {
          position: relative;
          flex: 0 0 var(--zider-wall-card-width);
          width: var(--zider-wall-card-width);
          height: var(--zider-wall-card-height);
          border-radius: var(--zider-wall-radius);
          background: var(--zider-wall-card);
          border: ${config.showBorder && config.cardBorderWidth > 0 ? 'var(--zider-wall-card-border-width) solid var(--zider-wall-border)' : '0'};
          box-shadow: ${config.showShadow ? '0 4px 14px rgba(15, 23, 52, 0.035)' : 'none'};
          overflow: hidden;
          opacity: 0.72;
        }

        .zider-skeleton-card::before {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.58), rgba(255,255,255,0));
          animation: zider-wall-skeleton-shimmer 1.35s ease-in-out infinite;
        }

        .zider-skeleton-card span {
          position: absolute;
          left: 20%;
          right: 20%;
          top: 50%;
          height: max(6px, calc(var(--zider-wall-card-height) * 0.12));
          border-radius: 999px;
          transform: translateY(-50%);
          background: rgba(127, 139, 160, 0.18);
        }

        @keyframes zider-wall-skeleton-shimmer {
          to { transform: translateX(100%); }
        }

        @keyframes zider-wall-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      </style>
      <div class="zider-logo-wall-loading" aria-hidden="true">
        ${skeletonRows}
      </div>
    `;
  }

  private render() {
    this.cancelQueuedRender();
    this.hasRendered = true;

    const renderToken = ++this.renderToken;
    this.readyRenderToken = 0;
    const config = this.config;
    this.renderedUsesMobileValues = config.useMobileValues;
    this.applyHostSize(config);

    const rows = distributeLogos(this.logos, config.rows);
    const rowMarkup = rows
      .map((row, rowIndex) => this.renderRow(row, rowIndex, config))
      .join('');
    const maskColor = config.hiddenMaskColor ? 'rgba(255,255,255,0)' : config.maskColor;

    this.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          min-width: 180px;
          min-height: ${this.getHostHeight(config)}px;
          box-sizing: border-box;
        }

        .zider-logo-wall {
          --zider-wall-card-width: ${config.cardWidth}px;
          --zider-wall-card-height: ${config.cardHeight}px;
          --zider-wall-logo-height: ${Math.min(config.logoHeight, config.cardHeight - 20)}px;
          --zider-wall-gap: ${config.gap}px;
          --zider-wall-row-gap: ${config.rowGap}px;
          --zider-wall-radius: ${config.cardRadius}px;
          --zider-wall-background-radius: ${config.backgroundRadius}px;
          --zider-wall-background-border-width: ${config.backgroundBorderWidth}px;
          --zider-wall-background-border: ${config.backgroundBorderColor};
          --zider-wall-card-border-width: ${config.cardBorderWidth}px;
          --zider-wall-background: ${config.backgroundColor};
          --zider-wall-card: ${config.cardColor};
          --zider-wall-border: ${config.borderColor};
          --zider-wall-highlight: ${config.highlightColor};
          --zider-wall-mask: ${maskColor};
          position: relative;
          width: 100%;
          height: 100%;
          min-height: ${this.getHostHeight(config)}px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: var(--zider-wall-row-gap);
          overflow: hidden;
          box-sizing: border-box;
          padding: ${getVerticalPadding(config)}px 0;
          border: ${config.backgroundBorderWidth > 0 ? 'var(--zider-wall-background-border-width) solid var(--zider-wall-background-border)' : '0'};
          border-radius: var(--zider-wall-background-radius);
          background: var(--zider-wall-background);
          isolation: isolate;
          animation: zider-wall-fade-in 220ms ease both;
        }

        .zider-logo-wall::before,
        .zider-logo-wall::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: min(56px, 8vw);
          z-index: 3;
          pointer-events: none;
        }

        .zider-logo-wall::before {
          left: 0;
          background: linear-gradient(to right, var(--zider-wall-mask), rgba(255,255,255,0));
        }

        .zider-logo-wall::after {
          right: 0;
          background: linear-gradient(to left, var(--zider-wall-mask), rgba(255,255,255,0));
        }

        .zider-wall-row {
          position: relative;
          width: 100%;
          height: var(--zider-wall-card-height);
          overflow: visible;
          flex: 0 0 var(--zider-wall-card-height);
        }

        .zider-wall-track {
          display: flex;
          align-items: center;
          gap: var(--zider-wall-gap);
          width: max-content;
          height: 100%;
          opacity: 0;
          will-change: transform;
          transition: opacity 140ms ease;
        }

        .zider-logo-wall[data-ready="true"] .zider-wall-track {
          opacity: 1;
        }

        .zider-wall-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 var(--zider-wall-card-width);
          width: var(--zider-wall-card-width);
          height: var(--zider-wall-card-height);
          border: ${config.showBorder && config.cardBorderWidth > 0 ? 'var(--zider-wall-card-border-width) solid var(--zider-wall-border)' : '0'};
          border-radius: var(--zider-wall-radius);
          background: var(--zider-wall-card);
          box-shadow: ${config.showShadow ? '0 4px 14px rgba(15, 23, 52, 0.04)' : 'none'};
          box-sizing: border-box;
          overflow: hidden;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .zider-wall-card:hover {
          transform: translateY(-2px);
          border-color: var(--zider-wall-highlight);
          box-shadow: ${config.showShadow ? '0 6px 18px rgba(15, 23, 52, 0.055)' : 'none'};
        }

        .zider-wall-image {
          display: block;
          width: auto;
          max-width: calc(var(--zider-wall-card-width) - 28px);
          max-height: var(--zider-wall-logo-height);
          height: auto;
          object-fit: contain;
          transition: filter 180ms ease, opacity 180ms ease;
        }

        .zider-logo-wall[data-gray-mode="true"] .zider-wall-image {
          filter: grayscale(100%);
        }

        .zider-logo-wall[data-gray-mode="true"] .zider-wall-card:hover .zider-wall-image {
          filter: grayscale(0%);
        }

        .zider-wall-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: ${Math.max(config.cardHeight, 72)}px;
          color: #7f8ba0;
          font-size: 14px;
        }

        .zider-watermark {
          position: absolute;
          right: 12px;
          bottom: 8px;
          z-index: 4;
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

        @keyframes zider-wall-slide {
          from { transform: translateX(0); }
          to { transform: translateX(calc(var(--zider-wall-distance, 0px) * -1)); }
        }

        @keyframes zider-wall-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      </style>
      <div class="zider-logo-wall" data-ready="false" data-gray-mode="${String(config.grayMode)}">
        ${rowMarkup || '<div class="zider-wall-empty">Add logos from the Zider dashboard.</div>'}
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
  }

  private renderRow(row: LogoViewItem[], rowIndex: number, config: WallConfig) {
    const direction = getRowDirection(rowIndex, config.directionMode);
    const logos = row.length > 0 ? row : this.logos;
    const markup = logos
      .map((logo, logoIndex) => this.renderLogo(logo, config, rowIndex * INITIAL_IMAGE_READY_COUNT + logoIndex))
      .join('');

    return `
      <div class="zider-wall-row" data-direction="${direction}">
        <div class="zider-wall-track">${markup}</div>
      </div>
    `;
  }

  private renderLogo(logo: LogoViewItem, config: WallConfig, index: number) {
    const tag = config.links && logo.link ? 'a' : 'span';
    const href = tag === 'a' ? ` href="${escapeAttr(logo.link)}" target="_blank" rel="noopener noreferrer"` : '';
    const fetchPriority = index < INITIAL_IMAGE_READY_COUNT ? 'high' : 'low';
    const loading = index < INITIAL_IMAGE_READY_COUNT ? 'eager' : 'lazy';
    const src = resolveImageUrl(logo.imageSource, config);

    return `
      <${tag} class="zider-wall-card"${href}>
        <img class="zider-wall-image" src="${escapeAttr(src)}" alt="${escapeAttr(logo.alt)}" decoding="async" loading="${loading}" fetchpriority="${fetchPriority}" />
      </${tag}>
    `;
  }

  private bindInteractions(config: WallConfig) {
    const root = this.querySelector<HTMLElement>('.zider-logo-wall');
    const tracks = Array.from(this.querySelectorAll<HTMLElement>('.zider-wall-track'));

    if (!root) {
      return;
    }

    root.onmouseenter = config.pauseOnHover ? () => tracks.forEach((track) => (track.style.animationPlayState = 'paused')) : null;
    root.onmouseleave = config.pauseOnHover ? () => tracks.forEach((track) => (track.style.animationPlayState = 'running')) : null;
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

  private async waitForInitialImages() {
    const images = Array.from(this.querySelectorAll<HTMLImageElement>('.zider-wall-image'));
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
    const root = this.querySelector<HTMLElement>('.zider-logo-wall');
    const rows = Array.from(this.querySelectorAll<HTMLElement>('.zider-wall-row'));

    if (!root || rows.length === 0 || this.readyRenderToken !== this.renderToken) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    rows.forEach((row) => this.startRowAnimation(row, reducedMotion));
    root.dataset.ready = 'true';
  }

  private startRowAnimation(row: HTMLElement, reducedMotion: boolean) {
    const track = row.querySelector<HTMLElement>('.zider-wall-track');

    if (!track || track.children.length === 0) {
      return;
    }

    track.style.animation = 'none';
    track.style.transform = 'translateX(0)';
    Array.from(track.querySelectorAll('[data-zider-clone="true"]')).forEach((clone) => clone.remove());

    if (reducedMotion) {
      return;
    }

    const config = this.config;
    const containerWidth = row.offsetWidth || window.innerWidth || 1000;
    const baseChildren = Array.from(track.children);
    const baseWidth = track.scrollWidth;

    if (baseWidth <= 0 || baseChildren.length === 0) {
      return;
    }

    const cloneCycles = Math.max(Math.ceil(containerWidth / baseWidth), 1);
    const maxCloneCount = baseChildren.length * Math.max(cloneCycles + 2, 3);
    const fragment = document.createDocumentFragment();
    const cloneCount = Math.min(cloneCycles * baseChildren.length, maxCloneCount);

    for (let index = 0; index < cloneCount; index += 1) {
      const child = baseChildren[index % baseChildren.length];
      const clone = child.cloneNode(true) as HTMLElement;

      clone.setAttribute('data-zider-clone', 'true');
      fragment.appendChild(clone);
    }

    track.appendChild(fragment);

    const direction = row.dataset.direction === 'right' ? 'right' : 'left';
    const distance = Math.max(baseWidth + config.gap, 1);
    const duration = Math.max(distance / Math.max(config.speed, 1), 8);

    track.style.setProperty('--zider-wall-distance', `${distance}px`);
    track.style.animationName = 'zider-wall-slide';
    track.style.animationDuration = `${duration}s`;
    track.style.animationTimingFunction = 'linear';
    track.style.animationIterationCount = 'infinite';
    track.style.animationDirection = direction === 'right' ? 'reverse' : 'normal';
    track.style.animationPlayState = 'running';
  }

  private applyHostSize(config: WallConfig) {
    const heightValue = `${this.getHostHeight(config)}px`;

    this.style.display = 'block';
    this.style.removeProperty('width');
    this.style.maxWidth = '100%';
    this.style.minWidth = '180px';
    this.style.height = heightValue;
    this.style.minHeight = heightValue;
    this.style.boxSizing = 'border-box';
    this.style.overflow = 'hidden';
  }

  private getHostHeight(config: WallConfig) {
    return (config.rows * config.cardHeight) + ((config.rows - 1) * config.rowGap) + (getVerticalPadding(config) * 2);
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

  private getNumberAttr(name: string, fallback: number, min = 1, max = Number.POSITIVE_INFINITY) {
    const rawValue = this.getAttribute(name);
    const value = rawValue ? Number.parseFloat(rawValue.replace(/[^0-9.]/g, '')) : Number.NaN;

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, value));
  }

  private getBooleanAttr(name: string, fallback: boolean) {
    const value = this.getAttribute(name);

    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    return value !== 'false';
  }

  private getDirectionModeAttr(): DirectionMode {
    const value = this.getAttribute('direction-mode');

    return value === 'left' || value === 'right' ? value : 'alternate';
  }

  private getStylePresetAttr(): StylePreset {
    const value = this.getAttribute('style-preset');

    if (
      value === 'clean-enterprise' ||
      value === 'borderless' ||
      value === 'compact-wall' ||
      value === 'showcase' ||
      value === 'pill-cards'
    ) {
      return value;
    }

    return 'soft-cards';
  }
}

const WALL_PRESETS: Record<StylePreset, WallPresetConfig> = {
  'soft-cards': {
    rows: 2,
    cardWidth: 170,
    cardHeight: 86,
    logoHeight: 44,
    gap: 22,
    rowGap: 18,
    cardRadius: 16,
    backgroundRadius: 32,
    backgroundBorderWidth: 0,
    backgroundBorderColor: '#ece7d8',
    cardBorderWidth: 1,
    speed: 38,
    mobileRows: 3,
    mobileCardWidth: 112,
    mobileCardHeight: 62,
    mobileLogoHeight: 30,
    mobileGap: 10,
    mobileRowGap: 10,
    mobileSpeed: 32,
    backgroundColor: 'rgba(255,255,255,0)',
    cardColor: '#ffffff',
    borderColor: '#ece7d8',
    highlightColor: '#ffd95a',
    hiddenMaskColor: true,
    maskColor: 'rgba(255,255,255,0)',
    showBorder: true,
    showShadow: true,
  },
  'clean-enterprise': {
    rows: 2,
    cardWidth: 176,
    cardHeight: 84,
    logoHeight: 44,
    gap: 18,
    rowGap: 16,
    cardRadius: 10,
    backgroundRadius: 24,
    backgroundBorderWidth: 1,
    backgroundBorderColor: '#e4e9f1',
    cardBorderWidth: 1,
    speed: 36,
    mobileRows: 3,
    mobileCardWidth: 112,
    mobileCardHeight: 60,
    mobileLogoHeight: 30,
    mobileGap: 10,
    mobileRowGap: 10,
    mobileSpeed: 30,
    backgroundColor: '#ffffff',
    cardColor: '#ffffff',
    borderColor: '#e4e9f1',
    highlightColor: '#116dff',
    hiddenMaskColor: true,
    maskColor: 'rgba(255,255,255,0)',
    showBorder: true,
    showShadow: false,
  },
  borderless: {
    rows: 2,
    cardWidth: 168,
    cardHeight: 78,
    logoHeight: 46,
    gap: 24,
    rowGap: 16,
    cardRadius: 0,
    backgroundRadius: 0,
    backgroundBorderWidth: 0,
    backgroundBorderColor: 'transparent',
    cardBorderWidth: 0,
    speed: 42,
    mobileRows: 3,
    mobileCardWidth: 100,
    mobileCardHeight: 50,
    mobileLogoHeight: 28,
    mobileGap: 12,
    mobileRowGap: 10,
    mobileSpeed: 34,
    backgroundColor: 'rgba(255,255,255,0)',
    cardColor: 'rgba(255,255,255,0)',
    borderColor: 'rgba(255,255,255,0)',
    highlightColor: '#116dff',
    hiddenMaskColor: true,
    maskColor: 'rgba(255,255,255,0)',
    showBorder: false,
    showShadow: false,
  },
  'compact-wall': {
    rows: 3,
    cardWidth: 144,
    cardHeight: 70,
    logoHeight: 36,
    gap: 14,
    rowGap: 12,
    cardRadius: 12,
    backgroundRadius: 24,
    backgroundBorderWidth: 0,
    backgroundBorderColor: '#e5eaf1',
    cardBorderWidth: 1,
    speed: 34,
    mobileRows: 3,
    mobileCardWidth: 96,
    mobileCardHeight: 50,
    mobileLogoHeight: 26,
    mobileGap: 8,
    mobileRowGap: 8,
    mobileSpeed: 30,
    backgroundColor: '#ffffff',
    cardColor: '#ffffff',
    borderColor: '#e5eaf1',
    highlightColor: '#54a6ff',
    hiddenMaskColor: true,
    maskColor: 'rgba(255,255,255,0)',
    showBorder: true,
    showShadow: true,
  },
  showcase: {
    rows: 2,
    cardWidth: 192,
    cardHeight: 96,
    logoHeight: 52,
    gap: 22,
    rowGap: 18,
    cardRadius: 14,
    backgroundRadius: 30,
    backgroundBorderWidth: 1,
    backgroundBorderColor: '#e8edf4',
    cardBorderWidth: 1,
    speed: 34,
    mobileRows: 2,
    mobileCardWidth: 126,
    mobileCardHeight: 70,
    mobileLogoHeight: 36,
    mobileGap: 12,
    mobileRowGap: 12,
    mobileSpeed: 30,
    backgroundColor: '#ffffff',
    cardColor: '#ffffff',
    borderColor: '#e8edf4',
    highlightColor: '#116dff',
    hiddenMaskColor: true,
    maskColor: 'rgba(255,255,255,0)',
    showBorder: true,
    showShadow: true,
  },
  'pill-cards': {
    rows: 2,
    cardWidth: 152,
    cardHeight: 68,
    logoHeight: 36,
    gap: 16,
    rowGap: 14,
    cardRadius: 34,
    backgroundRadius: 28,
    backgroundBorderWidth: 0,
    backgroundBorderColor: '#e8edf4',
    cardBorderWidth: 1,
    speed: 42,
    mobileRows: 3,
    mobileCardWidth: 104,
    mobileCardHeight: 54,
    mobileLogoHeight: 28,
    mobileGap: 8,
    mobileRowGap: 8,
    mobileSpeed: 34,
    backgroundColor: '#ffffff',
    cardColor: '#ffffff',
    borderColor: '#e8edf4',
    highlightColor: '#ffbf2e',
    hiddenMaskColor: true,
    maskColor: 'rgba(255,255,255,0)',
    showBorder: true,
    showShadow: false,
  },
};

function getPresetConfig(preset: StylePreset) {
  return WALL_PRESETS[preset] ?? WALL_PRESETS['soft-cards'];
}

function distributeLogos(logos: LogoViewItem[], rowCount: number) {
  const rows = Array.from({ length: Math.max(rowCount, 1) }, () => [] as LogoViewItem[]);

  logos.forEach((logo, index) => {
    rows[index % rows.length].push(logo);
  });

  return rows.filter((row) => row.length > 0);
}

function getRowDirection(rowIndex: number, directionMode: DirectionMode) {
  if (directionMode === 'left' || directionMode === 'right') {
    return directionMode;
  }

  return rowIndex % 2 === 0 ? 'left' : 'right';
}

function getVerticalPadding(config: WallConfig) {
  return Math.max(14, Math.min(28, Math.round(config.cardHeight * 0.28)));
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

function resolveImageUrl(url: string, config: WallConfig) {
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

function getLogoImageTransformSize(config: WallConfig): LogoImageTransformSize {
  const scale = config.useMobileValues ? 2 : 3;

  return {
    width: Math.max(Math.round(config.cardWidth * scale), 320),
    height: Math.max(Math.round(config.cardHeight * scale), 160),
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

  if (trimmedValue === 'transparent') {
    return trimmedValue;
  }

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
