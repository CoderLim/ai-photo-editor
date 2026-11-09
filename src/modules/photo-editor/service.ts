import { FalProvider, ReplicateProvider, type AIProvider } from '@/core/ai';
import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';
import { isCloudflareWorker, isProduction } from '@/lib/env';

import {
  FAL_BACKGROUND_REMOVAL_MODEL,
  FAL_EDIT_MODEL,
  REPLICATE_EDIT_MODEL,
  type PhotoEditQuality,
} from './config';

export async function createPhotoProvider(
  provider: string,
  task: 'edit' | 'remove-background' = 'edit'
): Promise<{ instance: AIProvider; model: string }> {
  const configs = await getAllConfigs();
  if (provider === 'fal') {
    if (!configs.fal_api_key) throw new Error('fal API key is not configured');
    return {
      instance: new FalProvider({ apiKey: configs.fal_api_key }),
      model:
        task === 'remove-background'
          ? FAL_BACKGROUND_REMOVAL_MODEL
          : FAL_EDIT_MODEL,
    };
  }
  if (task === 'remove-background')
    throw new Error('Background removal requires fal');
  if (provider !== 'replicate') throw new Error('Unsupported image provider');
  if (!configs.replicate_api_token)
    throw new Error('Replicate API token is not configured');
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

/**
 * Provider payload for GPT Image 2.6. Fal edit uses `image_urls`, `quality`,
 * and `image_size` (not Nano Banana's `resolution` / `aspect_ratio`).
 * Replicate's Flare model edits through `input_images` and the same `quality`
 * enum. `auto` keeps the source aspect ratio near a 1024px output.
 */
export function photoModelInput(
  provider: string,
  imageUrl: string,
  quality: PhotoEditQuality
) {
  if (provider === 'fal') {
    return {
      image_urls: [imageUrl],
      image_size: 'auto',
      quality,
      num_images: 1,
      output_format: 'png',
    };
  }
  if (provider === 'replicate') {
    return {
      input_images: [imageUrl],
      aspect_ratio: 'auto',
      quality,
      number_of_images: 1,
      output_format: 'png',
    };
  }
  throw new Error('Unsupported image provider');
}

export async function persistPhotoOutput(sourceUrl: string, taskId: string) {
  const storage = await getStorage();
  if (!storage) {
    // Local/dev only. Production and Cloudflare Workers must not mark success
    // with a temporary provider URL that can disappear. Workers builds usually
    // set NODE_ENV=production; also gate on the runtime detect as a backup.
    if (isProduction || isCloudflareWorker) {
      throw new Error('Photo storage is not configured');
    }
    return sourceUrl;
  }
  // Deterministic key so concurrent webhook/poll settlers overwrite one object
  // instead of leaving orphan uploads.
  const saved = await storage.downloadAndUpload({
    url: sourceUrl,
    key: 'photo-editor/' + taskId + '.png',
    contentType: 'image/png',
  });
  if (!saved.success || !saved.url)
    throw new Error('Failed to store edited photo');
  return saved.url;
}
