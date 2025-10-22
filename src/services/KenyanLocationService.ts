interface County {
  id: number;
  name: string;
  code: string;
  region: string;
  population: number;
  majorTowns: string[];
  economicActivities: string[];
  constructionDemand: 'high' | 'medium' | 'low';
}

interface SubCounty {
  id: number;
  name: string;
  countyId: number;
  population: number;
  urbanization: 'urban' | 'peri-urban' | 'rural';
}

interface Ward {
  id: number;
  name: string;
  subCountyId: number;
  population: number;
  type: 'urban' | 'rural';
}

export class KenyanLocationService {
  private static counties: County[] = [
    // Major Counties with High Construction Activity
    {
      id: 1,
      name: "Nairobi",
      code: "NBI",
      region: "Central",
      population: 4397073,
      majorTowns: ["Nairobi CBD", "Westlands", "Karen", "Kasarani", "Embakasi"],
      economicActivities: ["Finance", "Technology", "Manufacturing", "Tourism", "Construction"],
      constructionDemand: "high"
    },
    {
      id: 2,
      name: "Kiambu",
      code: "KIA",
      region: "Central",
      population: 2417735,
      majorTowns: ["Thika", "Ruiru", "Kikuyu", "Limuru", "Kiambu Town"],
      economicActivities: ["Agriculture", "Manufacturing", "Real Estate", "Coffee"],
      constructionDemand: "high"
    },
    {
      id: 3,
      name: "Mombasa",
      code: "MSA",
      region: "Coast",
      population: 1208333,
      majorTowns: ["Mombasa Island", "Likoni", "Changamwe", "Nyali"],
      economicActivities: ["Port Services", "Tourism", "Manufacturing", "Fishing"],
      constructionDemand: "high"
    },
    {
      id: 4,
      name: "Nakuru",
      code: "NAK",
      region: "Rift Valley",
      population: 2162202,
      majorTowns: ["Nakuru Town", "Naivasha", "Gilgil", "Molo"],
      economicActivities: ["Agriculture", "Tourism", "Geothermal Energy", "Manufacturing"],
      constructionDemand: "high"
    },
    {
      id: 5,
      name: "Uasin Gishu",
      code: "UGS",
      region: "Rift Valley",
      population: 1163186,
      majorTowns: ["Eldoret", "Moiben", "Turbo"],
      economicActivities: ["Agriculture", "Aviation", "Education", "Sports"],
      constructionDemand: "high"
    },
    {
      id: 6,
      name: "Machakos",
      code: "MCH",
      region: "Eastern",
      population: 1421932,
      majorTowns: ["Machakos Town", "Athi River", "Mavoko"],
      economicActivities: ["Manufacturing", "Agriculture", "Mining"],
      constructionDemand: "medium"
    },
    {
      id: 7,
      name: "Kajiado",
      code: "KJD",
      region: "Rift Valley",
      population: 1117840,
      majorTowns: ["Kajiado Town", "Ngong", "Kitengela", "Namanga"],
      economicActivities: ["Livestock", "Tourism", "Real Estate"],
      constructionDemand: "high"
    },
    {
      id: 8,
      name: "Kisumu",
      code: "KSM",
      region: "Nyanza",
      population: 1155574,
      majorTowns: ["Kisumu City", "Maseno", "Ahero"],
      economicActivities: ["Fishing", "Agriculture", "Trade", "Manufacturing"],
      constructionDemand: "medium"
    },
    {
      id: 9,
      name: "Meru",
      code: "MER",
      region: "Eastern",
      population: 1545714,
      majorTowns: ["Meru Town", "Maua", "Mikinduri"],
      economicActivities: ["Agriculture", "Tourism", "Miraa Trade"],
      constructionDemand: "medium"
    },
    {
      id: 10,
      name: "Kilifi",
      code: "KLF",
      region: "Coast",
      population: 1453787,
      majorTowns: ["Kilifi Town", "Malindi", "Watamu"],
      economicActivities: ["Tourism", "Agriculture", "Fishing", "Salt Mining"],
      constructionDemand: "medium"
    },
    // Additional counties for comprehensive coverage
    {
      id: 11,
      name: "Turkana",
      code: "TRK",
      region: "Rift Valley",
      population: 926976,
      majorTowns: ["Lodwar", "Kakuma"],
      economicActivities: ["Pastoralism", "Oil Exploration", "Fishing"],
      constructionDemand: "low"
    },
    {
      id: 12,
      name: "West Pokot",
      code: "WPK",
      region: "Rift Valley",
      population: 621241,
      majorTowns: ["Kapenguria", "Chepareria"],
      economicActivities: ["Agriculture", "Livestock", "Mining"],
      constructionDemand: "low"
    },
    {
      id: 13,
      name: "Samburu",
      code: "SMB",
      region: "Rift Valley",
      population: 310327,
      majorTowns: ["Maralal", "Baragoi"],
      economicActivities: ["Pastoralism", "Tourism", "Beekeeping"],
      constructionDemand: "low"
    },
    {
      id: 14,
      name: "Trans Nzoia",
      code: "TNZ",
      region: "Rift Valley",
      population: 990341,
      majorTowns: ["Kitale", "Endebess"],
      economicActivities: ["Agriculture", "Dairy Farming"],
      constructionDemand: "medium"
    },
    {
      id: 15,
      name: "Nandi",
      code: "NND",
      region: "Rift Valley",
      population: 885711,
      majorTowns: ["Kapsabet", "Nandi Hills"],
      economicActivities: ["Agriculture", "Tea Farming", "Athletics"],
      constructionDemand: "medium"
    }
  ];

  private static subCounties: SubCounty[] = [
    // Nairobi Sub-Counties
    { id: 1, name: "Westlands", countyId: 1, population: 600000, urbanization: "urban" },
    { id: 2, name: "Kasarani", countyId: 1, population: 650000, urbanization: "urban" },
    { id: 3, name: "Embakasi East", countyId: 1, population: 500000, urbanization: "urban" },
    { id: 4, name: "Embakasi West", countyId: 1, population: 480000, urbanization: "urban" },
    { id: 5, name: "Dagoretti North", countyId: 1, population: 400000, urbanization: "urban" },
    { id: 6, name: "Dagoretti South", countyId: 1, population: 420000, urbanization: "urban" },
    { id: 7, name: "Langata", countyId: 1, population: 380000, urbanization: "urban" },
    { id: 8, name: "Kibra", countyId: 1, population: 250000, urbanization: "urban" },
    { id: 9, name: "Roysambu", countyId: 1, population: 350000, urbanization: "urban" },
    { id: 10, name: "Mathare", countyId: 1, population: 200000, urbanization: "urban" },
    
    // Kiambu Sub-Counties
    { id: 11, name: "Thika Town", countyId: 2, population: 280000, urbanization: "urban" },
    { id: 12, name: "Ruiru", countyId: 2, population: 350000, urbanization: "peri-urban" },
    { id: 13, name: "Juja", countyId: 2, population: 250000, urbanization: "peri-urban" },
    { id: 14, name: "Kikuyu", countyId: 2, population: 200000, urbanization: "peri-urban" },
    
    // Mombasa Sub-Counties
    { id: 15, name: "Mvita", countyId: 3, population: 300000, urbanization: "urban" },
    { id: 16, name: "Changamwe", countyId: 3, population: 250000, urbanization: "urban" },
    { id: 17, name: "Jomba", countyId: 3, population: 180000, urbanization: "urban" },
    { id: 18, name: "Kisauni", countyId: 3, population: 320000, urbanization: "urban" },
    { id: 19, name: "Nyali", countyId: 3, population: 200000, urbanization: "urban" },
    { id: 20, name: "Likoni", countyId: 3, population: 180000, urbanization: "urban" }
  ];

  static getAllCounties(): County[] {
    return this.counties;
  }

  static getCountiesByRegion(region: string): County[] {
    return this.counties.filter(county => county.region.toLowerCase() === region.toLowerCase());
  }

  static getCountiesByConstructionDemand(demand: 'high' | 'medium' | 'low'): County[] {
    return this.counties.filter(county => county.constructionDemand === demand);
  }

  static getHighDemandCounties(): County[] {
    return this.getCountiesByConstructionDemand('high');
  }

  static getCountyById(id: number): County | undefined {
    return this.counties.find(county => county.id === id);
  }

  static getCountyByName(name: string): County | undefined {
    return this.counties.find(county => 
      county.name.toLowerCase() === name.toLowerCase()
    );
  }

  static searchCounties(query: string): County[] {
    const searchTerm = query.toLowerCase();
    return this.counties.filter(county =>
      county.name.toLowerCase().includes(searchTerm) ||
      county.majorTowns.some(town => town.toLowerCase().includes(searchTerm)) ||
      county.economicActivities.some(activity => activity.toLowerCase().includes(searchTerm))
    );
  }

  static getSubCountiesByCounty(countyId: number): SubCounty[] {
    return this.subCounties.filter(subCounty => subCounty.countyId === countyId);
  }

  static getUrbanSubCounties(): SubCounty[] {
    return this.subCounties.filter(subCounty => subCounty.urbanization === 'urban');
  }

  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static getDeliveryEstimate(fromCounty: string, toCounty: string): {
    days: number;
    cost: number;
    method: string;
  } {
    const from = this.getCountyByName(fromCounty);
    const to = this.getCountyByName(toCounty);

    if (!from || !to) {
      return { days: 7, cost: 5000, method: 'Standard Delivery' };
    }

    // Same county delivery
    if (from.id === to.id) {
      return { days: 1, cost: 500, method: 'Local Delivery' };
    }

    // Major city to major city
    const majorCities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'];
    if (majorCities.includes(from.name) && majorCities.includes(to.name)) {
      return { days: 2, cost: 1500, method: 'Express Inter-City' };
    }

    // From major city to other county
    if (majorCities.includes(from.name)) {
      return { days: 3, cost: 2500, method: 'Standard Inter-County' };
    }

    // Remote area delivery
    const remoteCities = ['Turkana', 'West Pokot', 'Samburu'];
    if (remoteCities.includes(to.name) || remoteCities.includes(from.name)) {
      return { days: 7, cost: 8000, method: 'Remote Area Delivery' };
    }

    // Default inter-county
    return { days: 4, cost: 3000, method: 'Standard Inter-County' };
  }

  static getConstructionMaterialAvailability(countyName: string): {
    cement: 'high' | 'medium' | 'low';
    steel: 'high' | 'medium' | 'low';
    timber: 'high' | 'medium' | 'low';
    stone: 'high' | 'medium' | 'low';
  } {
    const county = this.getCountyByName(countyName);
    
    if (!county) {
      return { cement: 'low', steel: 'low', timber: 'low', stone: 'low' };
    }

    // Major urban centers have high availability
    if (['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'].includes(county.name)) {
      return { cement: 'high', steel: 'high', timber: 'high', stone: 'high' };
    }

    // Medium-sized towns have medium availability
    if (['Thika', 'Eldoret', 'Meru', 'Machakos'].includes(county.name)) {
      return { cement: 'medium', steel: 'medium', timber: 'medium', stone: 'medium' };
    }

    // Rural areas typically have limited availability
    return { cement: 'low', steel: 'low', timber: 'medium', stone: 'high' };
  }

  static getRegions(): string[] {
    return [...new Set(this.counties.map(county => county.region))];
  }

  static getCountiesByAvailability(material: string): County[] {
    return this.counties.filter(county => {
      const availability = this.getConstructionMaterialAvailability(county.name);
      return availability[material as keyof typeof availability] === 'high';
    });
  }
}
