import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MapComponent } from './components/MapComponent';
import { EditModal } from './components/EditModal';
import { searchBreweriesWithGemini, checkBreweryHealth } from './services/geminiService';
import { Brewery, BreweryCategory, AliveStatus } from './types';
import { Search, Loader2, Plus, Map as MapIcon, Upload, Trash2, Download } from 'lucide-react';

// Simple ID generator fallback
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Initial dummy data to populate the map like the screenshot
const INITIAL_BREWERIES: Brewery[] = [];

const STORAGE_KEY = 'craft_beer_map_data';

const App: React.FC = () => {
    // State
    const [breweries, setBreweries] = useState<Brewery[]>(() => {
        // Load from local storage on initial render
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : INITIAL_BREWERIES;
        } catch (e) {
            console.error("Failed to load from local storage", e);
            return INITIAL_BREWERIES;
        }
    });
    
    // Temporary state for search results that haven't been added yet
    const [foundBreweries, setFoundBreweries] = useState<Brewery[]>([]);
    
    const [selectedCategories, setSelectedCategories] = useState<BreweryCategory[]>(Object.values(BreweryCategory));
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedBreweryId, setSelectedBreweryId] = useState<string | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingBrewery, setEditingBrewery] = useState<Brewery | null>(null);
    const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Gemini Results State
    const [geminiMessage, setGeminiMessage] = useState<string | null>(null);
    const [groundingLinks, setGroundingLinks] = useState<{ title: string; uri: string }[]>([]);

    // Save to local storage whenever breweries change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(breweries));
    }, [breweries]);

    // Filter Logic
    const toggleCategory = (category: BreweryCategory) => {
        setSelectedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setGeminiMessage(null);
        setGroundingLinks([]);
        setFoundBreweries([]); // Clear previous results
        
        try {
            // Get current location if possible, otherwise undefined
            let location;
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                );
                location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            } catch (err) {
                console.log("Geolocation not available or denied");
            }

            const result = await searchBreweriesWithGemini(searchQuery, location);
            
            setGeminiMessage(result.text);
            setGroundingLinks(result.groundingLinks);
            
            if (result.breweries.length > 0) {
                // Filter out breweries that are already in the main list by name
                const existingNames = new Set(breweries.map(b => b.name.toLowerCase()));
                const newFound = result.breweries.filter(b => b.name && !existingNames.has(b.name.toLowerCase()));
                
                setFoundBreweries(newFound as Brewery[]);
                
                // Select the first result to fly to it
                if (newFound[0]?.id) {
                    setSelectedBreweryId(newFound[0].id as string);
                }
            }
        } catch (error) {
            console.error(error);
            setGeminiMessage("An error occurred while communicating with Gemini.");
        } finally {
            setIsSearching(false);
            setSearchQuery('');
        }
    };

    const handleCheckStatus = async (id: string) => {
        // Check both lists to find the brewery
        let brewery = breweries.find(b => b.id === id);
        let isFoundList = false;
        
        if (!brewery) {
            brewery = foundBreweries.find(b => b.id === id);
            isFoundList = true;
        }

        if (!brewery) return;

        setCheckingStatusId(id);
        try {
            const { status, date } = await checkBreweryHealth(brewery.name);
            
            if (isFoundList) {
                setFoundBreweries(prev => prev.map(b => 
                    b.id === id ? { ...b, aliveStatus: status, lastAliveCheck: date } : b
                ));
            } else {
                setBreweries(prev => prev.map(b => 
                    b.id === id ? { ...b, aliveStatus: status, lastAliveCheck: date } : b
                ));
            }
        } finally {
            setCheckingStatusId(null);
        }
    };

    const handleAddToMap = (brewery: Brewery) => {
        setBreweries(prev => [...prev, brewery]);
        setFoundBreweries(prev => prev.filter(b => b.id !== brewery.id));
    };

    const handleDiscardFound = (id: string) => {
        setFoundBreweries(prev => prev.filter(b => b.id !== id));
    };

    const handleEdit = (id: string) => {
        const target = breweries.find(b => b.id === id);
        if (target) {
            setEditingBrewery(target);
            setEditModalOpen(true);
        }
    };

    const handleEditFound = (id: string) => {
        const target = foundBreweries.find(b => b.id === id);
        if (target) {
            setEditingBrewery(target);
            setEditModalOpen(true);
        }
    };

    const handleSave = (updated: Brewery) => {
        // Check if existing
        if (breweries.some(b => b.id === updated.id)) {
             setBreweries(prev => prev.map(b => b.id === updated.id ? updated : b));
        } else if (foundBreweries.some(b => b.id === updated.id)) {
             setFoundBreweries(prev => prev.map(b => b.id === updated.id ? updated : b));
        }
    };

    const handleDelete = (id: string) => {
        if(window.confirm("Are you sure you want to remove this location?")) {
            setBreweries(prev => prev.filter(b => b.id !== id));
            if (selectedBreweryId === id) setSelectedBreweryId(null);
        }
    };

    const handleClearAll = () => {
        if(window.confirm("Are you sure you want to delete ALL locations? This cannot be undone.")) {
            setBreweries([]);
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) parseKML(text);
        };
        reader.readAsText(file);
        
        // Reset input value so same file can be selected again
        event.target.value = '';
    };

    const parseKML = (xmlString: string, silent: boolean = false) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            const newBreweries: Brewery[] = [];

            // Helper to determine category from folder name
            const getCategoryFromFolder = (name: string): BreweryCategory => {
                const n = name.toLowerCase().trim();
                if (n.includes('mítico') || n.includes('mitico')) return BreweryCategory.MYTHIC;
                if (n.includes('oro')) return BreweryCategory.GOLD;
                if (n.includes('plata')) return BreweryCategory.SILVER;
                if (n.includes('tap room') || n.includes('taproom')) return BreweryCategory.TAP_ROOM;
                return BreweryCategory.COMMON;
            };

            // Parse a single Placemark node
            const parsePlacemark = (p: Element, defaultCategory: BreweryCategory): Brewery | null => {
                const name = p.getElementsByTagName("name")[0]?.textContent || "Unknown Location";
                let description = p.getElementsByTagName("description")[0]?.textContent || "";
                
                let website = "";
                let googleMapsUri = "";
                let address = "";
                let aliveStatus: AliveStatus = 'unknown';

                // Strategy 1: Look for ExtendedData -> Data (Standard KML Custom Data)
                const dataNodes = p.getElementsByTagName("Data");
                for (let i = 0; i < dataNodes.length; i++) {
                    const dataNode = dataNodes[i];
                    const nameAttr = dataNode.getAttribute("name")?.toLowerCase();
                    const value = dataNode.getElementsByTagName("value")[0]?.textContent?.trim();

                    if (nameAttr && value) {
                        if (['website', 'web', 'url', 'site', 'gx_media_links'].includes(nameAttr)) {
                            website = value.split(' ')[0];
                        } else if (['googlemapsuri', 'google_maps_uri', 'maps_link', 'map_link', 'google_maps'].includes(nameAttr)) {
                            googleMapsUri = value;
                        } else if (['address', 'direccion', 'dirección', 'location'].includes(nameAttr)) {
                            address = value;
                        } else if (['alivestatus', 'status', 'active'].includes(nameAttr)) {
                            if (value === 'active' || value === 'inactive' || value === 'unknown') {
                                aliveStatus = value as AliveStatus;
                            }
                        }
                    }
                }

                // Strategy 2: Look for ExtendedData -> SimpleData (KML Schema Data)
                const simpleDataNodes = p.getElementsByTagName("SimpleData");
                for (let i = 0; i < simpleDataNodes.length; i++) {
                    const dataNode = simpleDataNodes[i];
                    const nameAttr = dataNode.getAttribute("name")?.toLowerCase();
                    const value = dataNode.textContent?.trim();

                    if (nameAttr && value) {
                        if (['website', 'web', 'url', 'site'].includes(nameAttr)) {
                            website = value;
                        } else if (['googlemapsuri', 'google_maps_uri', 'maps_link', 'map_link', 'google_maps'].includes(nameAttr)) {
                            googleMapsUri = value;
                        } else if (['address', 'direccion', 'dirección', 'location'].includes(nameAttr)) {
                            address = value;
                        } else if (['alivestatus', 'status', 'active'].includes(nameAttr)) {
                            if (value === 'active' || value === 'inactive' || value === 'unknown') {
                                aliveStatus = value as AliveStatus;
                            }
                        }
                    }
                }

                // Strategy 3: Parse Description HTML if we still miss data
                if (!website || !googleMapsUri) {
                    try {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = description;
                        const links = tempDiv.getElementsByTagName('a');
                        
                        for (let i = 0; i < links.length; i++) {
                            const href = links[i].getAttribute('href');
                            if (href) {
                                if (href.includes('google.com/maps') || href.includes('maps.google.com') || href.includes('goo.gl/maps')) {
                                    if (!googleMapsUri) googleMapsUri = href;
                                } else {
                                    if (!website) website = href;
                                }
                            }
                        }
                    } catch (e) {
                        // ignore HTML parsing errors
                    }
                }

                // Try to find coordinates in Point
                const point = p.getElementsByTagName("Point")[0];
                const coordinatesTag = point ? point.getElementsByTagName("coordinates")[0] : null;
                const coordsRaw = coordinatesTag?.textContent?.trim();
                
                if (coordsRaw) {
                    const parts = coordsRaw.split(',');
                    const lng = parseFloat(parts[0]);
                    const lat = parseFloat(parts[1]);
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                         const cleanDesc = description
                            .replace(/<br\s*\/?>/gi, '\n')
                            .replace(/<[^>]+>/g, '')
                            .trim();

                        return {
                            id: generateId(),
                            name,
                            description: cleanDesc,
                            category: defaultCategory,
                            coordinates: { lat, lng },
                            address: address, 
                            website: website || undefined,
                            googleMapsUri: googleMapsUri || undefined,
                            aliveStatus: aliveStatus
                        };
                    }
                }
                return null;
            };

            // 1. Try to traverse Folders (Layers) to get Categories
            const folders = xmlDoc.getElementsByTagName("Folder");
            let foundInFolders = false;

            for (let i = 0; i < folders.length; i++) {
                const folder = folders[i];
                const folderName = folder.getElementsByTagName("name")[0]?.textContent || "";
                const category = getCategoryFromFolder(folderName);
                
                const placemarks = folder.getElementsByTagName("Placemark");
                if (placemarks.length > 0) {
                    foundInFolders = true;
                    for (let j = 0; j < placemarks.length; j++) {
                        const b = parsePlacemark(placemarks[j], category);
                        if (b) newBreweries.push(b);
                    }
                }
            }

            // 2. Fallback: If no structured folders found, parse all placemarks as COMMON
            if (!foundInFolders) {
                const placemarks = xmlDoc.getElementsByTagName("Placemark");
                for (let i = 0; i < placemarks.length; i++) {
                    const b = parsePlacemark(placemarks[i], BreweryCategory.COMMON);
                    if (b) newBreweries.push(b);
                }
            }

            if (newBreweries.length > 0) {
                setBreweries(prev => {
                    // Avoid duplicates by name
                    const existingNames = new Set(prev.map(b => b.name.toLowerCase()));
                    const uniqueNew = newBreweries.filter(b => !existingNames.has(b.name.toLowerCase()));
                    return [...prev, ...uniqueNew];
                });
                if (!silent) alert(`Successfully imported ${newBreweries.length} locations from KML.`);
            } else {
                if (!silent) alert("No valid locations found in KML file.");
            }
        } catch (error) {
            console.error("KML Parsing Error:", error);
            if (!silent) alert("Error parsing KML file.");
        }
    };

    // Auto-load KML from data/Breweries.kml on mount
    useEffect(() => {
        const fetchDefaultKML = async () => {
            try {
                // Try fetching from the data folder as requested
                const response = await fetch('./data/Breweries.kml');
                if (response.ok) {
                    const text = await response.text();
                    console.log("Auto-loading KML from ./data/Breweries.kml");
                    parseKML(text, true); // Silent mode
                } else {
                    console.warn("Could not fetch ./data/Breweries.kml - Status:", response.status);
                }
            } catch (error) {
                console.warn("Error fetching default KML:", error);
            }
        };

        fetchDefaultKML();
    }, []);

    const exportKML = () => {
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Craft Beer Map Spain</name>
`;

        // Iterate categories to create folders
        Object.values(BreweryCategory).forEach(category => {
            const categoryBreweries = breweries.filter(b => b.category === category);
            if (categoryBreweries.length === 0) return;

            kml += `    <Folder>
      <name>${category}</name>
`;
            categoryBreweries.forEach(b => {
                 kml += `      <Placemark>
        <name><![CDATA[${b.name}]]></name>
        <description><![CDATA[${b.description || ''}]]></description>
        <ExtendedData>
          ${b.address ? `<Data name="address"><value><![CDATA[${b.address}]]></value></Data>` : ''}
          ${b.website ? `<Data name="website"><value><![CDATA[${b.website}]]></value></Data>` : ''}
          ${b.googleMapsUri ? `<Data name="googleMapsUri"><value><![CDATA[${b.googleMapsUri}]]></value></Data>` : ''}
          ${b.aliveStatus ? `<Data name="aliveStatus"><value><![CDATA[${b.aliveStatus}]]></value></Data>` : ''}
        </ExtendedData>
        <Point>
          <coordinates>${b.coordinates.lng},${b.coordinates.lat},0</coordinates>
        </Point>
      </Placemark>
`;
            });
            kml += `    </Folder>
`;
        });

        kml += `  </Document>
</kml>`;

        const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Update filename format: Craft_Beer_Spain_COUNT_DATE.kml
        const dateStr = new Date().toISOString().split('T')[0];
        const count = breweries.length;
        link.download = `Craft_Beer_Spain_${count}_${dateStr}.kml`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const filteredBreweries = breweries.filter(b => selectedCategories.includes(b.category));

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-100">
            {/* Header / Search Bar */}
            <div className="bg-red-700 shadow-md p-3 px-6 flex items-center justify-between gap-4 z-30">
                <div className="flex items-center text-white gap-2">
                    <MapIcon className="w-6 h-6" />
                    <span className="font-bold text-lg hidden sm:block">Craft Beer Maps</span>
                </div>

                <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ask Gemini: 'Find best IPA breweries in Seville'..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-blue-300 shadow-inner bg-red-800 text-white placeholder-red-300"
                    />
                    <Search className="absolute left-3 top-2.5 text-red-300 w-5 h-5" />
                    {isSearching && <Loader2 className="absolute right-3 top-2.5 text-white animate-spin w-5 h-5" />}
                </form>

                <div className="flex items-center gap-2">
                     <input 
                        type="file" 
                        accept=".kml,.xml" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white px-3 py-2 rounded text-sm transition-colors"
                        title="Import KML"
                    >
                        <Upload size={16} />
                        <span className="hidden md:inline">Import</span>
                    </button>
                    <button 
                        onClick={exportKML}
                        className="flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white px-3 py-2 rounded text-sm transition-colors"
                        title="Export KML"
                    >
                        <Download size={16} />
                        <span className="hidden md:inline">Export</span>
                    </button>
                    {breweries.length > 0 && (
                        <button 
                            onClick={handleClearAll}
                            className="flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white px-3 py-2 rounded text-sm transition-colors"
                            title="Clear All Data"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-1 relative overflow-hidden">
                {/* Sidebar */}
                <Sidebar 
                    breweries={breweries}
                    selectedCategories={selectedCategories}
                    onToggleCategory={toggleCategory}
                    onSelectBrewery={setSelectedBreweryId}
                    onDeleteBrewery={handleDelete}
                    onEditBrewery={handleEdit}
                    groundingLinks={groundingLinks}
                    searchMessage={geminiMessage}
                    foundBreweries={foundBreweries}
                    onAddBrewery={handleAddToMap}
                    onDiscardBrewery={handleDiscardFound}
                    onEditFoundBrewery={handleEditFound}
                    onCheckStatus={handleCheckStatus}
                    checkingStatusId={checkingStatusId}
                />

                {/* Map Area */}
                <div className="flex-1 relative z-0">
                    <MapComponent 
                        breweries={filteredBreweries}
                        foundBreweries={foundBreweries}
                        selectedId={selectedBreweryId}
                        onMarkerClick={setSelectedBreweryId}
                        onAddBrewery={handleAddToMap}
                        onEditBrewery={handleEdit}
                    />
                    
                    {/* Add Button Overlay (Floating Action Button style) */}
                    <button 
                        onClick={() => {
                            // Create a temporary "new" brewery at map center (mocked center for now)
                            const newBrewery: Brewery = {
                                id: generateId(),
                                name: "New Location",
                                description: "Description here",
                                address: "",
                                category: BreweryCategory.COMMON,
                                coordinates: { lat: 40.4168, lng: -3.7038 }
                            };
                            setBreweries(prev => [...prev, newBrewery]);
                            handleEdit(newBrewery.id);
                        }}
                        className="absolute bottom-8 right-8 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-transform hover:scale-110 z-[1000]"
                        title="Add Manual Location"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            {/* Modals */}
            <EditModal 
                brewery={editingBrewery}
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    );
};

export default App;