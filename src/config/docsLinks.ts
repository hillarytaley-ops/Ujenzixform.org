/**
 * Links to markdown in the GitHub repo (SPA does not serve /docs).
 * Override with VITE_DOCS_REPO_BASE if you fork (no trailing slash), e.g.
 * https://github.com/you/your-fork/blob/main
 */
const REPO_DOC_BASE =
  (import.meta.env.VITE_DOCS_REPO_BASE as string | undefined)?.replace(/\/$/, '') ||
  'https://github.com/hillarytaley-ops/Ujenzixform.org/blob/main';

export const DOCS_MEDIAMTX_RTSP_TO_HLS = `${REPO_DOC_BASE}/docs/examples/mediamtx-rtsp-to-hls/README.md`;
export const DOCS_INFRA_VENDOR_ML_BOUNDARIES = `${REPO_DOC_BASE}/docs/INFRA_VENDOR_ML_BOUNDARIES.md`;
export const DOCS_MONITORING_VISION_STATUS = `${REPO_DOC_BASE}/docs/MONITORING_AND_VISION_STATUS.md`;
