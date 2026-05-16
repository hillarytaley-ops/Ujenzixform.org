import { describe, expect, it } from 'vitest';
import {
  buildDeliveryPrefillContext,
  extractCoreProjectName,
  looksLikeProjectSiteLabel,
  sanitizeCoordinatesForPrefill,
  sanitizeDeliveryAddressForPrefill,
} from '@/utils/deliveryAddressValidation';

describe('deliveryAddressValidation', () => {
  it('strips quote suffix from project name', () => {
    expect(extractCoreProjectName("Moi's Bridge Project - Quote from ABC")).toBe("Moi's Bridge Project");
  });

  it('treats project name and name-location as site labels', () => {
    expect(
      looksLikeProjectSiteLabel("Moi's Bridge Project - Moi's Bridge", {
        projectName: "Moi's Bridge Project",
      })
    ).toBe(true);
    expect(
      looksLikeProjectSiteLabel("Moi's Bridge Project - Moi's Bridge", {
        projectName: "Moi's Bridge Project - Quote from Supplier",
      })
    ).toBe(true);
    expect(looksLikeProjectSiteLabel('Test proj 1', { projectName: 'Test proj 1' })).toBe(true);
    expect(
      looksLikeProjectSiteLabel('401 - 10200, MURANGA TOWN', {
        projectName: '401',
        projectLocation: "10200, MURANGA TOWN",
      })
    ).toBe(true);
  });

  it('does not strip real street addresses', () => {
    expect(
      looksLikeProjectSiteLabel('123 Kenyatta Avenue, Nairobi', {
        projectName: 'Test proj 1',
      })
    ).toBe(false);
  });

  it('sanitize clears project labels for prefill', () => {
    const ctx = buildDeliveryPrefillContext({
      projectName: 'Test proj 1',
      projectLocation: 'Nairobi',
      deliveryAddress: 'Test proj 1 - Nairobi',
    });
    expect(sanitizeDeliveryAddressForPrefill('Test proj 1 - Nairobi', ctx)).toBe('');
    expect(
      sanitizeDeliveryAddressForPrefill("Moi's Bridge Project - Moi's Bridge", {
        projectName: "Moi's Bridge Project - Quote from X",
      })
    ).toBe('');
    expect(sanitizeDeliveryAddressForPrefill('14 Riverside Drive', { projectName: 'Test proj 1' })).toBe(
      '14 Riverside Drive'
    );
  });

  it('sanitizeCoordinates rejects non-GPS text', () => {
    expect(sanitizeCoordinatesForPrefill('401 - 10200, MURANGA TOWN')).toBe('');
    expect(sanitizeCoordinatesForPrefill('-1.286389, 36.817223')).toBe('-1.286389, 36.817223');
  });
});
