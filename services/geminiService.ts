import { GoogleGenAI } from "@google/genai";
import { Brewery, BreweryCategory, AliveStatus } from "../types";

let apiKey = '';

try {
  // Safe access to API Key to prevent 'process is not defined' crash in browsers
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    apiKey = process.env.API_KEY || '';
  }
} catch (e) {
  // Ignore error if process is not accessible
  console.warn("Could not access process.env for API KEY");
}

// Lazy initialization of the AI client
// This prevents the app from crashing at startup if the API key is missing or invalid
let aiInstance: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
    if (!aiInstance) {
        // Use a placeholder if apiKey is missing to prevent constructor crash, 
        // though API calls will obviously fail later (handled by try-catch in functions)
        aiInstance = new GoogleGenAI({ apiKey: apiKey || 'MISSING_API_KEY' });
    }
    return aiInstance;
};

interface SearchResult {
  text: string;
  breweries: Partial<Brewery>[];
  groundingLinks: { title: string; uri: string }[];
}

// Simple ID generator fallback for browsers where crypto.randomUUID might fail
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Helper to normalize Gemini's text response to our Enum
const normalizeCategory = (catStr: string): BreweryCategory => {
    if (!catStr) return BreweryCategory.COMMON;
    const lower = catStr.toLowerCase().trim();
    
    if (lower.includes('mítico') || lower.includes('mitico') || lower.includes('mythic')) return BreweryCategory.MYTHIC;
    if (lower.includes('oro') || lower.includes('gold')) return BreweryCategory.GOLD;
    if (lower.includes('plata') || lower.includes('silver')) return BreweryCategory.SILVER;
    if (lower.includes('tap') || lower.includes('room')) return BreweryCategory.TAP_ROOM;
    
    return BreweryCategory.COMMON;
};

export const searchBreweriesWithGemini = async (
  query: string, 
  currentLocation?: { lat: number; lng: number }
): Promise<SearchResult> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return { text: "API Key missing. Cannot search.", breweries: [], groundingLinks: [] };
  }

  try {
    const ai = getAi();
    const prompt = `
      You are an expert on Craft Beer in Spain. 
      The user is searching for: "${query}".
      
      Use Google Maps to find real locations.
      
      After finding the information, verify the details.
      
      Return a response in RAW JSON format. Do not use Markdown code blocks.
      The JSON must match this structure EXACTLY:
      {
        "message": "A short summary of what you found.",
        "breweries": [
          {
            "name": "Name of the brewery/bar",
            "description": "Short description of their specialty",
            "address": "Full address",
            "lat": 0.0,
            "lng": 0.0,
            "category": "One of: Lúpulo Mítico, Lúpulo de Oro, Lúpulo de Plata, Lúpulo Común, Tap Room (Choose based on popularity/rating)"
          }
        ]
      }
      
      IMPORTANT: You MUST provide estimated latitude and longitude for the locations based on the address found via the Google Maps tool.
    `;

    const model = 'gemini-flash-lite-latest';
    
    // We use the Maps tool to ground the knowledge
    // NOTE: responseMimeType and responseSchema are NOT supported when using googleMaps tool
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (currentLocation) {
        config.toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: currentLocation.lat,
                    longitude: currentLocation.lng
                }
            }
        };
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });

    let resultText = response.text || "{}";
    
    // Clean up potential markdown formatting from the model
    resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsedData: any = {};
    
    try {
        parsedData = JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse JSON response", e);
        console.log("Raw text:", resultText);
        // Fallback for simple text response if JSON fails
        return {
            text: response.text || "I found some information but couldn't structure it properly.",
            breweries: [],
            groundingLinks: []
        };
    }

    // Extract grounding chunks for display
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingLinks = groundingChunks
      .filter((chunk: any) => chunk.web?.uri || chunk.maps?.uri)
      .map((chunk: any) => ({
        title: chunk.web?.title || chunk.maps?.title || "Source",
        uri: chunk.web?.uri || chunk.maps?.uri
      }));

    const mappedBreweries = (parsedData.breweries || []).map((b: any) => ({
        id: generateId(),
        name: b.name,
        description: b.description,
        address: b.address,
        category: normalizeCategory(b.category),
        coordinates: { lat: b.lat, lng: b.lng },
        googleMapsUri: "" // We rely on the generic grounding links for now
    }));

    return {
      text: parsedData.message || "Here are the results.",
      breweries: mappedBreweries,
      groundingLinks
    };

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return {
      text: "Sorry, I encountered an error searching for breweries.",
      breweries: [],
      groundingLinks: []
    };
  }
};

export const checkBreweryHealth = async (breweryName: string): Promise<{ status: AliveStatus, date: string }> => {
    if (!apiKey) return { status: 'unknown', date: new Date().toISOString() };

    try {
        const ai = getAi();
        const currentYear = new Date().getFullYear();
        const prompt = `
            Search for "${breweryName} Untappd".
            
            Determine if this brewery is currently in business.
            
            CRITICAL PRIORITY RULES:
            1. First and foremost, look for the text "This brewery is no longer in business" (or similar explicitly closed status) on the Untappd page or search result. 
               If this text is present, the status is INACTIVE, regardless of any recent check-ins (users sometimes rate old beers).
            2. If there is NO explicit "no longer in business" warning, look for user ratings or check-ins within the last 12 months (including ${currentYear}). 
               If recent activity is found, the status is ACTIVE.
            3. If neither is found, consider it INACTIVE.
            
            Return a JSON object (no markdown):
            {
                "status": "active" | "inactive",
                "reason": "Short explanation (e.g., 'Explicitly marked as no longer in business' or 'Recent check-ins found in last 12 months')"
            }
        `;

        // Use standard flash for better search reasoning
        const model = 'gemini-2.5-flash';

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }] // Use Google Search to find Untappd pages
            }
        });

        let resultText = response.text || "{}";
        resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        let parsed: any = {};
        try {
            parsed = JSON.parse(resultText);
        } catch (e) {
            console.error("JSON parse error during health check", e);
            return { status: 'unknown', date: new Date().toISOString() };
        }
        
        const status: AliveStatus = (parsed.status === 'active') ? 'active' : 'inactive';
        
        return {
            status,
            date: new Date().toISOString()
        };

    } catch (error) {
        console.error("Health Check Error:", error);
        return { status: 'unknown', date: new Date().toISOString() };
    }
}