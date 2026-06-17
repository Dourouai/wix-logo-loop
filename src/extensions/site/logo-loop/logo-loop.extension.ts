import { extensions } from '@wix/astro/builders';

export default extensions.customElement({
  id: 'bceca584-b8c9-48c8-9e14-9c78334bfdf8',
  name: 'Zider Logo Loop',
  width: {
    defaultWidth: 960,
    allowStretch: true,
    stretchByDefault: true,
  },
  height: {
    defaultHeight: 50,
    heightMode: 'AUTO',
  },
  installation: {
    autoAdd: false,
  },
  presets: [
    {
      id: '5e445e70-080b-45b2-bdbd-e5414a69982c',
      name: 'Logo Loop',
      thumbnailUrl: '{{BASE_URL}}/logo-loop-preview.svg',
    },
  ],
  behaviors: {
    dashboard: {
      dashboardPageComponentId: '7b2463ea-a8a4-4754-b79e-9782bd721150',
    },
  },
  tagName: 'zider-logo-loop',
  element: './extensions/site/logo-loop/logo-loop.ts',
  settings: './extensions/site/logo-loop/logo-loop.panel.tsx',
});
