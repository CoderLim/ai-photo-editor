import {
  ScanSemanticMode,
  WaffoPancake,
  WaffoPancakeError,
  type ScanResult,
} from '@waffo/pancake-ts';

export type PromptScanLocale = 'ja' | 'en' | 'zh';
export type PromptScanSemantic = 'off' | 'shadow' | 'enforce';

export type PromptScanVerdict = {
  action: 'allow' | 'review' | 'block';
  reasonCode: string;
  requestId: string;
  matchedCategories: string[];
};

export type ScanPromptWithWaffoParams = {
  merchantId: string;
  privateKey: string;
  prompt: string;
  locale?: PromptScanLocale;
  semantic?: PromptScanSemantic;
};

const SEMANTIC_MODE: Record<PromptScanSemantic, ScanSemanticMode> = {
  off: ScanSemanticMode.Off,
  shadow: ScanSemanticMode.Shadow,
  enforce: ScanSemanticMode.Enforce,
};

function normalizeVerdict(verdict: ScanResult): PromptScanVerdict {
  return {
    action: verdict.action,
    reasonCode: String(verdict.reasonCode),
    requestId: verdict.requestId,
    matchedCategories: (verdict.matchedCategories ?? []).map(String),
  };
}

/**
 * Call Waffo content-safety scan-prompt. Throws on HTTP/SDK failure so callers
 * can fail open. Never logs the prompt text.
 */
export async function scanPromptWithWaffo(
  params: ScanPromptWithWaffoParams
): Promise<PromptScanVerdict> {
  const client = new WaffoPancake({
    merchantId: params.merchantId,
    privateKey: params.privateKey,
  });
  try {
    const verdict = await client.contentSafety.scanPrompt({
      prompt: params.prompt,
      locale: params.locale ?? 'en',
      semantic: SEMANTIC_MODE[params.semantic ?? 'enforce'],
    });
    const normalized = normalizeVerdict(verdict);
    console.info('Waffo prompt scan', {
      requestId: normalized.requestId,
      action: normalized.action,
      reasonCode: normalized.reasonCode,
    });
    return normalized;
  } catch (error) {
    if (error instanceof WaffoPancakeError) {
      console.warn('Waffo prompt scan HTTP error', {
        status: error.status,
        message: error.message,
      });
    }
    throw error;
  }
}
