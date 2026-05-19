import { items } from '@wix/data';

const DEFAULT_COLLECTION_ID = '@zider-ink/zider-loop-logo/database';
const WATERMARK_URL = 'https://static.wixstatic.com/shapes/46696d_df515679c6e04f618b508fb4336421f5.svg';

type LogoItem = {
  image?: unknown;
  title?: string;
  description?: string;
  link?: string;
  sortNumber?: number;
};

type LogoViewItem = {
  src: string;
  alt: string;
  link: string;
};

type LoopConfig = {
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

const FALLBACK_LOGOS: LogoViewItem[] = [
  { src: createTextLogo('Google', '#4285f4'), alt: 'Google', link: 'https://zider.ink/' },
  { src: createTextLogo('Microsoft', '#00a4ef'), alt: 'Microsoft', link: 'https://zider.ink/' },
  { src: createTextLogo('OpenAI', '#111111'), alt: 'OpenAI', link: 'https://zider.ink/' },
  { src: createTextLogo('duda', '#fb7c24'), alt: 'Duda', link: 'https://zider.ink/' },
  { src: createTextLogo('Claude', '#d97757'), alt: 'Claude', link: 'https://zider.ink/' },
];

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

  private logos: LogoViewItem[] = FALLBACK_LOGOS;
  private loadToken = 0;
  private renderToken = 0;
  private hasConnected = false;
  private animationFrameId?: number;
  private resizeObserver?: ResizeObserver;

  connectedCallback() {
    this.hasConnected = true;
    this.render();
    this.loadLogos();

    this.resizeObserver = new ResizeObserver(() => this.scheduleAnimation());
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.cancelScheduledAnimation();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this.hasConnected || oldValue === newValue) {
      return;
    }

    if (name === 'collection-id') {
      this.loadLogos();
      return;
    }

    this.render();
  }

  private async loadLogos() {
    const token = ++this.loadToken;

    try {
      const result = await items
        .query(this.collectionId)
        .ascending('sortNumber')
        .limit(100)
        .find({ consistentRead: true });

      if (token !== this.loadToken) {
        return;
      }

      const cmsLogos = result.items
        .map((item) => normalizeLogoItem(item as LogoItem))
        .filter((item): item is LogoViewItem => Boolean(item?.src));

      this.logos = cmsLogos.length > 0 ? cmsLogos : FALLBACK_LOGOS;
    } catch (error) {
      console.warn('[ZIDER LOGO LOOP] CMS query failed, using fallback logos.', error);
      this.logos = FALLBACK_LOGOS;
    }

    this.render();
  }

  private get collectionId() {
    return this.getAttribute('collection-id') || DEFAULT_COLLECTION_ID;
  }

  private get config(): LoopConfig {
    const useMobileValues =
      this.getBooleanAttr('enable-mobile-settings', false) &&
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches;

    return {
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
    const renderToken = ++this.renderToken;
    const config = this.config;
    const maskColor = config.hiddenMaskColor ? 'rgba(255,255,255,0)' : config.maskColor;
    const logoMarkup = this.logos.map((logo) => this.renderLogo(logo, config)).join('');

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
          will-change: transform;
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
      <div class="zider-logo-loop" data-gray-mode="${String(config.grayMode)}">
        <div class="zider-logo-track">${logoMarkup}</div>
        <a class="zider-watermark" href="https://zider.ink/" target="_blank" rel="noopener noreferrer" aria-label="Powered by ZIDER">
          <img src="${WATERMARK_URL}" alt="ZIDER" />
        </a>
      </div>
    `;

    this.bindInteractions(config);
    this.waitForImages().then(() => {
      if (renderToken === this.renderToken) {
        this.scheduleAnimation();
      }
    });
  }

  private renderLogo(logo: LogoViewItem, config: LoopConfig) {
    const tag = config.links && logo.link ? 'a' : 'span';
    const href = tag === 'a' ? ` href="${escapeAttr(logo.link)}" target="_blank" rel="noopener noreferrer"` : '';
    const cursor = tag === 'a' ? 'pointer' : 'default';

    return `
      <${tag} class="zider-logo-item" ${href}>
        <img class="zider-logo-image" src="${escapeAttr(logo.src)}" alt="${escapeAttr(logo.alt)}" style="cursor:${cursor};" />
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

  private async waitForImages() {
    const images = Array.from(this.querySelectorAll<HTMLImageElement>('.zider-logo-image'));

    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.onload = () => resolve();
            image.onerror = () => resolve();
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

    const config = this.config;
    track.style.animation = 'none';
    track.style.transform = 'translateX(0)';
    Array.from(track.querySelectorAll('[data-zider-clone="true"]')).forEach((clone) => clone.remove());

    const containerWidth = root.offsetWidth || window.innerWidth || 1000;
    const baseChildren = Array.from(track.children);
    const baseWidth = track.scrollWidth;
    let loopLimit = 10;

    if (baseWidth <= 0 || baseChildren.length === 0) {
      return;
    }

    while (track.scrollWidth < containerWidth + baseWidth && loopLimit > 0) {
      baseChildren.forEach((child) => {
        const clone = child.cloneNode(true) as HTMLElement;
        clone.setAttribute('data-zider-clone', 'true');
        track.appendChild(clone);
      });
      loopLimit -= 1;
    }

    const distance = Math.max(baseWidth, 1);
    const duration = Math.max(distance / Math.max(config.speed, 1), 6);

    track.style.setProperty('--zider-loop-distance', `${distance}px`);
    track.style.animationName = 'zider-logo-loop-slide';
    track.style.animationDuration = `${duration}s`;
    track.style.animationTimingFunction = 'linear';
    track.style.animationIterationCount = 'infinite';
    track.style.animationDirection = config.direction === 'right' ? 'reverse' : 'normal';
    track.style.animationPlayState = 'running';
  }

  private scheduleAnimation() {
    this.cancelScheduledAnimation();

    this.animationFrameId = window.requestAnimationFrame(() => {
      this.animationFrameId = undefined;
      this.startAnimation();
    });
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
  const src = resolveImageUrl(item.image);

  if (!src) {
    return null;
  }

  return {
    src,
    alt: item.title || item.description || 'Logo',
    link: item.link || '',
  };
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

function createTextLogo(text: string, color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="72" viewBox="0 0 240 72">
      <rect width="240" height="72" fill="none"/>
      <text x="120" y="46" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${color}">
        ${escapeHtml(text)}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
