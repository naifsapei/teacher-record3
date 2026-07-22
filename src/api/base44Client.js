import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const missingConfig = [];
if (!appId) missingConfig.push('VITE_BASE44_APP_ID');
if (!appBaseUrl) missingConfig.push('VITE_BASE44_APP_BASE_URL');

if (missingConfig.length > 0 && typeof window !== 'undefined') {
  console.warn(`[Base44] Missing config: ${missingConfig.join(', ')}`);
}

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});
