import { useState } from 'react'
import axios from 'axios'
import { AlertCircle, MapPin, AlignLeft, ShieldAlert } from 'lucide-react'
import { Navigation } from 'lucide-react'

const RequestHelp = ({ username }) => {
    const [address, setAddress] = useState('')
    const [reportText, setReportText] = useState('')
    const [status, setStatus] = useState(null) // null, 'submitting', 'success', 'error'
    const [message, setMessage] = useState('')
    const [lat, setLat] = useState(null)
    const [lng, setLng] = useState(null)
    const [isLocating, setIsLocating] = useState(false)
    const [urgency, setUrgency] = useState('High')

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setMessage("Geolocation is not supported by your browser")
            setStatus('error')
            return
        }

        setIsLocating(true)
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                setLat(latitude)
                setLng(longitude)

                try {
                    // Reverse geocoding using OpenStreetMap Nominatim
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en&namedetails=1`);
                    if (!res.ok) throw new Error('Reverse geocoding failed');
                    const data = await res.json();
                    
                    // Helper to force Latin/ASCII only (strips Hindi)
                    const toLatin = (text) => (text || "").replace(/[^\x20-\x7E]/g, "").trim();

                    if (data && data.display_name) {
                        // Aggressively skip the first part (street/suburb) and filter for Latin only
                        const parts = data.display_name.split(',');
                        const cleanedParts = parts.slice(1) // Skip the first part (street/suburb)
                            .map(p => toLatin(p))
                            .filter(p => p.length > 2);

                        if (cleanedParts.length > 0) {
                            setAddress(cleanedParts.slice(0, 3).join(', '));
                        } else {
                            // Fallback to city/state
                            const city = toLatin(data.address?.city || data.address?.town || data.address?.county);
                            const state = toLatin(data.address?.state);
                            setAddress(city ? (state ? `${city}, ${state}` : city) : "Current Location (Verified)");
                        }
                    } else {
                        setAddress("Current Location (Verified)");
                    }
                } catch (err) {
                    console.error("Geocoding failed:", err);
                    setAddress("Current Location (Verified)");
                }

                setMessage('Location captured successfully. Emergency responders will be able to see your precise coordinates.')
                setStatus('success')
                setIsLocating(false)
            },
            (error) => {
                console.error("Error obtaining location", error)
                setMessage("Failed to get your precise location. Please type it.")
                setStatus('error')
                setIsLocating(false)
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setStatus('submitting')
        setMessage('')

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/help/submit`, {
                address,
                report_text: reportText,
                username: username || null,
                lat,
                lng,
                urgency
            })
            setStatus('success')
            setMessage(`Urgent request submitted! Priority Level: ${response.data.urgency || 'Pending'}`)
            setAddress('')
            setReportText('')
        } catch (error) {
            setStatus('error')
            setMessage('Failed to submit request. Please try again or contact emergency services directly.')
            console.error(error)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center p-3 bg-red-500/20 rounded-full border border-red-500/30 text-red-500 mb-2">
                    <ShieldAlert size={32} />
                </div>
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500">
                    Urgent Help Request
                </h2>
                <p className="text-gray-400">
                    <span className="text-red-400 font-semibold mr-1">WARNING:</span>
                    Only use this form for life-threatening situations.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 relative overflow-hidden group">
                {/* Red alert ambient glow */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500/50 via-rose-500 to-red-500/50 block"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-all group-hover:bg-red-500/10"></div>

                <div className="space-y-2 relative z-10">
                    <label className="block text-sm font-medium text-gray-300">
                        Detailed Address / Current Location <span className="text-red-400">*</span>
                    </label>
                    <div className="relative group/input flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPin size={18} className="text-gray-500 group-focus-within/input:text-red-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                required={!lat || !lng}
                                className="block w-full pl-10 pr-3 py-3 bg-black/30 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all shadow-inner"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="e.g., 123 Main St, Apt 4B or Landmark..."
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleGetLocation}
                            disabled={isLocating}
                            className="flex items-center justify-center px-4 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50"
                            title="Use My Location"
                        >
                            {isLocating ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Navigation size={20} className="text-red-400" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="space-y-2 relative z-10">
                    <label className="block text-sm font-medium text-gray-300">
                        Describe Your Situation <span className="text-red-400">*</span>
                    </label>
                    <div className="relative group/input flex">
                        <div className="absolute top-3 left-3 pointer-events-none">
                            <AlignLeft size={18} className="text-gray-500 group-focus-within/input:text-red-400 transition-colors" />
                        </div>
                        <textarea
                            required
                            rows={4}
                            className="flex-1 w-full pl-10 pr-3 py-3 bg-black/30 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all shadow-inner resize-none min-h-[100px]"
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                            placeholder="e.g., Trapped on the 2nd floor, rising water, 2 adults and 1 child..."
                        />
                    </div>
                </div>

                <div className="space-y-2 relative z-10">
                    <label className="block text-sm font-medium text-gray-300">
                        Emergency Priority <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-black/30 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ef4444' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                        <option value="High" className="bg-gray-900 text-red-500 font-bold">High - Immediate life threat</option>
                        <option value="Medium" className="bg-gray-900 text-amber-500">Medium - Property damage / trapped</option>
                        <option value="Low" className="bg-gray-900 text-emerald-500">Low - Need supplies / evacuation</option>
                    </select>
                </div>

                <div className="pt-2 relative z-10">
                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className={`w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white transition-all overflow-hidden relative ${status === 'submitting'
                            ? 'bg-red-500/50 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transform hover:-translate-y-0.5'
                            } focus:outline-none focus:ring-2 focus:ring-red-500/50`}
                    >
                        {status === 'submitting' ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Sending Signal...
                            </>
                        ) : (
                            <>
                                <AlertCircle size={18} />
                                Broadcast Emergency Request
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-4">
                        By submitting this, you alert rescue units in your vicinity.
                    </p>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl border relative z-10 flex items-start gap-3 ${status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                    >
                        <div className="mt-0.5">
                            {status === 'success' ? <ShieldAlert size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div className="flex-1 text-sm font-medium">{message}</div>
                    </div>
                )}
            </form>
        </div>
    )
}

export default RequestHelp
