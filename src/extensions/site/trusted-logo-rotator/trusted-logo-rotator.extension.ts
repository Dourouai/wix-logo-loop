import { extensions } from '@wix/astro/builders';

export default extensions.customElement({
  id: 'a36a7af0-c6c1-4f1a-84e2-ff76f0e795eb',
  name: 'Zider Trusted Logo Rotator',
  width: {
    defaultWidth: 960,
    allowStretch: true,
    stretchByDefault: true,
  },
  height: {
    defaultHeight: 96,
    heightMode: 'AUTO',
  },
  installation: {
    autoAdd: false,
  },
  presets: [
    {
      id: 'c0626cd1-b04a-4465-968d-f663e2b8a2c8',
      name: 'Trusted Logo Rotator',
      thumbnailUrl: '{{BASE_URL}}/trusted-logo-rotator-preview.svg',
    },
  ],
  behaviors: {
    dashboard: {
      dashboardPageComponentId: '7b2463ea-a8a4-4754-b79e-9782bd721150',
    },
  },
  tagName: 'zider-trusted-logo-rotator',
  element: './extensions/site/trusted-logo-rotator/trusted-logo-rotator.ts',
  settings: './extensions/site/trusted-logo-rotator/trusted-logo-rotator.panel.tsx',
});
