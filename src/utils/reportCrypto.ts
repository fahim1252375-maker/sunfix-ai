import type { DiagnosticCase, EvidenceRecord, ServiceReport, WorkOrder } from '../types/sunfix';

export interface CanonicalReportPayload {
  schemaVersion: 'sunfix-fieldproof-v3';
  reportCode: string;
  title: string;
  status: ServiceReport['status'];
  createdAt: string;
  isSimulated: boolean;
  assetId: string;
  caseId: string;
  faultCode: string;
  inferenceSource: string;
  stopWork: boolean;
  summary: string;
  estimatedImpactKwh: number | null;
  outstandingIssues: string;
  sourceIds: string[];
  evidenceIds: string[];
  workOrderStatus: string;
}

/**
 * Recursively sorts object keys so canonical serialization is deterministic across engines.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalizeJson(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return `{${entries.join(',')}}`;
}

export function buildCanonicalReportPayload(params: {
  report: ServiceReport;
  linkedCase?: DiagnosticCase;
  linkedWo?: WorkOrder;
  linkedEvidence: EvidenceRecord[];
}): CanonicalReportPayload {
  return {
    schemaVersion: 'sunfix-fieldproof-v3',
    reportCode: params.report.reportCode,
    title: params.report.title,
    status: params.report.status,
    createdAt: params.report.createdAt,
    isSimulated: params.report.isSimulated,
    assetId: params.report.assetId,
    caseId: params.report.caseId,
    faultCode: params.linkedCase?.faultCode || '',
    inferenceSource: params.linkedCase?.inferenceRecord.inferenceSource || 'demo_rules',
    stopWork: Boolean(params.linkedCase?.stopWork),
    summary: params.report.summary,
    estimatedImpactKwh:
      typeof params.report.estimatedImpactKwh === 'number'
        ? params.report.estimatedImpactKwh
        : null,
    outstandingIssues: params.report.outstandingIssues,
    sourceIds: [...(params.report.sourceIds || [])].sort(),
    evidenceIds: params.linkedEvidence.map((e) => e.id).sort(),
    workOrderStatus: params.linkedWo?.status || 'none',
  };
}

export async function computeCanonicalSha256(payload: unknown): Promise<string> {
  const canonical = canonicalizeJson(payload);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ReportVerificationEnvelope {
  payload: CanonicalReportPayload;
  sha256: string;
}

export async function verifyReportEnvelopeJson(
  rawJson: string,
  expectedHashOverride?: string,
): Promise<{
  ok: boolean;
  computedHash: string;
  expectedHash: string;
  error?: string;
  reportCode?: string;
}> {
  try {
    const parsed = JSON.parse(rawJson) as Partial<ReportVerificationEnvelope> & Partial<CanonicalReportPayload>;
    const payload = parsed.payload ? parsed.payload : (parsed as CanonicalReportPayload);
    const expectedHash = (expectedHashOverride || parsed.sha256 || '').trim().toLowerCase();

    if (!payload || typeof payload !== 'object' || !payload.reportCode) {
      return {
        ok: false,
        computedHash: '',
        expectedHash,
        error: 'Invalid FieldProof report JSON envelope: missing payload or reportCode.',
      };
    }

    const computedHash = await computeCanonicalSha256(payload);
    if (!expectedHash) {
      return {
        ok: false,
        computedHash,
        expectedHash: '',
        reportCode: payload.reportCode,
        error: 'No SHA-256 checksum supplied to compare against.',
      };
    }

    return {
      ok: computedHash === expectedHash,
      computedHash,
      expectedHash,
      reportCode: payload.reportCode,
      error: computedHash === expectedHash ? undefined : 'SHA-256 checksum mismatch (document altered).',
    };
  } catch (err) {
    return {
      ok: false,
      computedHash: '',
      expectedHash: expectedHashOverride || '',
      error: err instanceof Error ? err.message : 'Unable to parse report JSON.',
    };
  }
}
