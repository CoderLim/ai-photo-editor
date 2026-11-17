import { envConfigs } from '@/config';

/** Public brand identity; no unverified legal entity or personal credentials. */
export const sitePublisher = {
  '@type': 'Organization',
  '@id': `${envConfigs.app_url}/#organization`,
  name: 'GetAIPhotoEditor',
  url: `${envConfigs.app_url}/about`,
  email: 'support@getaiphotoeditor.com',
};
