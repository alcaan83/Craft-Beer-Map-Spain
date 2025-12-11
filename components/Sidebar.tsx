import React, { useState } from 'react';
import { Brewery, BreweryCategory, AliveStatus } from '../types';
import { Beer, Star, MapPin, Edit3, Trash2, Plus, X, Activity, Skull, ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProps {
  breweries: Brewery[];
  selectedCategories: BreweryCategory[];
  onToggleCategory: (category: BreweryCategory) => void;
  onSelectBrewery: (id: string) => void;
  onDeleteBrewery: (id: string) => void;
  onEditBrewery: (id: string) => void;
  groundingLinks: { title: string; uri: string }[];
  searchMessage: string | null;
  foundBreweries?: Brewery[];
  onAddBrewery?: (brewery: Brewery) => void;
  onDiscardBrewery?: (id: string) => void;
  onEditFoundBrewery?: (id: string) => void;
  onCheckStatus?: (id: string) => void;
  checkingStatusId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  breweries,
  selectedCategories,
  onToggleCategory,
  onSelectBrewery,
  onDeleteBrewery,
  onEditBrewery,
  groundingLinks,
  searchMessage,
  foundBreweries = [],
  onAddBrewery,
  onDiscardBrewery,
  onEditFoundBrewery,
  onCheckStatus,
  checkingStatusId
}) => {
  // State to track which categories are expanded in the accordion
  const [expandedCategories, setExpandedCategories] = useState<BreweryCategory[]>(Object.values(BreweryCategory));

  const toggleExpanded = (cat: BreweryCategory) => {
    setExpandedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const categories = [
    { type: BreweryCategory.MYTHIC, color: 'text-red-600', bg: 'bg-red-600', label: 'Lúpulo Mítico' },
    { type: BreweryCategory.GOLD, color: 'text-yellow-500', bg: 'bg-yellow-500', label: 'Lúpulo de Oro' },
    { type: BreweryCategory.TAP_ROOM, color: 'text-blue-500', bg: 'bg-blue-500', label: 'Tap Room' },
    { type: BreweryCategory.SILVER, color: 'text-gray-400', bg: 'bg-gray-400', label: 'Lúpulo de Plata' },
    { type: BreweryCategory.COMMON, color: 'text-orange-800', bg: 'bg-orange-800', label: 'Lúpulo Común' },
  ];

  const getStatusColor = (status?: AliveStatus) => {
    if (status === 'active') return 'text-green-500';
    if (status === 'inactive') return 'text-red-500';
    return 'text-gray-300';
  };

  return (
    <div className="w-full md:w-96 bg-white h-full shadow-xl flex flex-col z-20 relative">
      <div className="p-4 bg-red-600 text-white flex items-center justify-between">
        <h1 className="text-xl font-medium">Mapa Cerveza artesana</h1>
        <div className="bg-black border-2 border-gray-400 rounded px-2 py-1 shadow-inner flex items-center justify-center min-w-[3rem]">
            <span className="font-mono text-white text-lg font-bold tracking-widest leading-none">
                {breweries.length.toString().padStart(3, '0')}
            </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Search Results / Grounding Info */}
        {(searchMessage || foundBreweries.length > 0) && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-sm text-blue-800">
             {searchMessage && (
                <>
                    <p className="font-medium mb-2">Gemini Analysis:</p>
                    <p className="mb-2">{searchMessage}</p>
                </>
             )}

             {searchMessage && foundBreweries.length === 0 && (
                 <p className="text-gray-500 italic mt-2">No locations found matching your query.</p>
             )}
            
            {/* Found Breweries List */}
            {foundBreweries.length > 0 && (
                <div className="mt-3">
                    <p className="font-bold text-blue-900 mb-2 border-b border-blue-200 pb-1">Found Locations ({foundBreweries.length})</p>
                    <div className="space-y-2">
                        {foundBreweries.map(brewery => (
                            <div key={brewery.id} className="bg-white p-2 rounded shadow-sm border border-blue-100 flex flex-col gap-1">
                                <div className="flex justify-between items-start">
                                    <div className="cursor-pointer" onClick={() => onSelectBrewery(brewery.id)}>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-800">{brewery.name}</h4>
                                            {/* Badge for category in found list */}
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                                brewery.category === BreweryCategory.MYTHIC ? 'bg-red-50 text-red-600 border-red-200' :
                                                brewery.category === BreweryCategory.GOLD ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                                'bg-gray-50 text-gray-500 border-gray-200'
                                            }`}>
                                                {brewery.category}
                                            </span>
                                            {/* Status Indicators for Found Breweries */}
                                            {brewery.aliveStatus === 'active' && (
                                                <div className="w-2 h-2 rounded-full bg-green-500" title="Active (Untappd Verified)"></div>
                                            )}
                                            {brewery.aliveStatus === 'inactive' && (
                                                <div title="No longer in business / No recent activity">
                                                    <Skull size={15} className="text-gray-500 fill-gray-200" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate w-40">{brewery.address}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => onAddBrewery?.(brewery)}
                                            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                            title="Add to Map"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        
                                        {/* New Health Check Button for Found Breweries */}
                                        {onCheckStatus && (brewery.website || brewery.address) && (
                                            <button 
                                                onClick={() => onCheckStatus(brewery.id)}
                                                disabled={checkingStatusId === brewery.id}
                                                className={`p-1.5 rounded hover:bg-purple-200 ${
                                                    brewery.aliveStatus === 'active' ? 'bg-green-100 text-green-700' :
                                                    brewery.aliveStatus === 'inactive' ? 'bg-red-100 text-red-700' :
                                                    'bg-purple-100 text-purple-600'
                                                }`}
                                                title="Check Untappd Status"
                                            >
                                                {checkingStatusId === brewery.id ? (
                                                    <Activity size={14} className="animate-pulse" />
                                                ) : (
                                                    brewery.aliveStatus === 'inactive' ? <Skull size={14} /> : <Activity size={14} />
                                                )}
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => onEditFoundBrewery?.(brewery.id)}
                                            className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                            title="Edit Details"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => onDiscardBrewery?.(brewery.id)}
                                            className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200"
                                            title="Discard"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {groundingLinks.length > 0 && (
              <div className="mt-3 pt-2 border-t border-blue-200">
                <p className="text-xs font-semibold text-blue-600 mb-1">Sources:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {groundingLinks.map((link, idx) => (
                    <li key={idx}>
                      <a href={link.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-words">
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Categories List */}
        {categories.map((cat) => {
            const isChecked = selectedCategories.includes(cat.type);
            const isExpanded = expandedCategories.includes(cat.type);
            const items = breweries.filter(b => b.category === cat.type);
            
            return (
              <div key={cat.type} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 w-full">
                    {/* Filter Toggle (Checkbox) */}
                    <div 
                        className={`w-5 h-5 flex items-center justify-center rounded border cursor-pointer ${isChecked ? 'bg-red-500 border-red-500 text-white' : 'border-gray-400'}`}
                        onClick={(e) => {
                             e.stopPropagation(); // Prevent toggling expansion
                             onToggleCategory(cat.type);
                        }}
                        title={isChecked ? "Hide from map" : "Show on map"}
                    >
                        {isChecked && <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>}
                    </div>
                    
                    {/* Expansion Toggle (Title area) */}
                    <div 
                        className="flex-1 flex items-center justify-between cursor-pointer group select-none"
                        onClick={() => toggleExpanded(cat.type)}
                        title={isExpanded ? "Collapse list" : "Expand list"}
                    >
                         <span className="font-medium text-gray-700">{cat.label}</span>
                         <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                         </div>
                    </div>
                  </div>
                </div>

                {/* Brewery List - Only show if both selected (filter) and expanded (accordion) */}
                {isChecked && isExpanded && (
                    <div className="pl-8 space-y-2 mt-2 animate-in slide-in-from-top-2 duration-200">
                        <div className={`text-xs font-semibold ${cat.color} uppercase tracking-wider mb-2 flex items-center gap-2`}>
                             <div className={`w-3 h-3 rounded-full ${cat.bg}`}></div>
                            Todos los elementos ({items.length})
                        </div>
                        {items.length === 0 && <p className="text-sm text-gray-400 italic">No locations yet</p>}
                        {items.map(brewery => (
                            <div key={brewery.id} className="group relative pl-4 border-l-2 border-gray-100 hover:border-red-300 transition-colors py-1">
                                <div className="flex justify-between items-start">
                                    <div 
                                      className="cursor-pointer"
                                      onClick={() => onSelectBrewery(brewery.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-medium text-gray-800">{brewery.name}</h4>
                                            {/* Status Indicators */}
                                            {brewery.aliveStatus === 'active' && (
                                                <div className="w-2 h-2 rounded-full bg-green-500" title="Active (Untappd Verified)"></div>
                                            )}
                                            {brewery.aliveStatus === 'inactive' && (
                                                <div title="No longer in business / No recent activity">
                                                    <Skull size={15} className="text-gray-500 fill-gray-200" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate w-48">{brewery.address || brewery.description}</p>
                                        
                                        {/* Status Text Line */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-semibold ${
                                                brewery.aliveStatus === 'active' ? 'text-green-600' : 
                                                brewery.aliveStatus === 'inactive' ? 'text-red-500' : 'text-gray-400'
                                            }`}>
                                                {brewery.aliveStatus === 'active' ? 'ALIVE' : 
                                                 brewery.aliveStatus === 'inactive' ? 'CLOSED?' : 'UNKNOWN'}
                                            </span>
                                            {brewery.lastAliveCheck && (
                                                <span className="text-[9px] text-gray-400">
                                                    Checked: {new Date(brewery.lastAliveCheck).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {onCheckStatus && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCheckStatus(brewery.id);
                                            }}
                                            disabled={checkingStatusId === brewery.id}
                                            className={`p-1 hover:bg-gray-100 rounded ${getStatusColor(brewery.aliveStatus)}`}
                                            title="Check Untappd Activity"
                                        >
                                            {checkingStatusId === brewery.id ? (
                                                <Activity size={12} className="animate-pulse" />
                                            ) : (
                                                brewery.aliveStatus === 'inactive' ? <Skull size={12} /> : <Activity size={12} />
                                            )}
                                        </button>
                                      )}
                                      <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditBrewery(brewery.id);
                                        }} 
                                        className="p-1 hover:bg-gray-100 rounded"
                                      >
                                        <Edit3 size={12} className="text-gray-600" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteBrewery(brewery.id);
                                        }} 
                                        className="p-1 hover:bg-gray-100 rounded"
                                      >
                                        <Trash2 size={12} className="text-red-500" />
                                      </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
            );
        })}
      </div>
      
      <div className="p-4 bg-gray-50 border-t text-xs text-gray-500 text-center">
        Powered by Gemini • Google Maps Grounding
      </div>
    </div>
  );
};