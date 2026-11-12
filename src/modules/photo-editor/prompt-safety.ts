import {
  scanPromptWithWaffo,
  type PromptScanVerdict,
  type ScanPromptWithWaffoParams,
} from '@/core/content-safety/waffo-scan';

export type PromptSafetyCode = 'PROMPT_BLOCKED' | 'PROMPT_REVIEW';

export class PromptSafetyError extends Error {
  readonly code: PromptSafetyCode;

  constructor(code: PromptSafetyCode, message: string) {
    super(message);
    this.name = 'PromptSafetyError';
    this.code = code;
  }
}

type PromptSafetyConfigs = {
  waffo_merchant_id?: string;
  waffo_private_key?: string;
};

type ScanFn = (params: ScanPromptWithWaffoParams) => Promise<PromptScanVerdict>;

/**
 * Pre-generation prompt gate. Always on when credentials exist.
 * Fail-open on missing credentials, transport errors, rate limits, and
 * Waffo `service_degraded`. Hard-stop only on `block` or `review_required`.
 */
export async function assertPromptAllowed(
  prompt: string,
  configs: PromptSafetyConfigs,
  scan: ScanFn = scanPromptWithWaffo
): Promise<void> {
  const merchantId = configs.waffo_merchant_id?.trim() || '';
  const privateKey = configs.waffo_private_key?.trim() || '';
  if (!merchantId || !privateKey) {
    console.warn('Waffo prompt scan skipped: missing merchant credentials');
    return;
  }

  let verdict: PromptScanVerdict;
  try {
    verdict = await scan({
      merchantId,
      privateKey,
      prompt,
      locale: 'en',
      semantic: 'enforce',
    });
  } catch (error) {
    console.warn(
      'Waffo prompt scan unavailable, allowing request',
      error instanceof Error ? error.message : error
    );
    return;
  }

  if (verdict.action === 'allow') return;

  if (
    verdict.action === 'review' &&
    verdict.reasonCode === 'service_degraded'
  ) {
    console.warn('Waffo prompt scan degraded, allowing request', {
      requestId: verdict.requestId,
      reasonCode: verdict.reasonCode,
    });
    return;
  }

  if (verdict.action === 'block') {
    console.info('Waffo prompt scan blocked', {
      requestId: verdict.requestId,
      reasonCode: verdict.reasonCode,
    });
    throw new PromptSafetyError(
      'PROMPT_BLOCKED',
      'This prompt doesn’t meet our content guidelines.'
    );
  }

  console.info('Waffo prompt scan review required', {
    requestId: verdict.requestId,
    reasonCode: verdict.reasonCode,
  });
  throw new PromptSafetyError(
    'PROMPT_REVIEW',
    'This prompt needs a quick review. Please try again later.'
  );
}
