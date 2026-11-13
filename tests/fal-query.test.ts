import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  extractFalErrorMessage,
  FalProvider,
  isFalClientErrorStatus,
} from '../src/core/ai/fal';
import { AIMediaType, AITaskStatus } from '../src/core/ai/types';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('extractFalErrorMessage reads top-level detail arrays (content policy 422)', () => {
  assert.equal(
    extractFalErrorMessage({
      detail: [
        {
          loc: ['body', 'prompt'],
          msg: 'The content could not be processed because it contained material flagged by a content checker.',
          type: 'content_policy_violation',
        },
      ],
    }),
    'The content could not be processed because it contained material flagged by a content checker.'
  );
  assert.equal(
    extractFalErrorMessage({ error: 'runner exploded' }),
    'runner exploded'
  );
  assert.equal(
    extractFalErrorMessage({
      payload: { detail: 'payload detail wins after top-level miss' },
    }),
    'payload detail wins after top-level miss'
  );
});

test('isFalClientErrorStatus treats 422 as terminal and 502 as transient', () => {
  assert.equal(isFalClientErrorStatus(422), true);
  assert.equal(isFalClientErrorStatus(400), true);
  assert.equal(isFalClientErrorStatus(408), false);
  assert.equal(isFalClientErrorStatus(429), false);
  assert.equal(isFalClientErrorStatus(502), false);
});

test('FalProvider.query marks HTTP 422 status as FAILED with content message', async () => {
  const provider = new FalProvider({ apiKey: 'test-only-fal-key' });
  globalThis.fetch = async (input) => {
    const url = String(input);
    assert.match(url, /\/status$/);
    return new Response(
      JSON.stringify({
        detail: [
          {
            loc: ['body', 'prompt'],
            msg: 'The content could not be processed because it contained material flagged by a content checker.',
            type: 'content_policy_violation',
          },
        ],
      }),
      { status: 422, headers: { 'content-type': 'application/json' } }
    );
  };

  const result = await provider.query({
    taskId: 'req-content-policy',
    model: 'openai/gpt-image-2.6/flare/text-to-image',
    mediaType: AIMediaType.IMAGE,
  });

  assert.equal(result.taskStatus, AITaskStatus.FAILED);
  assert.match(result.taskInfo?.errorMessage || '', /content checker/i);
});

test('FalProvider.query marks COMPLETED status with error fields as FAILED', async () => {
  const provider = new FalProvider({ apiKey: 'test-only-fal-key' });
  globalThis.fetch = async (input) => {
    const url = String(input);
    assert.match(url, /\/status$/);
    return new Response(
      JSON.stringify({
        status: 'COMPLETED',
        error:
          'The content could not be processed because it contained material flagged by a content checker.',
        error_type: 'content_policy_violation',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  };

  const result = await provider.query({
    taskId: 'req-completed-error',
    model: 'openai/gpt-image-2.6/flare/edit',
    mediaType: AIMediaType.IMAGE,
  });

  assert.equal(result.taskStatus, AITaskStatus.FAILED);
  assert.equal(result.taskInfo?.errorCode, 'content_policy_violation');
  assert.match(result.taskInfo?.errorMessage || '', /content checker/i);
});

test('FalProvider.query marks HTTP 422 on result fetch as FAILED', async () => {
  const provider = new FalProvider({ apiKey: 'test-only-fal-key' });
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/status')) {
      return new Response(JSON.stringify({ status: 'COMPLETED' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        detail: [
          {
            msg: 'The content could not be processed because it contained material flagged by a content checker.',
            type: 'content_policy_violation',
          },
        ],
      }),
      { status: 422, headers: { 'content-type': 'application/json' } }
    );
  };

  const result = await provider.query({
    taskId: 'req-result-422',
    model: 'openai/gpt-image-2.6/flare/text-to-image',
    mediaType: AIMediaType.IMAGE,
  });

  assert.equal(result.taskStatus, AITaskStatus.FAILED);
  assert.match(result.taskInfo?.errorMessage || '', /content checker/i);
});
