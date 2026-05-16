import { describe, expect, it } from 'vitest';
import {
  looksLikeProjectSiteLabel,
  sanitizeDeliveryAddressForPrefill,
} from '@/utils/deliveryAddressValidation';

describe('deliveryAddressValidation', () => {
  it('treats project name and name-location as site labels', () => {
    expect(
      looksLikeProjectSiteLabel("Moi's Bridge Project - Moi's Bridge", {
        projectName: "Moi's Bridge Project",
      })
    ).toBe(true);
    expect(looksLikeProjectSiteLabel('Test proj 1', { projectName: 'Test proj 1' })).toBe(true);
  });

  it('does not strip real street addresses', () => {
    expect(
      looksLikeProjectSiteLabel('123 Kenyatta Avenue, Nairobi', {
        projectName: 'Test proj 1',
      })
    ).toBe(false);
  });

  it('sanitize clears project labels for prefill', () => {
    expect(
      sanitizeDeliveryAddressForPrefill('Test proj 1 - Nairobi', {
        projectName: 'Test proj 1',
      })
    ).toBe('');
    expect(sanitizeDeliveryAddressForPrefill('14 Riverside Drive', { projectName: 'Test proj 1' })).toBe(
      '14 Riverside Drive'
    );
  });
});
