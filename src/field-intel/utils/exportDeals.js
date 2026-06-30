import { exportSurgeonsCSV } from './exportSurgeons';

// Phase 1 wrapper for Deal Review's export button.
// Pulls the same column schema as the surgeon export, scoped + filtered to forecasted deals
// closing on or before closeDateMax. Format: 'csv' (default) or 'xlsx'.
export const exportDeals = async ({
  scope,
  closeDateMax,
  format = 'csv',
  onProgress,
}) => {
  return exportSurgeonsCSV(scope, 'deal-review-export', onProgress, {
    closeDateMax,
    format,
  });
};
