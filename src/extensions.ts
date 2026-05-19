import { app } from '@wix/astro/builders';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';
import logoLoop from './extensions/site/logo-loop/logo-loop.extension.ts';

export default app()
  .use(myPage)
  .use(logoLoop)
