import { extensions } from '@wix/astro/builders';

export default extensions.customElement({
  id: 'dc70b6b0-f632-4a6d-998a-1e3409ea8baf',
  name: 'Zider Logo Wall Slider',
  width: {
    defaultWidth: 960,
    allowStretch: true,
    stretchByDefault: true,
  },
  height: {
    defaultHeight: 220,
    heightMode: 'AUTO',
  },
  installation: {
    autoAdd: false,
  },
  presets: [
    {
      id: '822daf8f-bb5e-4ee3-9cf7-e5a3223f1d06',
      name: 'Logo Wall Slider',
      thumbnailUrl: '{{BASE_URL}}/logo-wall-slider-preview.svg',
    },
  ],
  behaviors: {
    dashboard: {
      dashboardPageComponentId: '7b2463ea-a8a4-4754-b79e-9782bd721150',
    },
  },
  tagName: 'zider-logo-wall-slider',
  element: './extensions/site/logo-wall-slider/logo-wall-slider.ts',
  settings: './extensions/site/logo-wall-slider/logo-wall-slider.panel.tsx',
});
