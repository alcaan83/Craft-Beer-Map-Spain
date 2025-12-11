export enum BreweryCategory {
  MYTHIC = 'Lúpulo Mítico',
  GOLD = 'Lúpulo de Oro',
  SILVER = 'Lúpulo de Plata',
  COMMON = 'Lúpulo Común',
  TAP_ROOM = 'Tap Room'
}

export type AliveStatus = 'active' | 'inactive' | 'unknown';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Brewery {
  id: string;
  name: string;
  description: string;
  category: BreweryCategory;
  coordinates: Coordinates;
  address?: string;
  website?: string;
  googleMapsUri?: string; // From Grounding
  aliveStatus?: AliveStatus;
  lastAliveCheck?: string; // ISO Date String
}

export interface AppState {
  breweries: Brewery[];
  selectedCategories: BreweryCategory[];
  isSearching: boolean;
  searchQuery: string;
  selectedBreweryId: string | null;
  isEditing: boolean;
  searchResults: string | null; // Text response from Gemini
  groundingLinks: { title: string; uri: string }[];
}