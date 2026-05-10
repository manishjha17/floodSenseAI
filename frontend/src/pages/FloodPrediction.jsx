import React, { useState } from 'react';
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { CloudLightning, MapPin, Navigation, Navigation2, Activity, ShieldAlert, Droplets, Mountain, ShieldCheck, AlertTriangle } from 'lucide-react';


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
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&format=json`);
            if (!res.ok) throw new Error('Geocoding failed');
            const data = await res.json();
            const response = { data };

            if (response.data && response.data.results && response.data.results.length > 0) {
                const { latitude, longitude, name, country } = response.data.results[0];
                setPosition([latitude, longitude]);
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
                setLocationName("Locating...");

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en&namedetails=1`);
                    if (!res.ok) throw new Error('Reverse geocoding failed');
                    const data = await res.json();
                    const toLatin = (text) => (text || "").replace(/[^\x20-\x7E]/g, "").trim();

                    if (data && data.address) {
                        const addr = data.address;

                        let city = toLatin(addr.city || addr.town || addr.county || addr.city_district);
                        let state = toLatin(addr.state || addr.region);

                        if (city && state) {
                            setLocationName(`${city}, ${state}`);
                        } else if (city) {
                            setLocationName(city);
                        } else {
                            const parts = (data.display_name || "").split(',');
                            const cleanParts = parts.slice(1)
                                .map(p => toLatin(p))
                                .filter(p => p.length > 2);

                            if (cleanParts.length > 0) {
                                setLocationName(cleanParts.slice(0, 2).join(', '));
                            } else {
                                setLocationName("Current Location (Verified)");
                            }
                        }
                    } else {
                        setLocationName("Current Location (Verified)");
                    }
                } catch (err) {
                    console.error("Geocoding failed:", err);
                    setLocationName("Current Location (Verified)");
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-blue-500/20 transition-all"></div>

            <div className="flex items-center gap-2 mb-2 relative z-10">
                <MapPin size={18} className="text-blue-400" />
                <h3 className="font-semibold text-lg text-gray-200">Location Selection</h3>
            </div>
            <p className="text-gray-400 mb-5 text-sm relative z-10">Search for a region or use your exact coordinates.</p>

            <form onSubmit={handleSearch} className="flex gap-2 mb-4 relative z-10">
                <div className="relative flex-1 group/input">
                    <input
                        type="text"
                        placeholder="E.g., Mumbai, New York, Tokyo"
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner focus:outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    className="bg-blue-600/90 text-white px-5 py-2.5 rounded-xl hover:bg-blue-500 transition-all font-medium shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-blue-500 flex items-center justify-center min-w-[100px]"
                    disabled={isSearching}
                >
                    {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Search'}
                </button>
            </form>

            {searchError && <p className="text-rose-400 text-sm mb-3 relative z-10 animate-in fade-in">{searchError}</p>}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 relative z-10">
                <span className={`${locationName ? 'text-blue-300' : 'text-gray-500'} font-medium text-sm flex items-center gap-2`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${locationName ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]' : 'bg-gray-600'}`}></div>
                    {locationName || "No location selected"}
                </span>
                <button
                    type="button"
                    onClick={useMyLocation}
                    className="text-gray-400 hover:text-blue-400 text-sm font-medium flex items-center gap-1.5 transition-colors bg-white/5 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-500/20"
                >
                    <Navigation2 size={14} className="mt-0.5" />
                    Use My GPS
                </button>
            </div>
        </div>
    );
};

const FloodPrediction = () => {
    const [position, setPosition] = useState(null);
    const [locationName, setLocationName] = useState('');
    const [loading, setLoading] = useState(false);
    const [predictionData, setPredictionData] = useState(null);
    const [error, setError] = useState(null);

    const fetchPrediction = async () => {
        setLoading(true);
        setError(null);
        try {
            const lat = position[0];
            const lon = position[1];

            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&hourly=soil_moisture_3_to_9cm&timezone=auto`);
            const floodRes = await fetch(`https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge&timezone=auto`);
            const elevationRes = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);

            const weather_data = await weatherRes.ok ? await weatherRes.json() : {};
            const flood_data = await floodRes.ok ? await floodRes.json() : {};
            const elevation_data = await elevationRes.ok ? await elevationRes.json() : {};
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/forecast/`, {
                latitude: lat,
                longitude: lon,
                weather_data,
                flood_data,
                elevation_data
            });
            setPredictionData(response.data);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch weather forecast and flood prediction. Please ensure backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (riskCategory) => {
        switch (riskCategory) {
            case 'Low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            case 'Moderate': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
            case 'High': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
            case 'Severe': return 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]';
            default: return 'bg-white/5 text-gray-300 border-white/10';
        }
    };

    const getNotificationStyle = (category) => {
        switch (category) {
            case 'Low':
                return {
                    bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-900/5', border: 'border-emerald-500/20', line: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
                    text: 'text-emerald-400', icon: <ShieldCheck size={22} />, iconBg: 'bg-emerald-500/20 text-emerald-400',
                    title: 'System Status: Nominal', itemText: 'text-emerald-100', dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
                    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.05)]'
                };
            case 'Moderate':
                return {
                    bg: 'bg-gradient-to-br from-yellow-500/10 to-yellow-900/5', border: 'border-yellow-500/20', line: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
                    text: 'text-yellow-400', icon: <AlertTriangle size={22} />, iconBg: 'bg-yellow-500/20 text-yellow-400',
                    title: 'FloodSenseAI Advisory', itemText: 'text-yellow-100', dot: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]',
                    glow: 'shadow-[0_0_30px_rgba(234,179,8,0.05)]'
                };
            case 'High':
                return {
                    bg: 'bg-gradient-to-br from-orange-500/15 to-orange-900/10', border: 'border-orange-500/30', line: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]',
                    text: 'text-orange-400', icon: <AlertTriangle size={22} />, iconBg: 'bg-orange-500/20 text-orange-400',
                    title: 'FloodSenseAI Alert', itemText: 'text-orange-50', dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]',
                    glow: 'shadow-[0_0_40px_rgba(249,115,22,0.1)]'
                };
            case 'Severe':
            default:
                return {
                    bg: 'bg-gradient-to-br from-rose-500/20 to-rose-900/10', border: 'border-rose-500/40', line: 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.9)]',
                    text: 'text-rose-400', icon: <ShieldAlert size={22} />, iconBg: 'bg-rose-500/20 text-rose-400',
                    title: 'FloodSenseAI Critical Warning', itemText: 'text-rose-50', dot: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]',
                    glow: 'shadow-[0_0_50px_rgba(244,63,94,0.15)]'
                };
        }
    };


    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
                <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <CloudLightning size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-100">Meteorological Flood Prediction</h2>
                    <p className="text-gray-400 text-sm mt-1">AI-driven analysis of environmental factors to forecast flood risks.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                    <LocationSelector
                        setPosition={setPosition}
                        locationName={locationName}
                        setLocationName={setLocationName}
                    />

                    <button
                        onClick={fetchPrediction}
                        disabled={loading || !position}
                        className={`mt-4 w-full py-3.5 px-4 rounded-xl text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 relative overflow-hidden group ${loading || !position ? 'bg-blue-500/50 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transform hover:-translate-y-0.5 border border-blue-500/50'
                            }`}
                    >
                        {loading && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Analyzing Atmospheric Data...
                            </>
                        ) : (
                            <>
                                <Activity size={18} />
                                Run Prediction Engine
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="mt-4 p-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl flex items-start gap-3 animate-in fade-in">
                            <ShieldAlert size={18} className="mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-col justify-center">
                    {predictionData ? (
                        <div className={`p-8 rounded-2xl border backdrop-blur-md text-center transition-all duration-500 ease-in-out relative overflow-hidden group ${getRiskColor(predictionData.risk_category)}`}>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-current opacity-[0.03] blur-xl rounded-full pointer-events-none"></div>

                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-3 opacity-80 text-gray-300">Predictive Risk Level</h3>
                            <div className="text-6xl md:text-7xl font-extrabold mb-4 tracking-tight drop-shadow-md">{predictionData.risk_category}</div>
                            <div className="text-3xl font-bold opacity-90 mb-6 bg-black/20 inline-block px-4 py-1 rounded-full">{predictionData.risk_score}%</div>
                            <p className="text-sm font-medium opacity-75 max-w-xs mx-auto text-gray-300">
                                Based on WMO index analysis for <span className="text-white font-semibold">{locationName}</span>
                            </p>
                        </div>
                    ) : (
                        <div className="h-full min-h-[250px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5 text-gray-500 p-8 text-center backdrop-blur-sm group hover:bg-white/[0.07] hover:border-white/20 transition-all">
                            <CloudLightning size={48} className="mb-4 opacity-50 group-hover:scale-110 group-hover:text-blue-400 transition-all duration-500" />
                            <p className="text-sm">Select a location and run the engine <br /> to generate an AI meteorological forecast.</p>
                        </div>
                    )}
                </div>
            </div>

            {predictionData && (
                <div className="space-y-8 animate-fade-in-up">

                    {predictionData.warnings && predictionData.warnings.length > 0 && (
                        (() => {
                            const style = getNotificationStyle(predictionData.risk_category);
                            return (
                                <div className={`${style.bg} ${style.glow} border ${style.border} p-6 rounded-2xl relative overflow-hidden backdrop-blur-md transition-all duration-500 flex gap-5 items-start`}>
                                    
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${style.line}`}></div>

                                    <div className={`p-3 rounded-xl ${style.iconBg} shrink-0 flex items-center justify-center border border-white/5 shadow-lg`}>
                                        {style.icon}
                                    </div>
                                    <div className="flex-1 pt-1 z-10">
                                        <h4 className={`font-bold tracking-wider uppercase text-xs mb-3 ${style.text} opacity-90`}>
                                            {style.title}
                                        </h4>
                                        <ul className="list-none space-y-3">
                                            {predictionData.warnings.map((warn, i) => (
                                                <li key={i} className={`${style.itemText} text-sm flex items-start gap-3 leading-relaxed`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${style.dot} mt-2 flex-shrink-0`}></div>
                                                    <span className="opacity-95">{warn}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className={`absolute -right-20 -top-20 w-64 h-64 ${style.line.split(' ')[0]} opacity-10 blur-[80px] pointer-events-none rounded-full`}></div>
                                </div>
                            );
                        })()
                    )}

                    <div className="bg-[#000000] p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden group">
                        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-all duration-700"></div>
                        <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
                            <CloudLightning size={18} className="text-blue-400" />
                            7-Day Precipitation Forecast (mm)
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={predictionData.daily_forecast} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(11, 15, 25, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: '#60a5fa' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="precipitation" fill="url(#colorRain)" radius={[6, 6, 0, 0]} name="Rainfall (mm)" />
                                    <defs>
                                        <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {predictionData.metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Activity size={48} className="text-blue-400" />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                                        <Activity size={14} />
                                    </div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">River Discharge</p>
                                </div>
                                <p className="text-3xl font-bold text-gray-100 mt-2">{predictionData.metrics.max_river_discharge_m3s} <span className="text-sm font-normal text-gray-500">m³/s</span></p>
                                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wide">Copernicus GloFAS Model</p>
                            </div>

                            <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Droplets size={48} className="text-emerald-400" />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                                        <Droplets size={14} />
                                    </div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Soil Saturation</p>
                                </div>
                                <p className="text-3xl font-bold text-gray-100 mt-2">{predictionData.metrics.avg_soil_moisture} <span className="text-sm font-normal text-gray-500">m³/m³</span></p>
                                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wide">Avg Groundwater Capacity</p>
                            </div>

                            <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Mountain size={48} className="text-purple-400" />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400">
                                        <Mountain size={14} />
                                    </div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Elevation Map</p>
                                </div>
                                <p className="text-3xl font-bold text-gray-100 mt-2">{predictionData.metrics.elevation_meters} <span className="text-sm font-normal text-gray-500">m</span></p>
                                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wide">Est. Topography Level</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
        }
      `}} />
        </div>
    );
};

export default FloodPrediction;
