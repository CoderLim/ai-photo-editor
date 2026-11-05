import { FalProvider, ReplicateProvider, AIMediaType, type AIProvider } from '@/core/ai';
import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';
import { FAL_EDIT_MODEL, REPLICATE_EDIT_MODEL } from './config';

export async function createPhotoProvider(provider: string): Promise<{ instance: AIProvider; model: string }> {
  const configs = await getAllConfigs();
  if (provider === 'fal') {
    if (!configs.fal_api_key) throw new Error('fal API key is not configured');
    return {
      instance: new FalProvider({ apiKey: configs.fal_api_key }),
      model: FAL_EDIT_MODEL,
    };
  }
  if (provider !== 'replicate') throw new Error('Unsupported image provider');
  if (!configs.replicate_api_token) throw new Error('Replicate API token is not configured');
  return {
    instance: new ReplicateProvider({ apiToken: configs.replicate_api_token }),
    model: REPLICATE_EDIT_MODEL,
  };
}

export async function getSelectedPhotoProvider() {
  const configs = await getAllConfigs();
  // Manual operator setting. Do NOT automatically create another paid job if
  // the first provider accepted a request but failed to return a response.
  return configs.photo_editor_provider === 'fal' ? 'fal' : 'replicate';
}

export function photoModelInput(provider: string, imageUrl: string) {
  if (provider === 'fal') {
    return {
      image_urls: [imageUrl],
      aspect_ratio: 'auto',
      resolution: '1K',
      output_format: 'png',
    };
  }
  return {
    image_input: [imageUrl],
    aspect_ratio: 'match_input_image',
    resolution: '1K',
    output_format: 'png',
    google_search: false,
    image_search: false,
  };
}

export async function persistPhotoOutput(sourceUrl: string, taskId: string) {
  const storage = await getStorage();
  if (!storage) {
    // Local development only; production must configure R2.
    return sourceUrl;
  }
  const saved = await storage.downloadAndUpload({
    url: sourceUrl,
    key: 'photo-editor/' + taskId + '-' + crypto.randomUUID() + '.png',
    contentType: 'image/png',
  });
  if (!saved.success || !saved.url) throw new Error('Failed to store edited photo');
  return saved.url;
}
