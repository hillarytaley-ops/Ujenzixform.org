/** localStorage keys so supplier flows link POs to the builder project selected in the dashboard. */
export const CART_PROJECT_ID_KEY = 'cart_project_id';
export const CART_PROJECT_NAME_KEY = 'cart_project_name';

export function getCartProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(CART_PROJECT_ID_KEY);
  if (!v || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return null;
  }
  return v;
}

export function getCartProjectName(): string | null {
  if (typeof window === 'undefined') return null;
  const n = localStorage.getItem(CART_PROJECT_NAME_KEY);
  return n?.trim() || null;
}

export function clearCartProjectContext(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_PROJECT_ID_KEY);
  localStorage.removeItem(CART_PROJECT_NAME_KEY);
}

/**
 * @param projectName - If omitted, leaves `cart_project_name` unchanged (only updates id).
 *  Pass a string to set; pass null or "" to clear the stored name.
 */
export function setCartProjectContext(projectId: string, projectName?: string | null): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_PROJECT_ID_KEY, projectId);
  if (arguments.length < 2) return;
  if (projectName != null && String(projectName).trim()) {
    localStorage.setItem(CART_PROJECT_NAME_KEY, String(projectName).trim());
  } else {
    localStorage.removeItem(CART_PROJECT_NAME_KEY);
  }
}
