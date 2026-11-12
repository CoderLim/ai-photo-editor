import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PromptScanVerdict } from '@/core/content-safety/waffo-scan';

import { assertPromptAllowed, PromptSafetyError } from './prompt-safety';

const configs = {
  waffo_merchant_id: 'MER_abcdefghijklmnopqrstuv',
  // Placeholder only — scan is mocked; avoid PEM markers that trip secret scanners.
  waffo_private_key: 'test-waffo-private-key-placeholder',
};

function verdict(
  overrides: Partial<PromptScanVerdict> = {}
): PromptScanVerdict {
  return {
    action: 'allow',
    reasonCode: 'allowed',
    requestId: 'REQ_test',
    matchedCategories: [],
    ...overrides,
  };
}

test('assertPromptAllowed skips when credentials are missing', async () => {
  let called = 0;
  await assertPromptAllowed('a cat', {}, async () => {
    called += 1;
    return verdict();
  });
  assert.equal(called, 0);
});

test('assertPromptAllowed allows when action is allow', async () => {
  await assertPromptAllowed('a cat', configs, async () => verdict());
});

test('assertPromptAllowed blocks restricted prompts', async () => {
  await assert.rejects(
    () =>
      assertPromptAllowed('bad', configs, async () =>
        verdict({
          action: 'block',
          reasonCode: 'restricted_content',
        })
      ),
    (error: unknown) => {
      assert.ok(error instanceof PromptSafetyError);
      assert.equal(error.code, 'PROMPT_BLOCKED');
      return true;
    }
  );
});

test('assertPromptAllowed rejects review_required', async () => {
  await assert.rejects(
    () =>
      assertPromptAllowed('maybe', configs, async () =>
        verdict({
          action: 'review',
          reasonCode: 'review_required',
        })
      ),
    (error: unknown) => {
      assert.ok(error instanceof PromptSafetyError);
      assert.equal(error.code, 'PROMPT_REVIEW');
      return true;
    }
  );
});

test('assertPromptAllowed fail-opens on service_degraded', async () => {
  await assertPromptAllowed('maybe', configs, async () =>
    verdict({
      action: 'review',
      reasonCode: 'service_degraded',
    })
  );
});

test('assertPromptAllowed fail-opens when the scan throws', async () => {
  await assertPromptAllowed('maybe', configs, async () => {
    throw new Error('network down');
  });
});
