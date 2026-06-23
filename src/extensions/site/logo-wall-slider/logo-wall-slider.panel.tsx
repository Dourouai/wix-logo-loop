import React, { type ChangeEvent, type FC, useCallback, useEffect, useState } from 'react';
import { application, info, widget } from '@wix/editor';
import {
  SidePanel,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

type DirectionMode = 'alternate' | 'left' | 'right';
type StylePreset = 'soft-cards' | 'clean-enterprise' | 'borderless' | 'compact-wall';

type SettingsState = {
  stylePreset: StylePreset;
  rows: string;
  cardWidth: string;
  cardHeight: string;
  logoHeight: string;
  gap: string;
  rowGap: string;
  cardRadius: string;
  speed: string;
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
  enableMobileSettings: boolean;
  mobileRows: string;
  mobileCardWidth: string;
  mobileCardHeight: string;
  mobileLogoHeight: string;
  mobileGap: string;
  mobileRowGap: string;
  mobileSpeed: string;
  hideWatermark: boolean;
};

type PlanStatus = 'loading' | 'premium' | 'free' | 'unknown';
type EditorDevice = 'desktop' | 'mobile';

const APP_ID = 'f1615a5b-65ed-4121-ae57-f2194f350030';
const PREMIUM_PLAN_ID = 'plus';

const defaults: SettingsState = {
  stylePreset: 'soft-cards',
  rows: '2',
  cardWidth: '160',
  cardHeight: '78',
  logoHeight: '46',
  gap: '20',
  rowGap: '18',
  cardRadius: '16',
  speed: '40',
  directionMode: 'alternate',
  pauseOnHover: true,
  backgroundColor: '#fbfaf5',
  cardColor: '#ffffff',
  borderColor: '#ece7d8',
  highlightColor: '#ffd95a',
  hiddenMaskColor: false,
  maskColor: '#fbfaf5',
  showBorder: true,
  showShadow: true,
  links: true,
  grayMode: false,
  enableMobileSettings: false,
  mobileRows: '3',
  mobileCardWidth: '104',
  mobileCardHeight: '54',
  mobileLogoHeight: '28',
  mobileGap: '10',
  mobileRowGap: '10',
  mobileSpeed: '32',
  hideWatermark: false,
};

const propMap = {
  stylePreset: 'style-preset',
  rows: 'rows',
  cardWidth: 'card-width',
  cardHeight: 'card-height',
  logoHeight: 'logo-height',
  gap: 'gap',
  rowGap: 'row-gap',
  cardRadius: 'card-radius',
  speed: 'speed',
  directionMode: 'direction-mode',
  pauseOnHover: 'pause-on-hover',
  backgroundColor: 'background-color',
  cardColor: 'card-color',
  borderColor: 'border-color',
  highlightColor: 'highlight-color',
  hiddenMaskColor: 'hidden-mask-color',
  maskColor: 'mask-color',
  showBorder: 'show-border',
  showShadow: 'show-shadow',
  links: 'links',
  grayMode: 'gray-mode',
  enableMobileSettings: 'enable-mobile-settings',
  mobileRows: 'mobile-rows',
  mobileCardWidth: 'mobile-card-width',
  mobileCardHeight: 'mobile-card-height',
  mobileLogoHeight: 'mobile-logo-height',
  mobileGap: 'mobile-gap',
  mobileRowGap: 'mobile-row-gap',
  mobileSpeed: 'mobile-speed',
  hideWatermark: 'hide-watermark',
} as const satisfies Record<keyof SettingsState, string>;

type PresetDefinition = {
  label: string;
  description: string;
  settings: Partial<SettingsState>;
};

const stylePresets: Record<StylePreset, PresetDefinition> = {
  'soft-cards': {
    label: 'Soft Cards',
    description: 'Warm background, white cards, soft shadow.',
    settings: {
      rows: '2',
      cardWidth: '160',
      cardHeight: '78',
      logoHeight: '46',
      gap: '20',
      rowGap: '18',
      cardRadius: '16',
      speed: '40',
      mobileRows: '3',
      mobileCardWidth: '104',
      mobileCardHeight: '54',
      mobileLogoHeight: '28',
      mobileGap: '10',
      mobileRowGap: '10',
      mobileSpeed: '32',
      backgroundColor: '#fbfaf5',
      cardColor: '#ffffff',
      borderColor: '#ece7d8',
      highlightColor: '#ffd95a',
      hiddenMaskColor: false,
      maskColor: '#fbfaf5',
      showBorder: true,
      showShadow: true,
    },
  },
  'clean-enterprise': {
    label: 'Clean Enterprise',
    description: 'White surface, fine border, minimal depth.',
    settings: {
      rows: '2',
      cardWidth: '164',
      cardHeight: '76',
      logoHeight: '44',
      gap: '18',
      rowGap: '16',
      cardRadius: '10',
      speed: '36',
      mobileRows: '3',
      mobileCardWidth: '106',
      mobileCardHeight: '54',
      mobileLogoHeight: '28',
      mobileGap: '10',
      mobileRowGap: '10',
      mobileSpeed: '30',
      backgroundColor: '#ffffff',
      cardColor: '#ffffff',
      borderColor: '#e4e9f1',
      highlightColor: '#116dff',
      hiddenMaskColor: false,
      maskColor: '#ffffff',
      showBorder: true,
      showShadow: false,
    },
  },
  borderless: {
    label: 'Borderless',
    description: 'Transparent surface, no card frame.',
    settings: {
      rows: '2',
      cardWidth: '156',
      cardHeight: '70',
      logoHeight: '42',
      gap: '24',
      rowGap: '16',
      cardRadius: '0',
      speed: '42',
      mobileRows: '3',
      mobileCardWidth: '100',
      mobileCardHeight: '50',
      mobileLogoHeight: '28',
      mobileGap: '12',
      mobileRowGap: '10',
      mobileSpeed: '34',
      backgroundColor: 'rgba(255,255,255,0)',
      cardColor: 'rgba(255,255,255,0)',
      borderColor: 'rgba(255,255,255,0)',
      highlightColor: '#116dff',
      hiddenMaskColor: true,
      maskColor: 'rgba(255,255,255,0)',
      showBorder: false,
      showShadow: false,
    },
  },
  'compact-wall': {
    label: 'Compact Wall',
    description: 'Smaller cards, three rows, denser wall.',
    settings: {
      rows: '3',
      cardWidth: '136',
      cardHeight: '64',
      logoHeight: '36',
      gap: '14',
      rowGap: '12',
      cardRadius: '12',
      speed: '34',
      mobileRows: '3',
      mobileCardWidth: '96',
      mobileCardHeight: '50',
      mobileLogoHeight: '26',
      mobileGap: '8',
      mobileRowGap: '8',
      mobileSpeed: '30',
      backgroundColor: '#f8fafc',
      cardColor: '#ffffff',
      borderColor: '#e5eaf1',
      highlightColor: '#54a6ff',
      hiddenMaskColor: false,
      maskColor: '#f8fafc',
      showBorder: true,
      showShadow: true,
    },
  },
};

const stylePresetOptions = Object.entries(stylePresets).map(([value, preset]) => ({
  value: value as StylePreset,
  ...preset,
}));

const Panel: FC = () => {
  const [settings, setSettings] = useState<SettingsState>(defaults);
  const [helpOpen, setHelpOpen] = useState(false);
  const [advancedStyleOpen, setAdvancedStyleOpen] = useState(false);
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
      .catch((error) => console.error('[ZIDER LOGO WALL SLIDER] Failed to load widget settings.', error));

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
        console.warn('[ZIDER LOGO WALL SLIDER] Failed to resolve app plan.', error);

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

  const setMobileSetting = useCallback(<Key extends MobileSettingKey>(key: Key, value: SettingsState[Key]) => {
    setSettings((current) => ({ ...current, enableMobileSettings: true, [key]: value }));
    widget.setProp(propMap.enableMobileSettings, 'true');
    widget.setProp(propMap[key], String(value));
  }, []);

  const applyStylePreset = useCallback((preset: StylePreset) => {
    const presetSettings = stylePresets[preset].settings;

    setSettings((current) => ({
      ...current,
      ...presetSettings,
      stylePreset: preset,
    }));
    widget.setProp(propMap.stylePreset, preset);

    Object.entries(presetSettings).forEach(([key, value]) => {
      widget.setProp(propMap[key as keyof SettingsState], String(value));
    });
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
  const motionTitle = isMobileEditor ? 'Mobile Motion' : 'Motion';
  const rowsValue = isMobileEditor ? settings.mobileRows : settings.rows;
  const cardWidthValue = isMobileEditor ? settings.mobileCardWidth : settings.cardWidth;
  const cardHeightValue = isMobileEditor ? settings.mobileCardHeight : settings.cardHeight;
  const logoHeightValue = isMobileEditor ? settings.mobileLogoHeight : settings.logoHeight;
  const gapValue = isMobileEditor ? settings.mobileGap : settings.gap;
  const rowGapValue = isMobileEditor ? settings.mobileRowGap : settings.rowGap;
  const speedValue = isMobileEditor ? settings.mobileSpeed : settings.speed;
  const setRowsValue = isMobileEditor
    ? (value: string) => setMobileSetting('mobileRows', value)
    : (value: string) => setSetting('rows', value);
  const setCardWidth = isMobileEditor
    ? (value: string) => setMobileSetting('mobileCardWidth', value)
    : (value: string) => setSetting('cardWidth', value);
  const setCardHeight = isMobileEditor
    ? (value: string) => setMobileSetting('mobileCardHeight', value)
    : (value: string) => setSetting('cardHeight', value);
  const setLogoHeight = isMobileEditor
    ? (value: string) => setMobileSetting('mobileLogoHeight', value)
    : (value: string) => setSetting('logoHeight', value);
  const setGap = isMobileEditor
    ? (value: string) => setMobileSetting('mobileGap', value)
    : (value: string) => setSetting('gap', value);
  const setRowGap = isMobileEditor
    ? (value: string) => setMobileSetting('mobileRowGap', value)
    : (value: string) => setSetting('rowGap', value);
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
                Logos are auto-grouped by Sort Number. The first 50 records are displayed.
              </p>
            </PanelSection>

            <PanelSection title="Preset">
              <PresetField
                value={settings.stylePreset}
                options={stylePresetOptions}
                onChange={applyStylePreset}
              />
            </PanelSection>

            <PanelSection title={layoutTitle}>
              <RangeField label="Rows" value={rowsValue} min={1} max={4} onChange={setRowsValue} />
              <RangeField label="Card width" value={cardWidthValue} suffix="px" min={76} max={280} onChange={setCardWidth} />
              <RangeField label="Card height" value={cardHeightValue} suffix="px" min={44} max={150} onChange={setCardHeight} />
              <RangeField label="Logo height" value={logoHeightValue} suffix="px" min={20} max={110} onChange={setLogoHeight} />
              <RangeField label="Column gap" value={gapValue} suffix="px" min={6} max={80} onChange={setGap} />
              <RangeField label="Row gap" value={rowGapValue} suffix="px" min={6} max={80} onChange={setRowGap} />
            </PanelSection>

            <PanelSection title={motionTitle}>
              <RangeField label="Speed" value={speedValue} min={8} max={160} onChange={setSpeed} />
              <SegmentedField
                label="Direction"
                value={settings.directionMode}
                options={[
                  { label: 'Alternate', value: 'alternate' },
                  { label: 'Left', value: 'left' },
                  { label: 'Right', value: 'right' },
                ]}
                onChange={(value) => setSetting('directionMode', value)}
              />
              <ToggleRow
                label="Pause on hover"
                checked={settings.pauseOnHover}
                onChange={(checked) => setSetting('pauseOnHover', checked)}
              />
            </PanelSection>

            <PanelSection title="Behavior">
              <ToggleRow
                label="Enable clickable links"
                checked={settings.links}
                onChange={(checked) => setSetting('links', checked)}
              />
            </PanelSection>

            <CollapsibleSection
              title="Advanced Style"
              open={advancedStyleOpen}
              onToggle={() => setAdvancedStyleOpen((current) => !current)}
            >
              <RangeField label="Card radius" value={settings.cardRadius} suffix="px" min={0} max={40} onChange={(value) => setSetting('cardRadius', value)} />
              <ToggleRow
                label="Show card border"
                checked={settings.showBorder}
                onChange={(checked) => setSetting('showBorder', checked)}
              />
              <ToggleRow
                label="Show card shadow"
                checked={settings.showShadow}
                onChange={(checked) => setSetting('showShadow', checked)}
              />
              <ColorField label="Background" value={settings.backgroundColor} onChange={(value) => setSetting('backgroundColor', value)} />
              <ColorField label="Card" value={settings.cardColor} onChange={(value) => setSetting('cardColor', value)} />
              <ColorField label="Border" value={settings.borderColor} onChange={(value) => setSetting('borderColor', value)} />
              <ColorField label="Hover highlight" value={settings.highlightColor} onChange={(value) => setSetting('highlightColor', value)} />
              <ToggleRow
                label="Hidden edge fade color"
                checked={settings.hiddenMaskColor}
                onChange={(checked) => setSetting('hiddenMaskColor', checked)}
              />
              <ColorField
                label="Edge fade color"
                value={settings.maskColor}
                disabled={settings.hiddenMaskColor}
                onChange={(value) => setSetting('maskColor', value)}
              />
            </CollapsibleSection>

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
            </PanelSection>

            {isMobileEditor ? null : (
              <PanelSection title="Mobile">
                <ToggleRow
                  label="Mobile Setting"
                  checked={enableMobileSettingsValue}
                  disabled={paidControlsDisabled}
                  onChange={(checked) => setSetting('enableMobileSettings', checked)}
                />
                <RangeField label="Mobile rows" value={settings.mobileRows} min={1} max={3} disabled={mobileControlsDisabled} onChange={(value) => setSetting('mobileRows', value)} />
                <RangeField label="Mobile card width" value={settings.mobileCardWidth} suffix="px" min={76} max={180} disabled={mobileControlsDisabled} onChange={(value) => setSetting('mobileCardWidth', value)} />
                <RangeField label="Mobile card height" value={settings.mobileCardHeight} suffix="px" min={44} max={110} disabled={mobileControlsDisabled} onChange={(value) => setSetting('mobileCardHeight', value)} />
                <RangeField label="Mobile logo height" value={settings.mobileLogoHeight} suffix="px" min={20} max={80} disabled={mobileControlsDisabled} onChange={(value) => setSetting('mobileLogoHeight', value)} />
                <RangeField label="Mobile column gap" value={settings.mobileGap} suffix="px" min={6} max={48} disabled={mobileControlsDisabled} onChange={(value) => setSetting('mobileGap', value)} />
                <RangeField label="Mobile row gap" value={settings.mobileRowGap} suffix="px" min={6} max={48} disabled={mobileControlsDisabled} onChange={(value) => setSetting('mobileRowGap', value)} />
                <RangeField label="Mobile speed" value={settings.mobileSpeed} min={8} max={140} disabled={mobileControlsDisabled} onChange={(value) => setSetting('mobileSpeed', value)} />
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
                <span style={styles.helpChevron}>{helpOpen ? '-' : '+'}</span>
              </button>
              {helpOpen ? (
                <p style={styles.helpText}>
                  The wall slider fills rows by order: 1, 3, 5 in row one and 2, 4, 6 in row two when using two rows.
                </p>
              ) : null}
            </section>
          </div>
        </SidePanel.Content>
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

type MobileSettingKey =
  | 'mobileRows'
  | 'mobileCardWidth'
  | 'mobileCardHeight'
  | 'mobileLogoHeight'
  | 'mobileGap'
  | 'mobileRowGap'
  | 'mobileSpeed';

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

type CollapsibleSectionProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

const CollapsibleSection: FC<CollapsibleSectionProps> = ({ title, open, onToggle, children }) => (
  <section style={styles.section}>
    <button
      type="button"
      style={styles.collapsibleHeader}
      onClick={onToggle}
      aria-expanded={open}
    >
      <span style={styles.sectionTitle}>{title}</span>
      <span style={styles.collapsibleIcon}>{open ? '-' : '+'}</span>
    </button>
    {open ? <div style={styles.sectionBody}>{children}</div> : null}
  </section>
);

type PresetFieldProps = {
  value: StylePreset;
  options: Array<{ value: StylePreset } & PresetDefinition>;
  onChange: (value: StylePreset) => void;
};

const PresetField: FC<PresetFieldProps> = ({ value, options, onChange }) => (
  <div style={styles.presetGrid}>
    {options.map((option) => {
      const selected = value === option.value;

      return (
        <button
          key={option.value}
          type="button"
          style={{ ...styles.presetButton, ...(selected ? styles.presetButtonActive : undefined) }}
          onClick={() => onChange(option.value)}
        >
          <span style={styles.presetTitle}>{option.label}</span>
          <span style={styles.presetDescription}>{option.description}</span>
        </button>
      );
    })}
  </div>
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
  value: DirectionMode;
  options: Array<{ label: string; value: DirectionMode }>;
  onChange: (value: DirectionMode) => void;
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
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff';

  return (
    <div style={{ ...styles.field, ...(disabled ? styles.disabledField : undefined) }}>
      <div style={styles.fieldHeader}>
        <span style={styles.fieldLabel}>{label}</span>
      </div>
      <div style={styles.colorRow}>
        <label style={{ ...styles.colorSwatch, backgroundColor: pickerValue }}>
          <input
            type="color"
            value={pickerValue}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`${label} picker`}
            style={styles.colorPicker}
          />
        </label>
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder="#ffffff"
          onChange={(event) => onChange(normalizeColorText(event.target.value))}
          aria-label={`${label} color code`}
          style={styles.colorTextInput}
        />
      </div>
    </div>
  );
};

function normalizePropValue(key: keyof SettingsState, value: unknown) {
  if (typeof defaults[key] === 'boolean') {
    return value === true || value === 'true';
  }

  if (key === 'directionMode') {
    return value === 'left' || value === 'right' ? value : 'alternate';
  }

  if (key === 'stylePreset') {
    return value === 'clean-enterprise' || value === 'borderless' || value === 'compact-wall'
      ? value
      : 'soft-cards';
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

  if (!trimmedValue) {
    return trimmedValue;
  }

  return trimmedValue.startsWith('#') ? trimmedValue : `#${trimmedValue}`;
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
    console.warn('[ZIDER LOGO WALL SLIDER] Failed to decode app instance.', error);
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
    console.warn('[ZIDER LOGO WALL SLIDER] Failed to resolve editor view mode.', error);
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
  collapsibleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 46,
    border: 0,
    background: '#FFFFFF',
    cursor: 'pointer',
    padding: 0,
  },
  collapsibleIcon: {
    color: '#116DFF',
    fontSize: 18,
    lineHeight: 1,
    paddingRight: 24,
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 8,
    paddingTop: 4,
  },
  presetButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
    width: '100%',
    border: '1px solid #D7DEE8',
    borderRadius: 8,
    background: '#FFFFFF',
    color: '#34405A',
    cursor: 'pointer',
    padding: '10px 12px',
    textAlign: 'left',
  },
  presetButtonActive: {
    borderColor: '#116DFF',
    background: '#F2F7FF',
    boxShadow: '0 1px 3px rgba(17, 109, 255, 0.14)',
  },
  presetTitle: {
    color: '#0F1734',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.25,
  },
  presetDescription: {
    color: '#59657A',
    fontSize: 11,
    lineHeight: 1.35,
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
    color: '#7F8BA0',
    fontSize: 12,
    paddingRight: 8,
  },
  rangeInput: {
    width: '100%',
    accentColor: '#116DFF',
  },
  segmented: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
    padding: 4,
    borderRadius: 8,
    background: '#EDF4FF',
  },
  segmentButton: {
    border: 0,
    borderRadius: 6,
    background: 'transparent',
    color: '#34405A',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    padding: '8px 4px',
  },
  segmentButtonActive: {
    background: '#FFFFFF',
    color: '#116DFF',
    boxShadow: '0 1px 3px rgba(15, 23, 52, 0.12)',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    minHeight: 42,
    padding: '8px 0',
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
  },
  disabledToggleRow: {
    opacity: 0.52,
    cursor: 'not-allowed',
  },
  toggleLabel: {
    color: '#34405A',
    fontSize: 13,
    lineHeight: 1.35,
    textAlign: 'left',
  },
  switchTrack: {
    position: 'relative',
    width: 44,
    height: 24,
    borderRadius: 12,
    background: '#B7C4D4',
    flex: '0 0 auto',
    transition: 'background 160ms ease',
  },
  switchTrackChecked: {
    background: '#116DFF',
  },
  switchTrackDisabled: {
    background: '#D7DEE8',
  },
  switchThumb: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#FFFFFF',
    transition: 'transform 160ms ease',
    boxShadow: '0 1px 2px rgba(15, 23, 52, 0.22)',
  },
  switchThumbChecked: {
    transform: 'translateX(20px)',
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  colorSwatch: {
    position: 'relative',
    width: 34,
    height: 34,
    borderRadius: 17,
    border: '1px solid #D7DEE8',
    overflow: 'hidden',
    flex: '0 0 auto',
  },
  colorPicker: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  colorTextInput: {
    width: '100%',
    height: 34,
    border: '1px solid #D7DEE8',
    borderRadius: 6,
    color: '#24304D',
    fontSize: 13,
    padding: '0 10px',
    boxSizing: 'border-box',
  },
  manageButton: {
    width: '100%',
    minHeight: 38,
    border: 0,
    borderRadius: 19,
    background: '#116DFF',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  upgradeButton: {
    width: '100%',
    minHeight: 38,
    border: 0,
    borderRadius: 19,
    background: '#116DFF',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 10,
  },
  secondaryUpgradeButton: {
    width: '100%',
    minHeight: 34,
    border: '1px solid #116DFF',
    borderRadius: 17,
    background: '#FFFFFF',
    color: '#116DFF',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 8,
  },
  descriptionText: {
    margin: '8px 0 0',
    color: '#59657A',
    fontSize: 12,
    lineHeight: 1.45,
  },
  helpSection: {
    padding: '12px 24px 18px',
    background: '#F7F8FA',
  },
  helpButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 34,
    border: 0,
    background: 'transparent',
    color: '#34405A',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    padding: 0,
  },
  helpChevron: {
    color: '#116DFF',
    fontSize: 18,
    lineHeight: 1,
  },
  helpText: {
    margin: '2px 0 0',
    color: '#59657A',
    fontSize: 12,
    lineHeight: 1.45,
  },
} satisfies Record<string, React.CSSProperties>;

export default Panel;
