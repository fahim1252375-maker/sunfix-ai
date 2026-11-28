import type { Asset } from '../types/sunfix';

export type WorkspaceAssetIssueReason =
  | 'asset_not_object'
  | 'asset_invalid_shape'
  | 'component_not_object'
  | 'component_missing_id';

export interface WorkspaceAssetIssue {
  /** Index-only path: diagnostic output never includes persisted record contents. */
  path: string;
  reason: WorkspaceAssetIssueReason;
}

export interface WorkspaceAssetValidationResult {
  assets: Asset[];
  issues: WorkspaceAssetIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns render-safe asset records without mutating persisted IndexedDB data.
 * Assets with an empty component list remain valid; malformed component entries
 * are omitted so a single bad nested record cannot crash asset/twin views.
 */
export function validateWorkspaceAssets(input: unknown): WorkspaceAssetValidationResult {
  const assets: Asset[] = [];
  const issues: WorkspaceAssetIssue[] = [];

  if (!Array.isArray(input)) {
    return { assets, issues: [{ path: 'assets', reason: 'asset_invalid_shape' }] };
  }

  input.forEach((candidate: unknown, assetIndex: number) => {
    const assetPath = `assets[${assetIndex}]`;

    if (!isRecord(candidate)) {
      issues.push({ path: assetPath, reason: 'asset_not_object' });
      return;
    }

    if (
      typeof candidate.id !== 'string'
      || typeof candidate.name !== 'string'
      || !Array.isArray(candidate.components)
    ) {
      issues.push({ path: assetPath, reason: 'asset_invalid_shape' });
      return;
    }

    const components: Record<string, unknown>[] = [];
    candidate.components.forEach((component: unknown, componentIndex: number) => {
      const componentPath = `${assetPath}.components[${componentIndex}]`;

      if (!isRecord(component)) {
        issues.push({ path: componentPath, reason: 'component_not_object' });
        return;
      }

      if (typeof component.id !== 'string') {
        issues.push({ path: componentPath, reason: 'component_missing_id' });
        return;
      }

      components.push(component);
    });

    assets.push({ ...candidate, components } as unknown as Asset);
  });

  return { assets, issues };
}
