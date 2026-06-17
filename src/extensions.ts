import { app } from '@wix/astro/builders';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';
import logoLoop from './extensions/site/logo-loop/logo-loop.extension.ts';
import trustedLogoRotator from './extensions/site/trusted-logo-rotator/trusted-logo-rotator.extension.ts';

export default app()
  .use(myPage)
  .use(logoLoop)
  .use(trustedLogoRotator)
