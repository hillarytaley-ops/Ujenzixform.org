// IP-based geofencing for sensitive operations
interface GeoLocation {
  country: string;
  region?: string;
  city?: string;
  ip: string;
}

interface GeofenceConfig {
  allowedCountries: string[];
  blockedCountries: string[];
  allowedIpRanges?: string[];
}

export class IpGeofencing {
  private static defaultConfig: GeofenceConfig = {
    allowedCountries: ['KE', 'US', 'GB', 'CA'], // Kenya, US, UK, Canada
    blockedCountries: [],
    allowedIpRanges: []
  };

  static async getCurrentLocation(): Promise<GeoLocation | null> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) return null;
      
      const data = await response.json();
      return {
        country: data.country_code || 'UNKNOWN',
        region: data.region,
        city: data.city,
        ip: data.ip
      };
    } catch (error) {
      console.error('Failed to get geolocation:', error);
      return null;
    }
  }

  static async isLocationAllowed(config: GeofenceConfig = this.defaultConfig): Promise<boolean> {
    const location = await this.getCurrentLocation();
    if (!location) return false; // Deny if unable to determine location

    // Check blocked countries first
    if (config.blockedCountries.includes(location.country)) {
      return false;
    }

    // Check allowed countries
    if (config.allowedCountries.length > 0 && !config.allowedCountries.includes(location.country)) {
      return false;
    }

    return true;
  }

  static async validateSensitiveOperation(operationType: string): Promise<{ allowed: boolean; reason?: string; location?: GeoLocation }> {
    const location = await this.getCurrentLocation();
    
    if (!location) {
      return {
        allowed: false,
        reason: 'Unable to verify location'
      };
    }

    const isAllowed = await this.isLocationAllowed();
    
    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Access denied from ${location.country}`,
        location
      };
    }

    return {
      allowed: true,
      location
    };
  }
}
