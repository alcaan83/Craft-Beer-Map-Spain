import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Brewery, BreweryCategory } from '../types';
import { Skull, CheckCircle2, Edit3 } from 'lucide-react';

// Custom Icons based on category
const createIcon = (color: string) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const icons: Record<BreweryCategory, L.Icon> = {
    [BreweryCategory.MYTHIC]: createIcon('red'),
    [BreweryCategory.GOLD]: createIcon('gold'),
    [BreweryCategory.SILVER]: createIcon('grey'),
    [BreweryCategory.COMMON]: createIcon('orange'),
    [BreweryCategory.TAP_ROOM]: createIcon('blue'),
};

const foundIcon = createIcon('violet');

interface MapComponentProps {
    breweries: Brewery[];
    foundBreweries?: Brewery[];
    selectedId: string | null;
    onMarkerClick: (id: string) => void;
    onAddBrewery?: (brewery: Brewery) => void;
    onEditBrewery?: (id: string) => void;
}

// Helper to fly to selected marker
const MapFlyTo: React.FC<{ coords: { lat: number, lng: number } | null }> = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
        if (coords) {
            map.flyTo(coords, 14, { duration: 1.5 });
        }
    }, [coords, map]);
    return null;
};

export const MapComponent: React.FC<MapComponentProps> = ({ 
    breweries, 
    foundBreweries = [], 
    selectedId, 
    onMarkerClick,
    onAddBrewery,
    onEditBrewery
}) => {
    // Fix for default Leaflet markers in React
    // Execute inside useEffect to prevent module-level crashes if Leaflet isn't ready
    useEffect(() => {
        try {
            if (L && L.Icon && L.Icon.Default && (L.Icon.Default.prototype as any)._getIconUrl) {
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                });
            }
        } catch (e) {
            console.warn("Leaflet icon patch failed", e);
        }
    }, []);

    // Default center: Madrid
    const defaultCenter: [number, number] = [40.4168, -3.7038]; 
    const selectedBrewery = 
        breweries.find(b => b.id === selectedId) || 
        foundBreweries.find(b => b.id === selectedId);

    // Bounds for Iberian Peninsula
    const maxBounds: L.LatLngBoundsExpression = [
        [34.5, -10.0], // Southwest
        [44.5, 5.0]    // Northeast
    ];

    return (
        <MapContainer 
            center={defaultCenter} 
            zoom={6} 
            minZoom={6}
            maxZoom={18}
            maxBounds={maxBounds}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={true} 
            className="w-full h-full z-0"
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Existing Saved Breweries */}
            {breweries.map(brewery => (
                <Marker 
                    key={brewery.id} 
                    position={[brewery.coordinates.lat, brewery.coordinates.lng]}
                    icon={icons[brewery.category] || icons[BreweryCategory.COMMON]}
                    eventHandlers={{
                        click: () => onMarkerClick(brewery.id),
                    }}
                >
                    <Popup>
                        <div className="p-1 min-w-[200px]">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-base mb-1">{brewery.name}</h3>
                                <div className="flex items-center gap-1 shrink-0">
                                    {brewery.aliveStatus === 'inactive' && (
                                         <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200" title="No longer in business / No recent activity">
                                            <Skull size={12} />
                                            <span className="text-[10px] font-bold">Closed?</span>
                                         </div>
                                    )}
                                     {brewery.aliveStatus === 'active' && (
                                         <div className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200" title="Active">
                                            <CheckCircle2 size={12} />
                                            <span className="text-[10px] font-bold">Active</span>
                                         </div>
                                    )}
                                    {onEditBrewery && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditBrewery(brewery.id);
                                            }}
                                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"
                                            title="Edit"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <p className="text-xs font-semibold text-gray-600 mb-2">{brewery.category}</p>
                            <p className="text-sm">{brewery.description}</p>
                            {brewery.address && <p className="text-xs text-gray-400 mt-2 italic">{brewery.address}</p>}
                            <div className="flex flex-col gap-1 mt-2">
                                {brewery.website && (
                                    <a href={brewery.website} target="_blank" rel="noreferrer" className="text-blue-500 text-xs hover:underline">
                                        Website
                                    </a>
                                )}
                                {brewery.googleMapsUri && (
                                    <a href={brewery.googleMapsUri} target="_blank" rel="noreferrer" className="text-blue-500 text-xs hover:underline">
                                        View on Google Maps
                                    </a>
                                )}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* Found Breweries (Search Results) */}
            {foundBreweries.map(brewery => (
                <Marker 
                    key={brewery.id} 
                    position={[brewery.coordinates.lat, brewery.coordinates.lng]}
                    icon={foundIcon}
                    zIndexOffset={1000} // Keep found items on top
                    eventHandlers={{
                        click: () => onMarkerClick(brewery.id),
                    }}
                >
                    <Popup>
                        <div className="p-1 min-w-[200px]">
                            <div className="bg-blue-50 -mx-1 -mt-1 p-2 mb-2 rounded-t border-b border-blue-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-700 uppercase">Found Result</span>
                                {onAddBrewery && (
                                    <button 
                                        onClick={() => onAddBrewery(brewery)}
                                        className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700"
                                    >
                                        Add to Map
                                    </button>
                                )}
                            </div>
                            <h3 className="font-bold text-base mb-1">{brewery.name}</h3>
                            <p className="text-xs font-semibold text-gray-600 mb-2">Suggested: {brewery.category}</p>
                            <p className="text-sm">{brewery.description}</p>
                            {brewery.address && <p className="text-xs text-gray-400 mt-2 italic">{brewery.address}</p>}
                        </div>
                    </Popup>
                </Marker>
            ))}
            
            <MapFlyTo coords={selectedBrewery ? selectedBrewery.coordinates : null} />
        </MapContainer>
    );
};