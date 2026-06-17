import React, { type ChangeEvent, type FC, useCallback, useEffect, useState } from 'react';
import { application, info, widget } from '@wix/editor';
import {
  SidePanel,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

type SettingsState = {
  logoHeight: string;
  gap: string;
  autoRotate: boolean;
  rotateInterval: string;
  pauseOnHover: boolean;
  links: boolean;
  grayMode: boolean;
  enableMobileSettings: boolean;
  mobileGap: string;
  mobileLogoHeight: string;
  hideWatermark: boolean;
};

type PlanStatus = 'loading' | 'premium' | 'free' | 'unknown';
type EditorDevice = 'desktop' | 'mobile';

const APP_ID = 'f1615a5b-65ed-4121-ae57-f2194f350030';
const PREMIUM_PLAN_ID = 'plus';

const defaults: SettingsState = {
  logoHeight: '44',
  gap: '64',
  autoRotate: true,
  rotateInterval: '3200',
  pauseOnHover: true,
  links: true,
  grayMode: false,
  enableMobileSettings: false,
  mobileGap: '20',
  mobileLogoHeight: '30',
  hideWatermark: false,
};

const propMap = {
  logoHeight: 'logo-height',
  gap: 'gap',
  autoRotate: 'auto-rotate',
  rotateInterval: 'rotate-interval',
  pauseOnHover: 'pause-on-hover',
  links: 'links',
  grayMode: 'gray-mode',
  enableMobileSettings: 'enable-mobile-settings',
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
      .catch((error) => console.error('[ZIDER TRUSTED LOGO ROTATOR] Failed to load widget settings.', error));

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
        console.warn('[ZIDER TRUSTED LOGO ROTATOR] Failed to resolve app plan.', error);

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

  const setMobileSetting = useCallback(<Key extends 'mobileLogoHeight' | 'mobileGap'>(
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
      grayMode: false,
      enableMobileSettings: false,
    }));

    widget.setProp(propMap.hideWatermark, 'false');
    widget.setProp(propMap.grayMode, 'false');
    widget.setProp(propMap.enableMobileSettings, 'false');
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
  const grayModeValue = isPremium && settings.grayMode;
  const enableMobileSettingsValue = isPremium && settings.enableMobileSettings;
  const mobileControlsDisabled = paidControlsDisabled || !enableMobileSettingsValue;
  const isMobileEditor = editorDevice === 'mobile';
  const layoutTitle = isMobileEditor ? 'Mobile Layout' : 'Layout';
  const logoHeightValue = isMobileEditor ? settings.mobileLogoHeight : settings.logoHeight;
  const logoGapValue = isMobileEditor ? settings.mobileGap : settings.gap;
  const setLogoHeight = isMobileEditor
    ? (value: string) => setMobileSetting('mobileLogoHeight', value)
    : (value: string) => setSetting('logoHeight', value);
  const setLogoGap = isMobileEditor
    ? (value: string) => setMobileSetting('mobileGap', value)
    : (value: string) => setSetting('gap', value);

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
                The rotator displays up to 50 logos, ordered by Sort Number.
              </p>
            </PanelSection>

            <PanelSection title={layoutTitle}>
              <RangeField
                label={isMobileEditor ? 'Mobile logo height' : 'Logo height'}
                value={logoHeightValue}
                suffix="px"
                min={isMobileEditor ? 20 : 24}
                max={isMobileEditor ? 72 : 96}
                onChange={setLogoHeight}
              />
              <RangeField
                label={isMobileEditor ? 'Mobile logo gap' : 'Logo gap'}
                value={logoGapValue}
                suffix="px"
                min={8}
                max={isMobileEditor ? 56 : 120}
                onChange={setLogoGap}
              />
              <p style={styles.descriptionText}>
                Slots are fixed automatically: desktop 5, tablet 4, mobile 3.
              </p>
            </PanelSection>

            <PanelSection title="Motion">
              <ToggleRow
                label="Auto rotate"
                checked={settings.autoRotate}
                onChange={(checked) => setSetting('autoRotate', checked)}
              />
              <RangeField
                label="Rotate interval"
                value={settings.rotateInterval}
                suffix="ms"
                min={1200}
                max={8000}
                disabled={!settings.autoRotate}
                onChange={(value) => setSetting('rotateInterval', value)}
              />
              <ToggleRow
                label="Pause on hover"
                checked={settings.pauseOnHover}
                disabled={!settings.autoRotate}
                onChange={(checked) => setSetting('pauseOnHover', checked)}
              />
            </PanelSection>

            <PanelSection title="Behavior">
              <ToggleRow
                label="Enable Clickable Links"
                checked={settings.links}
                onChange={(checked) => setSetting('links', checked)}
              />
            </PanelSection>

            <PanelSection title="Upgrade" alignTitle="center">
              {isPremium ? null : (
                <button type="button" style={styles.upgradeButton} onClick={openUpgrade}>
                  Upgrade
                </button>
              )}
              <ToggleRow
                label="Hidden Zider badge"
                checked={hideWatermarkValue}
                disabled={paidControlsDisabled}
                onChange={(checked) => setSetting('hideWatermark', checked)}
              />
              <p style={styles.descriptionText}>
                If you want to hide the ZIDER badge, please upgrade app.
              </p>
              <ToggleRow
                label="Gray Mode (Hover to Color)"
                checked={grayModeValue}
                disabled={paidControlsDisabled}
                onChange={(checked) => setSetting('grayMode', checked)}
              />
              <p style={styles.descriptionText}>
                Convert all logos to grayscale by default. They will return to full color when hovered.
              </p>
            </PanelSection>

            {isMobileEditor ? null : (
              <PanelSection title="Mobile">
                <ToggleRow
                  label="Mobile Setting"
                  checked={enableMobileSettingsValue}
                  disabled={paidControlsDisabled}
                  onChange={(checked) => setSetting('enableMobileSettings', checked)}
                />
                <RangeField
                  label="Mobile Logo Height"
                  value={settings.mobileLogoHeight}
                  suffix="px"
                  min={20}
                  max={72}
                  disabled={mobileControlsDisabled}
                  onChange={(value) => setSetting('mobileLogoHeight', value)}
                />
                <RangeField
                  label="Mobile Logo Spacing"
                  value={settings.mobileGap}
                  suffix="px"
                  min={8}
                  max={56}
                  disabled={mobileControlsDisabled}
                  onChange={(value) => setSetting('mobileGap', value)}
                />
                {isPremium ? null : (
                  <button type="button" style={styles.secondaryUpgradeButton} onClick={openUpgrade}>
                    Upgrade to enable mobile settings
                  </button>
                )}
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
                  The rotator keeps logo positions fixed and replaces them upward one by one.
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
    console.warn('[ZIDER TRUSTED LOGO ROTATOR] Failed to decode app instance.', error);
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
    console.warn('[ZIDER TRUSTED LOGO ROTATOR] Failed to resolve editor view mode.', error);
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
    width: 76,
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
