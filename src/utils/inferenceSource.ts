import type { InferenceSourceKind } from '../types/sunfix';

export type RequestedInferenceMode = 'prefer_on_device' | 'only_in_cloud';

export function mapInferenceSource(
  source: 'on_device' | 'in_cloud' | undefined,
  requestedMode: RequestedInferenceMode,
): InferenceSourceKind {
  if (source === 'on_device') return 'on_device';
  if (source === 'in_cloud') return 'in_cloud';

  // ONLY_IN_CLOUD cannot run locally. A hybrid response with no SDK source must
  // stay explicitly unknown instead of being misreported as cloud inference.
  return requestedMode === 'only_in_cloud' ? 'in_cloud' : 'unavailable';
}
