import React, { useState, useEffect } from 'react';
import { Brewery, BreweryCategory, AliveStatus } from '../types';
import { X, Save } from 'lucide-react';

interface EditModalProps {
    brewery: Brewery | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updated: Brewery) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ brewery, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Brewery>>({});

    useEffect(() => {
        if (brewery) {
            setFormData(brewery);
        } else {
            setFormData({});
        }
    }, [brewery]);

    if (!isOpen || !brewery) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (formData.name && formData.coordinates) {
            onSave({ ...brewery, ...formData } as Brewery);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-red-600 px-4 py-3 flex justify-between items-center text-white">
                    <h3 className="font-semibold">Edit Location</h3>
                    <button onClick={onClose} className="hover:bg-red-700 p-1 rounded"><X size={20} /></button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input 
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select 
                            name="category"
                            value={formData.category || BreweryCategory.COMMON}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                        >
                            {Object.values(BreweryCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status (Health Check)</label>
                        <select 
                            name="aliveStatus"
                            value={formData.aliveStatus || 'unknown'}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                        >
                            <option value="unknown">Unknown</option>
                            <option value="active">Active</option>
                            <option value="inactive">Closed / Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea 
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input 
                            name="address"
                            value={formData.address || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                        <input 
                            name="website"
                            value={formData.website || ''}
                            onChange={handleChange}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URI</label>
                        <input 
                            name="googleMapsUri"
                            value={formData.googleMapsUri || ''}
                            onChange={handleChange}
                            placeholder="https://maps.google.com/..."
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-md flex items-center gap-2">
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};