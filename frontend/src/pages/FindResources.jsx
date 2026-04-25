import { useState, useEffect } from 'react'
import axios from 'axios'
import { LifeBuoy, Info, MapPin, Navigation2 } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon missing in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom DivIcons for resources
const createEmojiIcon = (emoji, bgColor) => {
    return new L.divIcon({
        className: 'custom-resource-icon',
        html: `<div style="background-color: ${bgColor}; border: 2px solid rgba(255,255,255,0.2); backdrop-filter: blur(4px); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
};

const hospitalIcon = createEmojiIcon('🏥', 'rgba(239, 68, 68, 0.8)'); // Red
const policeIcon = createEmojiIcon('🚓', 'rgba(59, 130, 246, 0.8)'); // Blue
const fireIcon = createEmojiIcon('🚒', 'rgba(249, 115, 22, 0.8)'); // Orange
const shelterIcon = createEmojiIcon('🏠', 'rgba(34, 197, 94, 0.8)'); // Green
const foodIcon = createEmojiIcon('🍞', 'rgba(234, 179, 8, 0.8)'); // Yellow
const waterIcon = createEmojiIcon('💧', 'rgba(139, 92, 246, 0.8)'); // Violet
const defaultResourceIcon = createEmojiIcon('📍', 'rgba(107, 114, 128, 0.8)'); // Gray

const getIconForType = (type) => {
    const t = type.toLowerCase();
    if (t.includes('hospital') || t.includes('medical')) return hospitalIcon;
    if (t.includes('police')) return policeIcon;
    if (t.includes('fire')) return fireIcon;
    if (t.includes('shelter') || t.includes('camp')) return shelterIcon;
    if (t.includes('food')) return foodIcon;
    if (t.includes('water')) return waterIcon;
    return defaultResourceIcon;
};

function ChangeView({ center }) {
    const map = useMap();
    map.setView(center, map.getZoom());
    return null;
}

// Smart Location Selector using OpenStreetMap Geocoding API
const LocationSelector = ({ setPosition, locationName, setLocationName }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchError('');

        try {
            // Free geocoding using Open-Meteo (using fetch to avoid global Axios Auth headers)
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&format=json`);
            if (!res.ok) throw new Error('Geocoding failed');
            const data = await res.json();
            const response = { data };

            if (response.data && response.data.results && response.data.results.length > 0) {
                const { latitude, longitude, name, country } = response.data.results[0];
                setPosition([latitude, longitude]);

                // Prevent duplicate naming if name and country are the same
                const displayName = (country && country !== name) ? `${name}, ${country}` : name;
                setLocationName(displayName);

                setSearchError('');
            } else {
                setSearchError('Location not found. Try a different city name.');
            }
        } catch (err) {
            setSearchError('Error searching for location.');
        } finally {
            setIsSearching(false);
        }
    };

    const useMyLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                setPosition([lat, lon]);
                setSearchQuery("");
                setSearchError("");
                
                // Show loading state briefly
                setLocationName("Locating...");
                
                try {
                    // Reverse geocoding using OpenStreetMap Nominatim
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
                    if (!res.ok) throw new Error('Reverse geocoding failed');
                    const data = await res.json();
                    
                    if (data && data.address) {
                        const addr = data.address;
                        const localArea = addr.suburb || addr.neighbourhood || addr.village || addr.city_district || "";
                        const city = addr.city || addr.town || addr.county || "";
                        
                        if (localArea && city) {
                            setLocationName(`${localArea}, ${city}`);
                        } else if (city) {
                            setLocationName(`${city}, ${addr.state || ''}`);
                        } else if (data.display_name) {
                            // Extract just the first 2 parts of display name to avoid huge strings
                            const parts = data.display_name.split(',').slice(0, 2).join(', ');
                            setLocationName(parts);
                        } else {
                            setLocationName("Your Current Location");
                        }
                    } else {
                        setLocationName("Your Current Location");
                    }
                } catch(err) {
                    setLocationName("Your Current Location");
                }
            }, () => {
                setSearchError("Permission denied. Please search by city instead.");
            });
        } else {
            setSearchError("Geolocation not supported by this browser.");
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>

            <div className="flex items-center gap-2 mb-2 relative z-10">
                <MapPin size={18} className="text-indigo-400" />
                <h3 className="font-semibold text-lg text-gray-200">Location Selection</h3>
            </div>
            <p className="text-gray-400 mb-5 text-sm relative z-10">Search for a region or use your exact coordinates to find nearby resources.</p>

            <form onSubmit={handleSearch} className="flex gap-2 mb-4 relative z-10">
                <div className="relative flex-1 group/input">
                    <input
                        id="locationSearch"
                        name="locationSearch"
                        type="text"
                        placeholder="E.g., Mumbai, New York, Tokyo"
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner focus:outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    className="bg-indigo-600/90 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-500 transition-all font-medium shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-500 flex items-center justify-center min-w-[100px]"
                    disabled={isSearching}
                >
                    {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Search'}
                </button>
            </form>

            {searchError && <p className="text-rose-400 text-sm mb-3 relative z-10 animate-in fade-in">{searchError}</p>}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 relative z-10">
                <span className="text-indigo-300 font-medium text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_5px_rgba(129,140,248,0.8)]"></div>
                    {locationName}
                </span>
                <button
                    type="button"
                    onClick={useMyLocation}
                    className="text-gray-400 hover:text-indigo-400 text-sm font-medium flex items-center gap-1.5 transition-colors bg-white/5 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-indigo-500/20"
                >
                    <Navigation2 size={14} className="mt-0.5" />
                    Use My GPS
                </button>
            </div>
        </div>
    );
};

const FindResources = () => {
    // Default location (e.g. Delhi)
    const [position, setPosition] = useState([28.6139, 77.2090]);
    const [locationName, setLocationName] = useState('Delhi');
    const [resources, setResources] = useState([])

    useEffect(() => {
        const fetchResources = async () => {
            const lat = position[0];
            const lon = position[1];

            const generateMockFallback = () => [
                { name: 'City Central Hospital', type: 'Hospital / Medical Center', lat: lat + 0.015, lon: lon + 0.01, status: 'Active' },
                { name: 'Northside Medical Center', type: 'Hospital / Medical Center', lat: lat - 0.025, lon: lon + 0.03, status: 'Active' },
                { name: 'District Police HQ', type: 'Police Station', lat: lat - 0.01, lon: lon + 0.02, status: 'Active' },
                { name: 'Central Fire Department', type: 'Fire Station', lat: lat + 0.005, lon: lon - 0.015, status: 'Active' },
                { name: 'Municipal Flood Shelter V', type: 'Shelter / Camp', lat: lat - 0.02, lon: lon - 0.005, status: 'Accepting' },
                { name: 'Red Cross Food Distribution', type: 'Food Center', lat: lat + 0.02, lon: lon - 0.02, status: 'Open' },
                { name: 'Safe Water Dispenser Unit', type: 'Clean Water', lat: lat - 0.005, lon: lon + 0.025, status: 'Operational' }
            ];

            try {
            const mirrors = [
                'https://overpass-api.de/api/interpreter',
                'https://overpass.kumi.systems/api/interpreter',
                'https://lz4.overpass-api.de/api/interpreter',
                'https://z.overpass-api.de/api/interpreter'
            ];

            let data = null;
            let success = false;

            for (const mirror of mirrors) {
                try {
                    const query = `[out:json][timeout:30];(node["amenity"~"hospital|clinic|police|fire_station|shelter|social_facility|restaurant|drinking_water"](around:10000,${lat},${lon});node["shop"~"supermarket|convenience"](around:10000,${lat},${lon}););out body 60;`;
                    
                    const res = await fetch(mirror, {
                        method: 'POST',
                        body: `data=${encodeURIComponent(query)}`,
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    });
                    
                    if (res.ok) {
                        data = await res.json();
                        if (data && data.elements && data.elements.length > 0) {
                            success = true;
                            break;
                        }
                    }
                } catch (err) {
                    console.warn(`Mirror ${mirror} failed, trying next...`);
                }
            }

            if (!success) {
                setResources(generateMockFallback());
                return;
            }

            const elements = data.elements || [];
            
            // Map OSM tags to our UI categories
            const realResources = elements.map(node => {
                    let type = 'Resource';
                    const tags = node.tags || {};
                    const amenity = tags.amenity || '';
                    const shop = tags.shop || '';
                    
                    if (amenity.includes('hospital') || amenity.includes('clinic')) type = 'Hospital / Medical Center';
                    else if (amenity.includes('police')) type = 'Police Station';
                    else if (amenity.includes('fire_station')) type = 'Fire Station';
                    else if (amenity.includes('shelter') || amenity.includes('social_facility')) type = 'Shelter / Camp';
                    else if (amenity.includes('restaurant') || amenity.includes('fast_food') || shop.includes('supermarket') || shop.includes('convenience')) type = 'Food Center';
                    else if (amenity.includes('drinking_water') || shop.includes('water')) type = 'Clean Water';
                    
                    return {
                        name: tags.name || `${type} (Local)`,
                        type,
                        lat: node.lat,
                        lon: node.lon,
                        status: 'Operational'
                    };
                });
                
                setResources(realResources);
            } catch (error) {
                console.error("Failed Overpass API, using mock fallback:", error);
                setResources(generateMockFallback());
            }
        }
        fetchResources();
    }, [position]);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-6">
                <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <LifeBuoy size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-100">Find Local Resources</h2>
                    <p className="text-gray-400 text-sm mt-1">Locate nearby emergency shelters, hospitals, police, and distribution centers.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                    <LocationSelector
                        setPosition={setPosition}
                        locationName={locationName}
                        setLocationName={setLocationName}
                    />
                </div>

                <div className="md:col-span-2">
                    <div className="bg-white/5 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/10 relative overflow-hidden h-[500px]">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none transition-all group-hover:bg-indigo-500/10"></div>

                        <div className="h-full w-full rounded-xl overflow-hidden relative z-10 border border-white/5 shadow-inner">
                            <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full rounded-lg bg-black/50">
                                <ChangeView center={position} />
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {/* Primary Location Marker */}
                                <Marker position={position}>
                                    <Popup className="dark-popup">
                                        <div className="p-1">
                                            <b className="text-white">Selected Location</b><br />
                                            <span className="text-gray-400">{locationName}</span>
                                        </div>
                                    </Popup>
                                </Marker>

                                {/* Nearby Resources Markers */}
                                {resources.map((res, idx) => (
                                    <Marker key={`res-${idx}`} position={[res.lat, res.lon]} icon={getIconForType(res.type)}>
                                        <Popup className="dark-popup">
                                            <div className="p-1">
                                                <b className="text-white">{res.name}</b><br />
                                                <span className="text-gray-400">Type: {res.type}</span><br />
                                                <span className="text-emerald-400 font-medium text-xs mt-1 block">Status: {res.status}</span>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.6)] z-[400] rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FindResources
