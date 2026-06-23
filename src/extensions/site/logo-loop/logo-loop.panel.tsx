import React, { type ChangeEvent, type FC, useCallback, useEffect, useState } from 'react';
import { application, info, widget } from '@wix/editor';
import {
  SidePanel,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

type SettingsState = {
  speed: string;
  gap: string;
  logoHeight: string;
  direction: 'left' | 'right';
  pauseOnHover: boolean;
  links: boolean;
  grayMode: boolean;
  hiddenMaskColor: boolean;
  maskColor: string;
  enableMobileSettings: boolean;
  mobileSpeed: string;
  mobileGap: string;
  mobileLogoHeight: string;
  hideWatermark: boolean;
};

type PlanStatus = 'loading' | 'premium' | 'free' | 'unknown';
type EditorDevice = 'desktop' | 'mobile';

const APP_ID = 'f1615a5b-65ed-4121-ae57-f2194f350030';
const PREMIUM_PLAN_ID = 'plus';
const TRANSPARENT_COLOR = 'transparent';

const defaults: SettingsState = {
  speed: '60',
  gap: '40',
  logoHeight: '50',
  direction: 'left',
  pauseOnHover: true,
  links: true,
  grayMode: false,
  hiddenMaskColor: true,
  maskColor: '#ffffff',
  enableMobileSettings: false,
  mobileSpeed: '45',
  mobileGap: '28',
  mobileLogoHeight: '40',
  hideWatermark: false,
};

const propMap = {
  speed: 'speed',
  gap: 'gap',
  logoHeight: 'logo-height',
  direction: 'direction',
  pauseOnHover: 'pause-on-hover',
  links: 'links',
  grayMode: 'gray-mode',
  hiddenMaskColor: 'hidden-mask-color',
  maskColor: 'mask-color',
  enableMobileSettings: 'enable-mobile-settings',
  mobileSpeed: 'mobile-speed',
  mobileGap: 'mobile-gap',
  mobileLogoHeight: 'mobile-logo-height',
  hideWatermark: 'hide-watermark',
} as const satisfies Record<keyof SettingsState, string>;

const Panel: FC = () => {
  const [settings, setSettings] = useState<SettingsState>(defaults);
  const [helpOpen, setHelpOpen] = useState(false);
  const [planStatus, setPlanStatus] = useState<PlanStatus>('loading');
  const [upgradeUrl, setUpgradeUrl] = useState(`https://www.wix.com/apps/upgrade/${APP_ID}`);
  const [dashboardUrl, setDashboardUrl] = useState(`https://www.wix.com/my-account/app/${APP_ID}`);
  const [editorDevice, setEditorDevice] = useState<EditorDevice>('desktop');

  useEffect(() => {
    let mounted = true;

    Promise.all(
      Object.entries(propMap).map(async ([stateKey, propName]) => {
        const value = await widget.getProp(propName);
        return [stateKey, value] as const;
      }),
    )
      .then((entries) => {
        if (!mounted) {
          return;
        }

        setSettings((current) => {
          const next = { ...current };

          entries.forEach(([stateKey, value]) => {
            if (value === undefined || value === null || value === '') {
              return;
            }

            (next as Record<string, unknown>)[stateKey] = normalizePropValue(
              stateKey as keyof SettingsState,
              value,
            );
          });

          return next;
        });
      })
      .catch((error) => console.error('[ZIDER LOGO LOOP] Failed to load widget settings.', error));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const updateEditorDevice = async () => {
      const nextDevice = await resolveEditorDevice();

      if (mounted) {
        setEditorDevice(nextDevice);
      }
    };

    void updateEditorDevice();
    const intervalId = window.setInterval(updateEditorDevice, 1000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    application
      .getAppInstance()
      .then((instance) => {
        if (!mounted) {
          return;
        }

        const appInstance = decodeAppInstance(instance);
        const vendorProductId = String(appInstance.vendorProductId || '').toLowerCase();
        const isPremium = vendorProductId === PREMIUM_PLAN_ID;

        setPlanStatus(isPremium ? 'premium' : 'free');
        setUpgradeUrl(createUpgradeUrl(appInstance));
        setDashboardUrl(createDashboardUrl(appInstance));

        if (!isPremium) {
          lockPaidSettings();
        }
      })
      .catch((error) => {
        console.warn('[ZIDER LOGO LOOP] Failed to resolve app plan.', error);

        if (mounted) {
          setPlanStatus('unknown');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setSetting = useCallback(<Key extends keyof SettingsState>(key: Key, value: SettingsState[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    widget.setProp(propMap[key], String(value));
  }, []);

  const setMobileSetting = useCallback(<Key extends 'mobileLogoHeight' | 'mobileGap' | 'mobileSpeed'>(
    key: Key,
    value: SettingsState[Key],
  ) => {
    setSettings((current) => ({ ...current, enableMobileSettings: true, [key]: value }));
    widget.setProp(propMap.enableMobileSettings, 'true');
    widget.setProp(propMap[key], String(value));
  }, []);

  const lockPaidSettings = useCallback(() => {
    setSettings((current) => ({
      ...current,
      hideWatermark: false,
    }));

    widget.setProp(propMap.hideWatermark, 'false');
  }, []);

  const openUpgrade = useCallback(() => {
    window.open(upgradeUrl, '_blank', 'noopener,noreferrer');
  }, [upgradeUrl]);

  const openDashboard = useCallback(() => {
    window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
  }, [dashboardUrl]);

  const isPremium = planStatus === 'premium';
  const paidControlsDisabled = !isPremium;
  const hideWatermarkValue = isPremium && settings.hideWatermark;
  const enableMobileSettingsValue = settings.enableMobileSettings;
  const mobileControlsDisabled = !enableMobileSettingsValue;
  const isMobileEditor = editorDevice === 'mobile';
  const layoutTitle = isMobileEditor ? 'Mobile Layout' : 'Layout';
  const motionTitle = isMobileEditor ? 'Mobile Motion' : 'Motion';
  const logoHeightValue = isMobileEditor ? settings.mobileLogoHeight : settings.logoHeight;
  const logoGapValue = isMobileEditor ? settings.mobileGap : settings.gap;
  const speedValue = isMobileEditor ? settings.mobileSpeed : settings.speed;
  const setLogoHeight = isMobileEditor
    ? (value: string) => setMobileSetting('mobileLogoHeight', value)
    : (value: string) => setSetting('logoHeight', value);
  const setLogoGap = isMobileEditor
    ? (value: string) => setMobileSetting('mobileGap', value)
    : (value: string) => setSetting('gap', value);
  const setSpeed = isMobileEditor
    ? (value: string) => setMobileSetting('mobileSpeed', value)
    : (value: string) => setSetting('speed', value);

  return (
    <WixDesignSystemProvider>
      <SidePanel width="300" height="100vh">
        <SidePanel.Content noPadding stretchVertically>
          <div style={styles.panel}>
            <PanelSection title="Content">
              <button type="button" style={styles.manageButton} onClick={openDashboard}>
                Manage Logos
              </button>
              <p style={styles.descriptionText}>
                Open the dashboard to add, edit, or reorder logo records.
              </p>
            </PanelSection>

            <PanelSection title={layoutTitle}>
              <RangeField
                label={isMobileEditor ? 'Mobile logo height' : 'Logo height'}
                value={logoHeightValue}
                suffix="px"
                min={isMobileEditor ? 20 : 24}
                max={isMobileEditor ? 96 : 120}
                onChange={setLogoHeight}
              />
              <RangeField
                label={isMobileEditor ? 'Mobile logo gap' : 'Logo gap'}
                value={logoGapValue}
                suffix="px"
                min={8}
                max={isMobileEditor ? 96 : 120}
                onChange={setLogoGap}
              />
            </PanelSection>

            <PanelSection title={motionTitle}>
              <RangeField
                label={isMobileEditor ? 'Mobile speed' : 'Speed'}
                value={speedValue}
                min={10}
                max={isMobileEditor ? 160 : 180}
                onChange={setSpeed}
              />
              <SegmentedField
                label="Direction"
                value={settings.direction}
                options={[
                  { label: 'Left', value: 'left' },
                  { label: 'Right', value: 'right' },
                ]}
                onChange={(value) => setSetting('direction', value)}
              />
              <ToggleRow
                label="Pause on hover"
                checked={settings.pauseOnHover}
                onChange={(checked) => setSetting('pauseOnHover', checked)}
              />
            </PanelSection>

            <PanelSection title="Behavior">
              <ToggleRow
                label="Enable Clickable Links"
                checked={settings.links}
                onChange={(checked) => setSetting('links', checked)}
              />
              <ToggleRow
                label="Gray Mode (Hover to Color)"
                checked={settings.grayMode}
                onChange={(checked) => setSetting('grayMode', checked)}
              />
              <p style={styles.descriptionText}>
                Convert all logos to grayscale by default. They will return to full color when hovered.
              </p>
              <ToggleRow
                label="Hidden Edge Fade Color"
                checked={settings.hiddenMaskColor}
                onChange={(checked) => setSetting('hiddenMaskColor', checked)}
              />
              <p style={styles.descriptionText}>
                The color used for the fading effect on both edges.
              </p>

              <ColorField
                label="Edge Fade Color"
                value={settings.maskColor}
                disabled={settings.hiddenMaskColor}
                onChange={(value) => setSetting('maskColor', value)}
              />
            </PanelSection>

            <PanelSection title="Branding" alignTitle="center">
              {isPremium ? null : (
                <button type="button" style={styles.upgradeButton} onClick={openUpgrade}>
                  Upgrade to hide badge
                </button>
              )}
              <ToggleRow
                label="Hidden Zider badge"
                checked={hideWatermarkValue}
                disabled={paidControlsDisabled}
                onChange={(checked) => setSetting('hideWatermark', checked)}
              />
              <p style={styles.descriptionText}>
                Hiding the ZIDER badge requires the Plus plan.
              </p>
            </PanelSection>

            {isMobileEditor ? null : (
            <PanelSection title="Mobile">
              <ToggleRow
                label="Mobile Setting"
                checked={enableMobileSettingsValue}
                onChange={(checked) => setSetting('enableMobileSettings', checked)}
              />
              <RangeField
                label="Mobile Logo Height"
                value={settings.mobileLogoHeight}
                suffix="px"
                min={20}
                max={96}
                disabled={mobileControlsDisabled}
                onChange={(value) => setSetting('mobileLogoHeight', value)}
              />
              <RangeField
                label="Mobile Speed"
                value={settings.mobileSpeed}
                min={10}
                max={160}
                disabled={mobileControlsDisabled}
                onChange={(value) => setSetting('mobileSpeed', value)}
              />
              <RangeField
                label="Mobile Logo Spacing"
                value={settings.mobileGap}
                suffix="px"
                min={8}
                max={96}
                disabled={mobileControlsDisabled}
                onChange={(value) => setSetting('mobileGap', value)}
              />
            </PanelSection>
            )}

            <section style={styles.helpSection}>
              <button
                type="button"
                style={styles.helpButton}
                onClick={() => setHelpOpen((current) => !current)}
                aria-expanded={helpOpen}
              >
                <span>Help</span>
                <span style={styles.helpChevron}>{helpOpen ? '−' : '+'}</span>
              </button>
              {helpOpen ? (
                <p style={styles.helpText}>
                  Add or edit logos from the Zider Logo Loop dashboard CMS. Sort Number controls display order.
                </p>
              ) : null}
            </section>
          </div>
        </SidePanel.Content>
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

type PanelSectionProps = {
  title: string;
  alignTitle?: 'left' | 'center';
  children: React.ReactNode;
};

const PanelSection: FC<PanelSectionProps> = ({ title, alignTitle = 'left', children }) => (
  <section style={styles.section}>
    <h2 style={{ ...styles.sectionTitle, ...(alignTitle === 'center' ? styles.sectionTitleCenter : undefined) }}>
      {title}
    </h2>
    <div style={styles.sectionBody}>{children}</div>
  </section>
);

type RangeFieldProps = {
  label: string;
  value: string;
  suffix?: string;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: string) => void;
};

const RangeField: FC<RangeFieldProps> = ({ label, value, suffix, min, max, disabled, onChange }) => {
  const numericValue = normalizeNumber(value, min, max);

  return (
    <div style={{ ...styles.field, ...(disabled ? styles.disabledField : undefined) }}>
      <div style={styles.fieldHeader}>
        <span style={styles.fieldLabel}>{label}</span>
        <label style={styles.valueBox}>
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            disabled={disabled}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
            aria-label={label}
            style={styles.valueInput}
          />
          {suffix ? <span style={styles.valueSuffix}>{suffix}</span> : null}
        </label>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={numericValue}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} slider`}
        style={styles.rangeInput}
      />
    </div>
  );
};

type SegmentedFieldProps = {
  label: string;
  value: 'left' | 'right';
  options: Array<{ label: string; value: 'left' | 'right' }>;
  onChange: (value: 'left' | 'right') => void;
};

const SegmentedField: FC<SegmentedFieldProps> = ({ label, value, options, onChange }) => (
  <div style={styles.field}>
    <div style={styles.fieldHeader}>
      <span style={styles.fieldLabel}>{label}</span>
    </div>
    <div style={styles.segmented}>
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            style={{ ...styles.segmentButton, ...(selected ? styles.segmentButtonActive : undefined) }}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

type ToggleRowProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

const ToggleRow: FC<ToggleRowProps> = ({ label, checked, disabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    style={{ ...styles.toggleRow, ...(disabled ? styles.disabledToggleRow : undefined) }}
  >
    <span style={styles.toggleLabel}>{label}</span>
    <span
      style={{
        ...styles.switchTrack,
        ...(checked ? styles.switchTrackChecked : undefined),
        ...(disabled ? styles.switchTrackDisabled : undefined),
      }}
    >
      <span
        style={{
          ...styles.switchThumb,
          ...(checked ? styles.switchThumbChecked : undefined),
        }}
      />
    </span>
  </button>
);

type ColorFieldProps = {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

const ColorField: FC<ColorFieldProps> = ({ label, value, disabled, onChange }) => {
  const parsedColor = parseColorValue(value);
  const pickerValue = parsedColor.hex;
  const opacityValue = Math.round(parsedColor.alpha * 100);
  const isTransparent = parsedColor.alpha === 0;
  const applyColor = (hex: string) => onChange(formatColorWithOpacity(hex, parsedColor.alpha));
  const applyOpacity = (opacity: number) => onChange(formatColorWithOpacity(pickerValue, opacity / 100));

  return (
    <div style={{ ...styles.field, ...(disabled ? styles.disabledField : undefined) }}>
      <div style={styles.fieldHeader}>
        <span style={styles.fieldLabel}>{label}</span>
      </div>
      <div style={styles.colorRow}>
        <label
          style={{
            ...styles.colorSwatch,
            ...(isTransparent ? styles.transparentSwatch : { backgroundColor: pickerValue }),
          }}
        >
          <input
            type="color"
            value={pickerValue}
            disabled={disabled}
            onChange={(event) => applyColor(event.target.value)}
            aria-label={`${label} picker`}
            style={styles.colorPicker}
          />
        </label>
        <div style={styles.colorInputGroup}>
          <input
            type="text"
            value={value}
            disabled={disabled}
            placeholder="transparent"
            onChange={(event) => onChange(normalizeColorText(event.target.value))}
            aria-label={`${label} color code`}
            style={styles.colorTextInput}
          />
          <button
            type="button"
            disabled={disabled || isTransparent}
            onClick={() => onChange(TRANSPARENT_COLOR)}
            style={{
              ...styles.clearColorButton,
              ...(disabled || isTransparent ? styles.clearColorButtonDisabled : undefined),
            }}
          >
            Transparent
          </button>
        </div>
      </div>
      <div style={styles.opacityRow}>
        <span style={styles.opacityLabel}>Opacity</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={opacityValue}
          disabled={disabled}
          onChange={(event) => applyOpacity(Number(event.target.value))}
          aria-label={`${label} opacity`}
          style={styles.opacitySlider}
        />
        <span style={styles.opacityValue}>{opacityValue}%</span>
      </div>
    </div>
  );
};

function normalizePropValue(key: keyof SettingsState, value: unknown) {
  if (typeof defaults[key] === 'boolean') {
    return value === true || value === 'true';
  }

  return String(value);
}

function normalizeNumber(value: string, min: number, max: number) {
  const numericValue = Number.parseFloat(value);

  if (!Number.isFinite(numericValue)) {
    return min;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function normalizeColorText(value: string) {
  const trimmedValue = value.trim();
  const lowerValue = trimmedValue.toLowerCase();

  if (!trimmedValue) {
    return TRANSPARENT_COLOR;
  }

  if (lowerValue === 'transparent' || lowerValue === 'none') {
    return TRANSPARENT_COLOR;
  }

  if (/^rgba?\(/i.test(trimmedValue)) {
    return trimmedValue;
  }

  return trimmedValue.startsWith('#') ? trimmedValue : `#${trimmedValue}`;
}

type ParsedColor = {
  hex: string;
  alpha: number;
};

function parseColorValue(value: string): ParsedColor {
  const trimmedValue = value.trim();

  if (isTransparentColor(trimmedValue)) {
    return { hex: '#ffffff', alpha: 0 };
  }

  const longHexMatch = trimmedValue.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (longHexMatch) {
    return {
      hex: `#${longHexMatch[1]}`,
      alpha: longHexMatch[2] ? normalizeAlpha(Number.parseInt(longHexMatch[2], 16) / 255) : 1,
    };
  }

  const shortHexMatch = trimmedValue.match(/^#([0-9a-fA-F]{3})([0-9a-fA-F])?$/);
  if (shortHexMatch) {
    const [red, green, blue] = shortHexMatch[1].split('').map((char) => `${char}${char}`);
    const alpha = shortHexMatch[2] ? Number.parseInt(`${shortHexMatch[2]}${shortHexMatch[2]}`, 16) / 255 : 1;

    return {
      hex: `#${red}${green}${blue}`,
      alpha: normalizeAlpha(alpha),
    };
  }

  const rgbMatch = trimmedValue.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i,
  );
  if (rgbMatch) {
    return {
      hex: rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])),
      alpha: normalizeAlpha(rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4])),
    };
  }

  return { hex: '#ffffff', alpha: 1 };
}

function formatColorWithOpacity(hex: string, alpha: number) {
  const normalizedAlpha = normalizeAlpha(alpha);

  if (normalizedAlpha <= 0) {
    return TRANSPARENT_COLOR;
  }

  if (normalizedAlpha >= 1) {
    return hex.toLowerCase();
  }

  const { red, green, blue } = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${trimAlpha(normalizedAlpha)})`;
}

function normalizeAlpha(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
}

function hexToRgb(hex: string) {
  const normalizedHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : 'ffffff';

  return {
    red: Number.parseInt(normalizedHex.slice(0, 2), 16),
    green: Number.parseInt(normalizedHex.slice(2, 4), 16),
    blue: Number.parseInt(normalizedHex.slice(4, 6), 16),
  };
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function trimAlpha(alpha: number) {
  return alpha.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function isTransparentColor(value: string) {
  const trimmedValue = value.trim().toLowerCase();

  if (!trimmedValue || trimmedValue === TRANSPARENT_COLOR || trimmedValue === 'none') {
    return true;
  }

  return /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|0?\.0+)\s*\)$/.test(trimmedValue);
}

function decodeAppInstance(instance: unknown): Record<string, unknown> {
  if (instance && typeof instance === 'object') {
    return instance as Record<string, unknown>;
  }

  if (typeof instance !== 'string') {
    return {};
  }

  const payload = instance.split('.')[1];

  if (!payload) {
    return {};
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );

    return JSON.parse(globalThis.atob(paddedPayload)) as Record<string, unknown>;
  } catch (error) {
    console.warn('[ZIDER LOGO LOOP] Failed to decode app instance.', error);
    return {};
  }
}

function createUpgradeUrl(appInstance: Record<string, unknown>) {
  const appId = String(appInstance.appDefId || appInstance.appDefinitionId || APP_ID);
  const instanceId = appInstance.instanceId ? String(appInstance.instanceId) : '';
  const query = instanceId ? `?appInstanceId=${encodeURIComponent(instanceId)}` : '';

  return `https://www.wix.com/apps/upgrade/${encodeURIComponent(appId)}${query}`;
}

function createDashboardUrl(appInstance: Record<string, unknown>) {
  const appId = String(appInstance.appDefId || appInstance.appDefinitionId || APP_ID);
  const instanceId = appInstance.instanceId ? String(appInstance.instanceId) : '';
  const appUrl = `https://www.wix.com/my-account/app/${encodeURIComponent(appId)}`;

  return instanceId ? `${appUrl}/${encodeURIComponent(instanceId)}` : appUrl;
}

async function resolveEditorDevice(): Promise<EditorDevice> {
  const candidates = [window.location.href, document.referrer];

  try {
    candidates.push(JSON.stringify(await info.getViewMode()));
  } catch (error) {
    console.warn('[ZIDER LOGO LOOP] Failed to resolve editor view mode.', error);
  }

  return candidates.some(isMobileContext) ? 'mobile' : 'desktop';
}

function isMobileContext(value: string) {
  const normalizedValue = safeDecode(value).toLowerCase();

  return (
    /(?:device|formfactor|form-factor|viewmode|view-mode|viewport|breakpoint)=mobile/.test(normalizedValue) ||
    /(?:device|formfactor|form-factor|viewmode|view-mode|viewport|breakpoint)["':\s]+mobile/.test(normalizedValue) ||
    /\/mobile(?:[/?#]|$)/.test(normalizedValue)
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    background: '#F7F8FA',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    borderBottom: '1px solid #DFE5EB',
    background: '#FFFFFF',
  },
  sectionTitle: {
    margin: 0,
    padding: '14px 24px 10px',
    color: '#0F1734',
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  sectionTitleCenter: {
    textAlign: 'center',
    color: '#4F5D73',
    fontSize: 14,
    fontWeight: 500,
    textTransform: 'none',
  },
  sectionBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    padding: '0 24px 14px',
  },
  field: {
    padding: '10px 0',
  },
  disabledField: {
    opacity: 0.52,
    cursor: 'not-allowed',
  },
  fieldHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 34,
  },
  fieldLabel: {
    color: '#34405A',
    fontSize: 13,
    lineHeight: 1.35,
  },
  valueBox: {
    display: 'inline-flex',
    alignItems: 'center',
    width: 68,
    height: 34,
    borderRadius: 6,
    background: '#EDF4FF',
    border: '1px solid transparent',
    color: '#24304D',
    overflow: 'hidden',
  },
  valueInput: {
    width: '100%',
    height: '100%',
    border: 0,
    outline: 'none',
    background: 'transparent',
    color: '#24304D',
    fontSize: 16,
    textAlign: 'center',
    padding: '0 6px',
    boxSizing: 'border-box',
  },
  valueSuffix: {
    color: '#7A8499',
    fontSize: 12,
    paddingRight: 7,
  },
  rangeInput: {
    width: '100%',
    margin: '8px 0 0',
    accentColor: '#116DFF',
  },
  segmented: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 4,
    padding: 3,
    borderRadius: 8,
    background: '#EDF1F6',
  },
  segmentButton: {
    height: 30,
    border: 0,
    borderRadius: 6,
    background: 'transparent',
    color: '#34405A',
    cursor: 'pointer',
    fontSize: 13,
  },
  segmentButtonActive: {
    background: '#FFFFFF',
    color: '#116DFF',
    boxShadow: '0 1px 2px rgba(22, 45, 61, 0.12)',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    minHeight: 44,
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    padding: '0',
    color: '#34405A',
    fontSize: 13,
    position: 'relative',
    cursor: 'pointer',
    textAlign: 'left',
  },
  disabledToggleRow: {
    opacity: 0.52,
    cursor: 'not-allowed',
  },
  toggleLabel: {
    flex: '1 1 auto',
    minWidth: 0,
    lineHeight: 1.35,
  },
  switchTrack: {
    position: 'relative',
    flex: '0 0 auto',
    width: 44,
    height: 24,
    borderRadius: 999,
    background: '#D8DEE8',
    boxShadow: 'inset 0 0 0 1px rgba(16, 23, 52, 0.08)',
    transition: 'background-color 160ms ease, box-shadow 160ms ease',
  },
  switchTrackChecked: {
    background: '#116DFF',
    boxShadow: 'inset 0 0 0 1px rgba(17, 109, 255, 0.2)',
  },
  switchTrackDisabled: {
    background: '#D8DEE8',
  },
  switchThumb: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(22, 45, 61, 0.24)',
    transition: 'transform 160ms ease',
  },
  switchThumbChecked: {
    transform: 'translateX(20px)',
  },
  colorRow: {
    display: 'grid',
    gridTemplateColumns: '38px 1fr',
    gap: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  colorSwatch: {
    position: 'relative',
    width: 38,
    height: 34,
    borderRadius: 6,
    border: '1px solid #C8D0DC',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  transparentSwatch: {
    backgroundColor: '#FFFFFF',
    backgroundImage:
      'linear-gradient(45deg, #D7DEE8 25%, transparent 25%), linear-gradient(-45deg, #D7DEE8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #D7DEE8 75%), linear-gradient(-45deg, transparent 75%, #D7DEE8 75%)',
    backgroundSize: '10px 10px',
    backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
  },
  colorPicker: {
    position: 'absolute',
    inset: -4,
    width: 46,
    height: 42,
    border: 0,
    padding: 0,
    opacity: 0,
    cursor: 'pointer',
  },
  colorInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  colorTextInput: {
    width: '100%',
    height: 34,
    border: '1px solid #C8D0DC',
    borderRadius: 6,
    padding: '0 10px',
    color: '#24304D',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearColorButton: {
    flex: '0 0 auto',
    height: 34,
    border: '1px solid #C8D0DC',
    borderRadius: 6,
    background: '#FFFFFF',
    color: '#116DFF',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    padding: '0 8px',
  },
  clearColorButtonDisabled: {
    color: '#9AA7B8',
    cursor: 'not-allowed',
    background: '#F7F8FA',
  },
  opacityRow: {
    display: 'grid',
    gridTemplateColumns: '58px 1fr 42px',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  opacityLabel: {
    color: '#4F5D73',
    fontSize: 12,
  },
  opacitySlider: {
    width: '100%',
    accentColor: '#116DFF',
  },
  opacityValue: {
    color: '#4F5D73',
    fontSize: 12,
    textAlign: 'right',
  },
  descriptionText: {
    margin: '0 0 12px',
    color: '#4F5D73',
    fontSize: 13,
    lineHeight: 1.45,
  },
  upgradeButton: {
    width: '100%',
    height: 38,
    border: 0,
    borderRadius: 999,
    background: '#B24AD6',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 500,
    margin: '2px 0 14px',
  },
  secondaryUpgradeButton: {
    width: '100%',
    minHeight: 34,
    border: '1px solid #C7DCFF',
    borderRadius: 999,
    background: '#FFFFFF',
    color: '#116DFF',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    marginTop: 8,
    padding: '0 12px',
  },
  manageButton: {
    width: '100%',
    minHeight: 38,
    border: 0,
    borderRadius: 6,
    background: '#116DFF',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    margin: '2px 0 10px',
    padding: '0 12px',
  },
  helpSection: {
    marginTop: 'auto',
    borderTop: '1px solid #DFE5EB',
    background: '#FFFFFF',
    padding: '8px 24px',
  },
  helpButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 34,
    border: 0,
    background: 'transparent',
    color: '#24304D',
    cursor: 'pointer',
    fontSize: 13,
    padding: 0,
  },
  helpChevron: {
    color: '#116DFF',
    fontSize: 18,
    lineHeight: 1,
  },
  helpText: {
    margin: '2px 0 10px',
    color: '#4F5D73',
    fontSize: 12,
    lineHeight: 1.45,
  },
} satisfies Record<string, React.CSSProperties>;

export default Panel;
