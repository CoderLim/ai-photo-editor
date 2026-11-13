import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';

// Isolated SQLite database. Application modules load only after env is set.
const directory = await mkdtemp(join(tmpdir(), 'shipany-photo-edit-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${directory}/test.db`,
  AUTH_SECRET: 'isolated-photo-edit-test-secret-not-a-real-credential',
  NODE_ENV: 'test',
  VITE_APP_URL: 'http://localhost:3000',
  VITE_APP_NAME: 'GetAIPhotoEditor',
});
execFileSync(
  process.execPath,
  [
    'node_modules/drizzle-kit/bin.cjs',
    'push',
    '--dialect=sqlite',
    '--schema=./src/config/db/schema.sqlite.ts',
    `--url=${process.env.DATABASE_URL}`,
    '--force',
  ],
  { stdio: 'pipe', env: process.env }
);

const { db } = await import('../src/core/db');
const { aiTask, config, credit } = await import('../src/config/db/schema');
const { getAuth } = await import('../src/core/auth');
const { falQueueModel } = await import('../src/core/ai/fal');
const { getBalance, grant } = await import('../src/modules/credits/service');
const {
  DEFAULT_PHOTO_EDIT_QUALITY,
  EDIT_CREDITS,
  FAL_EDIT_MODEL,
  FAL_TEXT_TO_IMAGE_MODEL,
  FAL_BACKGROUND_REMOVAL_MODEL,
  BACKGROUND_REMOVAL_CREDITS,
  PHOTO_EDIT_MODEL_LABEL,
  PHOTO_EDIT_QUALITIES,
  PhotoEditQualityError,
  PhotoImageSizeError,
  REPLICATE_EDIT_MODEL,
  photoEditCharge,
  photoImageSize,
} = await import('../src/modules/photo-editor/config');
const {
  createPhotoProvider,
  getSelectedPhotoProvider,
  photoModelInput,
  photoTextToImageInput,
} = await import('../src/modules/photo-editor/service');
const { issueUploadToken } =
  await import('../src/modules/photo-editor/upload-token');
const { POST } = await import('../src/routes/api/photo-editor/edits');

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

const CREDIT_TABLE = {
  low: 6,
  medium: 10,
  high: 13,
  xhigh: 22,
  max: 50,
} as const;

test('quality credits match the published GPT Image 2.6 table', () => {
  assert.equal(DEFAULT_PHOTO_EDIT_QUALITY, 'medium');
  assert.equal(EDIT_CREDITS, 10);
  assert.equal(PHOTO_EDIT_MODEL_LABEL, 'GPT Image 2.6');
  assert.equal(FAL_EDIT_MODEL, 'openai/gpt-image-2.6/flare/edit');
  assert.equal(
    FAL_TEXT_TO_IMAGE_MODEL,
    'openai/gpt-image-2.6/flare/text-to-image'
  );
  assert.equal(REPLICATE_EDIT_MODEL, 'openai/gpt-image-2.6-flare');
  assert.deepEqual(
    PHOTO_EDIT_QUALITIES.map((item) => item.id),
    ['low', 'medium', 'high', 'xhigh', 'max']
  );
  for (const item of PHOTO_EDIT_QUALITIES) {
    assert.equal(item.credits, CREDIT_TABLE[item.id]);
    assert.equal(photoEditCharge(item.id).credits, CREDIT_TABLE[item.id]);
    assert.ok(item.label.length > 0);
    assert.ok(item.description.length > 10);
  }
  // photoEditCharge accepts only a quality. A credit amount is not an input.
  assert.equal(photoEditCharge.length, 1);
});

test('unknown or omitted quality is rejected', () => {
  for (const value of [
    undefined,
    null,
    '',
    'auto',
    '1K',
    'LOW',
    'Medium',
    'ultra',
    10,
    'medium ',
    'low,max',
  ]) {
    assert.throws(() => photoEditCharge(value), PhotoEditQualityError);
  }
});

test('new photo edits always select fal', async () => {
  assert.equal(await getSelectedPhotoProvider(), 'fal');
});

test('provider input uses GPT Image 2.6 fields, not Nano Banana resolution', () => {
  const url = 'https://cdn.example.test/photo.png';
  const mask = 'https://cdn.example.test/mask.png';
  assert.deepEqual(photoModelInput('fal', url, 'high'), {
    image_urls: [url],
    image_size: 'auto',
    quality: 'high',
    num_images: 1,
    output_format: 'png',
  });
  assert.deepEqual(photoModelInput('fal', url, 'high', mask), {
    image_urls: [url],
    image_size: 'auto',
    quality: 'high',
    num_images: 1,
    output_format: 'png',
    mask_url: mask,
  });
  assert.deepEqual(
    photoModelInput('fal', url, 'medium', undefined, 'landscape_16_9'),
    {
      image_urls: [url],
      image_size: 'landscape_16_9',
      quality: 'medium',
      num_images: 1,
      output_format: 'png',
    }
  );
  assert.equal('resolution' in photoModelInput('fal', url, 'low'), false);
  assert.deepEqual(photoModelInput('replicate', url, 'max'), {
    input_images: [url],
    aspect_ratio: 'auto',
    quality: 'max',
    number_of_images: 1,
    output_format: 'png',
  });
  assert.equal(
    'resolution' in photoModelInput('replicate', url, 'medium'),
    false
  );
  assert.equal(
    'image_input' in photoModelInput('replicate', url, 'medium'),
    false
  );
  assert.equal(
    'mask_url' in photoModelInput('replicate', url, 'medium', mask),
    false
  );
  assert.throws(() => photoModelInput('other', url, 'medium'), /Unsupported/);
});

test('text-to-image input uses image_size preset and no image_urls', () => {
  assert.deepEqual(photoTextToImageInput('medium'), {
    image_size: 'auto',
    quality: 'medium',
    num_images: 1,
    output_format: 'png',
  });
  assert.deepEqual(photoTextToImageInput('high', 'square'), {
    image_size: 'square',
    quality: 'high',
    num_images: 1,
    output_format: 'png',
  });
  assert.deepEqual(photoTextToImageInput('low', 'landscape_16_9'), {
    image_size: 'landscape_16_9',
    quality: 'low',
    num_images: 1,
    output_format: 'png',
  });
  assert.equal('image_urls' in photoTextToImageInput('high'), false);
});

test('photoImageSize accepts Fal presets and rejects unknown ratios', () => {
  assert.equal(photoImageSize(undefined), 'auto');
  assert.equal(photoImageSize(''), 'auto');
  assert.throws(() => photoImageSize('3:2'), PhotoImageSizeError);
  assert.throws(() => photoImageSize('portrait_9_16'), PhotoImageSizeError);
  assert.equal(photoImageSize('square'), 'square');
  assert.equal(photoImageSize('landscape_4_3'), 'landscape_4_3');
  assert.equal(photoImageSize('portrait_4_3'), 'portrait_4_3');
  assert.equal(photoImageSize('landscape_16_9'), 'landscape_16_9');
  assert.equal(photoImageSize('portrait_16_9'), 'portrait_16_9');
});

test('fal queue status/result URLs use owner/app only', () => {
  // Submit uses the full endpoint; poll must drop /flare/edit or Fal returns 405.
  assert.equal(falQueueModel(FAL_EDIT_MODEL), 'openai/gpt-image-2.6');
  assert.equal(falQueueModel(FAL_TEXT_TO_IMAGE_MODEL), 'openai/gpt-image-2.6');
  assert.equal(falQueueModel(FAL_BACKGROUND_REMOVAL_MODEL), 'fal-ai/bria');
  assert.equal(
    falQueueModel('openai/gpt-image-2.6/sunburst/edit'),
    'openai/gpt-image-2.6'
  );
  assert.equal(
    falQueueModel('google/nano-banana-2.1/edit'),
    'google/nano-banana-2.1'
  );
  assert.equal(falQueueModel('fal-ai/flux/schnell'), 'fal-ai/flux');
  assert.equal(falQueueModel('owner/name'), 'owner/name');
});

test('edit API charges the server quality price and ignores client amounts', async () => {
  await db()
    .insert(config)
    .values([
      { name: 'r2_domain', value: 'https://cdn.example.test' },
      { name: 'fal_api_key', value: 'test-only-fal-key' },
      { name: 'replicate_api_token', value: 'test-only-replicate-token' },
      { name: 'photo_editor_provider', value: 'fal' },
    ]);

  assert.equal((await createPhotoProvider('fal')).model, FAL_EDIT_MODEL);
  assert.equal(
    (await createPhotoProvider('fal', 'text-to-image')).model,
    FAL_TEXT_TO_IMAGE_MODEL
  );
  assert.equal(
    (await createPhotoProvider('fal', 'remove-background')).model,
    FAL_BACKGROUND_REMOVAL_MODEL
  );
  assert.equal(
    (await createPhotoProvider('replicate')).model,
    REPLICATE_EDIT_MODEL
  );

  const auth = getAuth();
  const signup = await auth.handler(
    new Request('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        name: 'Editor',
        email: 'photo-edit@example.com',
        password: 'test-password-1',
      }),
    })
  );
  const signupBody = await signup.text();
  assert.equal(signup.status, 200, signupBody);
  const userId = JSON.parse(signupBody).user.id as string;
  // This test isolates server-selected edit prices from the separate,
  // newly enabled one-time 10-credit sign-up promotion.
  await db().delete(credit).where(eq(credit.userId, userId));
  const lines: string[] = signup.headers.getSetCookie?.() ?? [];
  const cookie = lines
    .map((line) => line.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
  assert.match(cookie, /session_token=/);

  const imageUrl = 'https://cdn.example.test/photo-editor/sample.png';
  const uploadToken = await issueUploadToken(userId, imageUrl);
  const calls: Array<{
    url: string;
    body: Record<string, unknown>;
    auth: string;
  }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('queue.fal.run')) {
      calls.push({
        url,
        body: JSON.parse(String(init?.body || '{}')),
        auth: new Headers(init?.headers).get('authorization') || '',
      });
      return new Response(JSON.stringify({ request_id: 'req-test' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };

  const post = async (extra: Record<string, unknown>) => {
    (
      globalThis as { __minIntervalRateLimitStore?: Map<string, number> }
    ).__minIntervalRateLimitStore?.clear();
    const response = await POST({
      request: new Request('http://localhost:3000/api/photo-editor/edits', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          imageUrl,
          uploadToken,
          prompt: 'Remove the passerby and keep the subject.',
          tool: 'general',
          credits: 1,
          costCredits: 1,
          model: 'google/nano-banana-2.1',
          provider: 'replicate',
          price: 0,
          ...extra,
        }),
      }),
    });
    return { status: response.status, payload: await response.json() };
  };

  try {
    await grant({ userId, credits: 12, description: 'test' });
    assert.equal(await getBalance(userId), 12);

    const omitted = await post({ requestId: 'request-omitted-1' });
    assert.equal(omitted.status, 400);
    assert.equal(omitted.payload.code, -1);
    assert.match(omitted.payload.message, /quality/i);
    assert.equal(await getBalance(userId), 12);
    assert.equal(calls.length, 0);

    const invalid = await post({
      requestId: 'request-invalid-1',
      quality: 'auto',
    });
    assert.equal(invalid.status, 400);
    assert.match(invalid.payload.message, /quality/i);
    assert.equal(await getBalance(userId), 12);
    assert.equal(calls.length, 0);

    // 12 credits cannot pay for high (13), even if the client says it costs 1.
    const tooPoor = await post({
      requestId: 'request-high-poor',
      quality: 'high',
    });
    assert.equal(tooPoor.status, 402);
    assert.equal(tooPoor.payload.message, 'CREDITS_INSUFFICIENT');
    assert.equal(await getBalance(userId), 12);
    assert.equal(calls.length, 0);

    await grant({ userId, credits: 200, description: 'more' });
    let balance = await getBalance(userId);

    for (const [quality, credits] of Object.entries(CREDIT_TABLE)) {
      const result = await post({
        requestId: `request-${quality}-0001`,
        quality,
      });
      assert.equal(result.payload.code, 0, JSON.stringify(result.payload));
      assert.equal(result.payload.data.credits, credits);
      balance -= credits;
      assert.equal(await getBalance(userId), balance);

      const call = calls.at(-1)!;
      assert.match(call.url, /openai\/gpt-image-2\.6\/flare\/edit$/);
      assert.equal(call.body.quality, quality);
      assert.deepEqual(call.body.image_urls, [imageUrl]);
      assert.equal(call.body.image_size, 'auto');
      assert.equal('resolution' in call.body, false);
      assert.equal('credits' in call.body, false);
      assert.equal('costCredits' in call.body, false);
      assert.equal(call.auth, 'Key test-only-fal-key');

      const [task] = await db()
        .select()
        .from(aiTask)
        .where(eq(aiTask.id, result.payload.data.jobId));
      assert.equal(task.costCredits, credits);
      assert.equal(task.model, FAL_EDIT_MODEL);
      assert.equal(task.provider, 'fal');
      assert.equal(JSON.parse(task.options || '{}').quality, quality);
    }

    // Automatic background removal has a fixed price and no guided prompt.
    const backgroundResult = await post({
      requestId: 'request-background-0001',
      tool: 'remove-background',
      quality: 'max',
      prompt: 'Pretend this costs nothing',
      credits: 0,
      costCredits: 0,
    });
    assert.equal(
      backgroundResult.payload.code,
      0,
      JSON.stringify(backgroundResult.payload)
    );
    assert.equal(
      backgroundResult.payload.data.credits,
      BACKGROUND_REMOVAL_CREDITS
    );
    balance -= BACKGROUND_REMOVAL_CREDITS;
    assert.equal(await getBalance(userId), balance);
    const backgroundCall = calls.at(-1)!;
    assert.match(backgroundCall.url, /fal-ai\/bria\/background\/remove$/);
    assert.deepEqual(backgroundCall.body, { image_url: imageUrl });
    const [backgroundTask] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, backgroundResult.payload.data.jobId));
    assert.equal(backgroundTask.provider, 'fal');
    assert.equal(backgroundTask.model, FAL_BACKGROUND_REMOVAL_MODEL);
    assert.equal(backgroundTask.costCredits, BACKGROUND_REMOVAL_CREDITS);
    assert.equal(
      JSON.parse(backgroundTask.options || '{}').tool,
      'remove-background'
    );

    // Only the owner of an uploaded mask can submit it. Rejected masks
    // must not spend credits or create a provider task.
    const maskUrl = 'https://cdn.example.test/photo-editor/precision-mask.png';
    const balanceBeforeMask = await getBalance(userId);
    const callsBeforeMask = calls.length;
    const rejectedMask = await post({
      requestId: 'request-mask-rejected-0001',
      quality: 'low',
      maskUrl,
      maskUploadToken: 'invalid',
    });
    assert.equal(rejectedMask.status, 403);
    assert.match(rejectedMask.payload.message, /mask you own/i);
    assert.equal(await getBalance(userId), balanceBeforeMask);
    assert.equal(calls.length, callsBeforeMask);

    const maskUploadToken = await issueUploadToken(userId, maskUrl);
    const maskedEdit = await post({
      requestId: 'request-mask-accepted-0001',
      quality: 'low',
      maskUrl,
      maskUploadToken,
    });
    assert.equal(maskedEdit.status, 200);
    assert.equal(maskedEdit.payload.code, 0);
    assert.equal(calls.length, callsBeforeMask + 1);
    assert.equal(calls.at(-1)?.body.mask_url, maskUrl);
    balance -= CREDIT_TABLE.low;
    assert.equal(await getBalance(userId), balance);
    const [maskedTask] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, maskedEdit.payload.data.jobId));
    assert.equal(JSON.parse(maskedTask.options || '{}').maskUrl, maskUrl);

    // Unprompted segmentation never accepts masks, even with a valid token.
    const maskOnRemoval = await post({
      requestId: 'request-mask-rmbg-0001',
      tool: 'remove-background',
      maskUrl,
      maskUploadToken,
    });
    assert.equal(maskOnRemoval.status, 400);
    assert.equal(await getBalance(userId), balance);

    const first = await post({
      requestId: 'request-replay-0001',
      quality: 'medium',
    });
    const replayBalance = await getBalance(userId);
    const replay = await post({
      requestId: 'request-replay-0001',
      quality: 'medium',
      credits: 1,
    });
    assert.equal(replay.payload.data.jobId, first.payload.data.jobId);
    assert.equal(replay.payload.data.credits, 10);
    assert.equal(await getBalance(userId), replayBalance);

    // Homepage text-to-image: empty imageUrl on general only.
    const callsBeforeT2i = calls.length;
    const t2iBalanceBefore = await getBalance(userId);
    const t2i = await post({
      requestId: 'request-t2i-medium-0001',
      quality: 'medium',
      imageUrl: '',
      uploadToken: '',
      prompt: 'A red fox in snowy woods at golden hour.',
    });
    assert.equal(t2i.payload.code, 0, JSON.stringify(t2i.payload));
    assert.equal(t2i.payload.data.credits, CREDIT_TABLE.medium);
    assert.equal(
      await getBalance(userId),
      t2iBalanceBefore - CREDIT_TABLE.medium
    );
    assert.equal(calls.length, callsBeforeT2i + 1);
    const t2iCall = calls.at(-1)!;
    assert.match(t2iCall.url, /openai\/gpt-image-2\.6\/flare\/text-to-image$/);
    assert.equal(t2iCall.body.image_size, 'auto');
    assert.equal(t2iCall.body.quality, 'medium');
    assert.equal('image_urls' in t2iCall.body, false);
    const [t2iTask] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, t2i.payload.data.jobId));
    assert.equal(t2iTask.model, FAL_TEXT_TO_IMAGE_MODEL);
    assert.equal(JSON.parse(t2iTask.options || '{}').mode, 'text-to-image');
    assert.equal(JSON.parse(t2iTask.options || '{}').imageSize, 'auto');
    assert.equal('imageUrl' in JSON.parse(t2iTask.options || '{}'), false);

    const t2iSquare = await post({
      requestId: 'request-t2i-square-0001',
      quality: 'low',
      imageUrl: '',
      uploadToken: '',
      imageSize: 'square',
      prompt: 'A square sticker of a fox.',
    });
    assert.equal(t2iSquare.payload.code, 0, JSON.stringify(t2iSquare.payload));
    assert.equal(calls.at(-1)!.body.image_size, 'square');

    const t2iBadSize = await post({
      requestId: 'request-t2i-bad-size-0001',
      quality: 'low',
      imageUrl: '',
      uploadToken: '',
      imageSize: '3:2',
      prompt: 'Should reject this ratio.',
    });
    assert.equal(t2iBadSize.status, 400);
    assert.match(t2iBadSize.payload.message, /aspect ratio/i);

    const t2iWithMask = await post({
      requestId: 'request-t2i-mask-0001',
      quality: 'low',
      imageUrl: '',
      uploadToken: '',
      maskUrl,
      maskUploadToken,
    });
    assert.equal(t2iWithMask.status, 400);
    assert.match(t2iWithMask.payload.message, /text-to-image/i);

    const noImageBg = await post({
      requestId: 'request-rmbg-no-image-0001',
      tool: 'remove-background',
      imageUrl: '',
      uploadToken: '',
    });
    assert.equal(noImageBg.payload.code, -1);
    assert.match(noImageBg.payload.message, /Invalid image URL/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
