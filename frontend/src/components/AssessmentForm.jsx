import { useState } from 'react'
import axios from 'axios'
import { MapPin, UploadCloud, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Activity, Download, Navigation2, X, Lock, LogIn } from 'lucide-react'
import MapComponent from './MapComponent'

const AssessmentForm = ({ username, userRole, onLogout }) => {
    const [address, setAddress] = useState('')
    const [coordinates, setCoordinates] = useState(null)
    const [image, setImage] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [textReport, setTextReport] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [feedbackStatus, setFeedbackStatus] = useState(null)
    const [searchError, setSearchError] = useState('')
    const [showLoginPrompt, setShowLoginPrompt] = useState(false)

    const handleFeedback = async (status) => {
        if (!result) return
        
        // Block guests from submitting feedback to the DB
        if (userRole === 'guest') {
            setShowLoginPrompt(true)
            return
        }

        try {
            // Convert image to base64 if available
            let imageData = null
            if (image) {
                const reader = new FileReader()
                imageData = await new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result)
                    reader.readAsDataURL(image)
                })
            }

            await axios.post(`${import.meta.env.VITE_API_URL}/feedback/submit`, {
                image_path: "N/A",
                image_data: imageData,
                text_report: textReport,
                prediction: result.image?.prediction || "N/A",
                confidence: result.image?.confidence || 0.0,
                feedback_status: status,
                corrected_label: status === 'Incorrect' ? 'TBD' : null
            })
            setFeedbackStatus(status)
        } catch (error) {
            console.error("Feedback submission error:", error)
            alert("Failed to submit feedback")
        }
    }

    const handleAddressChange = async (e) => {
        setAddress(e.target.value)
        // Basic debounce or manual trigger preferred for geocoding
    }

    const handleGeocode = async () => {
        if (!address) return
        setSearchError('')
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/predict/geocode`, {
                params: { address }
            })
            setCoordinates(response.data)
        } catch (error) {
            setSearchError('Address not found')
        }
    }

    const useMyLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                setCoordinates({ lat, lon });
                setSearchError("");
                
                // Show loading state in address field
                setAddress("Locating...");

                try {
                    // Reverse geocoding using OpenStreetMap Nominatim
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    if (!res.ok) throw new Error('Reverse geocoding failed');
                    const data = await res.json();
                    
                    if (data && data.display_name) {
                        // Extract a concise version of the address (first 2-3 parts)
                        const parts = data.display_name.split(',').slice(0, 3).join(', ');
                        setAddress(parts);
                    } else {
                        setAddress("Your Current Location");
                    }
                } catch (err) {
                    console.error("Reverse geocoding error:", err);
                    setAddress("Your Current Location");
                }
            }, () => {
                setSearchError("Permission denied. Please search instead.");
            });
        } else {
            setSearchError("Geolocation not supported by this browser.");
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        setImage(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setResult(null)

        const formData = new FormData()
        if (image) formData.append('file', image)

        // Also send text for prediction if needed, but endpoint separates them currently.
        // Let's call both or just image first.

        try {
            let imagePred = null
            let textPred = null

            if (image) {
                const imgResponse = await axios.post(`${import.meta.env.VITE_API_URL}/predict/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                imagePred = imgResponse.data
            }

            if (textReport) {
                const formDataText = new FormData()
                formDataText.append('text', textReport)
                const textResponse = await axios.post(`${import.meta.env.VITE_API_URL}/predict/text`, formDataText)
                textPred = textResponse.data
            }

            const assessmentResult = {
                image: imagePred,
                text: textPred
            }

            setResult(assessmentResult)

            // Save to localStorage so Reports page can use actual data
            localStorage.setItem(`latest_assessment_${username || 'guest'}`, JSON.stringify({
                address: address,
                prediction: imagePred?.prediction || textPred?.prediction || "Unknown",
                confidence: imagePred?.confidence || textPred?.confidence || 0.0,
                text_report: textReport,
                timestamp: new Date().toISOString()
            }))

        } catch (error) {
            console.error(error)
            alert('Error analyzing data')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateReport = async () => {
        if (!result) return

        // Block guests from generating reports
        if (userRole === 'guest') {
            setShowLoginPrompt(true)
            return
        }

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/report/generate`, {
                address: address,
                prediction: result.image?.prediction || result.text?.prediction || "N/A",
                confidence: result.image?.confidence || result.text?.confidence || 0.0,
                text_report: textReport
            }, {
                responseType: 'blob'
            })

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'flood_report.pdf');
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error("Report generation failed", error)
            alert('Failed to generate report')
        }
    }

    const inputsFilled = [
        !!coordinates,
        !!image,
        textReport.trim().length > 10
    ].filter(Boolean).length;

    const progressSteps = [
        { label: 'Location', active: true },
        { label: 'Upload', active: inputsFilled >= 1 || !!result },
        { label: 'Describe', active: inputsFilled >= 2 || !!result },
        { label: 'Assess', active: !!result }
    ];

    const progressWidth = `${!!result ? 100 : (inputsFilled / 3) * 100}%`;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Progress Step Indicator */}
            <div className="flex items-center justify-between mb-8 px-4 relative">
                <div className="absolute left-4 right-4 top-4 h-[2px] bg-white/5 -z-10 mt-[-1px]"></div>
                <div
                    className="absolute left-4 top-4 h-[2px] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] -z-10 mt-[-1px] transition-all duration-500 ease-in-out"
                    style={{ width: `calc(${progressWidth} - 2rem)` }}
                ></div>

                {progressSteps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 relative z-10 w-16">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${step.active
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                            : 'bg-[#000000] border-white/10 text-gray-500'
                            }`}>
                            {idx + 1}
                        </div>
                        <span className={`text-[11px] uppercase tracking-wider font-semibold ${step.active ? 'text-gray-200' : 'text-gray-600'}`}>
                            {step.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-100">Damage Assessment</h2>
                        <p className="text-sm text-gray-400 mt-1">Submit visual and textual evidence for AI evaluation.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Address Section */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Property Address</label>
                        <div className="flex gap-3">
                            <div className="relative flex-1 group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin size={18} className="text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-3 bg-black/20 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
                                    placeholder="Enter street address, city, region"
                                    value={address}
                                    onChange={handleAddressChange}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleGeocode}
                                className="px-5 py-3 rounded-xl font-medium text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2"
                            >
                                Locate
                            </button>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <div className="text-rose-400 text-sm h-5">{searchError && searchError}</div>
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

                    {/* Map Visualization */}
                    {coordinates && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-white/10 h-[300px] relative">
                            <MapComponent lat={coordinates.lat} lon={coordinates.lon} address={address} />
                            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] z-10"></div>
                        </div>
                    )}

                    {/* Grid for Upload & Text */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Image Upload */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Damage Evidence (Image)</label>
                            <label
                                htmlFor="file-upload"
                                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${imagePreview
                                    ? 'border-indigo-500/50 bg-indigo-500/5'
                                    : 'border-white/20 hover:border-indigo-400/50 hover:bg-white/5 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                                    }`}
                            >
                                {imagePreview ? (
                                    <div className="relative w-full h-full p-2 group">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg m-2 backdrop-blur-sm">
                                            <span className="text-white font-medium flex items-center gap-2">
                                                <UploadCloud size={18} /> Replace Image
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400 group-hover:text-indigo-300 transition-colors gap-3">
                                        <div className="p-3 bg-white/5 rounded-full border border-white/10">
                                            <UploadCloud size={28} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium"><span className="text-indigo-400">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                                        </div>
                                    </div>
                                )}
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                            </label>
                        </div>

                        {/* Text Report */}
                        <div className="space-y-2 flex flex-col">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium text-gray-300">Detailed Report / Notes</label>
                                <span className="text-xs text-gray-500">{textReport.length} chars</span>
                            </div>
                            <div className="relative flex-1 flex group">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <FileText size={18} className="text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <textarea
                                    className="flex-1 w-full pl-10 pr-3 py-3 bg-black/20 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner resize-none min-h-[12rem]"
                                    placeholder="Describe the structural state, water levels, or hazards..."
                                    value={textReport}
                                    onChange={(e) => setTextReport(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading || (!image && !textReport)}
                            className={`relative w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white transition-all duration-300 overflow-hidden ${loading || (!image && !textReport)
                                ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5'
                                } focus:outline-none`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Processing AI Analysis...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={18} />
                                    Run Damage Assessment
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Results Section */}
                {result && (
                    <div className="mt-12 pt-8 border-t border-white/10 animate-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
                                <Activity size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-100">AI Analysis Results</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Image Result Card */}
                            <div className="relative overflow-hidden rounded-2xl bg-black/40 border border-white/5 p-6 group hover:border-white/10 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-indigo-500/20"></div>
                                <dt className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2">
                                    <UploadCloud size={16} /> Image Classification
                                </dt>
                                <dd className="text-3xl font-bold text-white mb-4 tracking-tight">
                                    {result.image?.prediction || "N/A"}
                                </dd>

                                <div className="w-full bg-white/5 rounded-full h-1.5 mb-2">
                                    <div
                                        className="bg-gradient-to-r from-indigo-500 to-blue-400 h-1.5 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                        style={{ width: `${(result.image?.confidence || 0) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-indigo-300 font-medium">
                                    {(result.image?.confidence * 100).toFixed(1)}% Confidence Score
                                </p>
                            </div>

                            {/* Text Result Card */}
                            <div className="relative overflow-hidden rounded-2xl bg-black/40 border border-white/5 p-6 group hover:border-white/10 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/20"></div>
                                <dt className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2">
                                    <FileText size={16} /> Textual Analysis
                                </dt>
                                <dd className="text-3xl font-bold text-white mb-4 tracking-tight">
                                    {result.text?.prediction || "N/A"}
                                </dd>

                                <div className="w-full bg-white/5 rounded-full h-1.5 mb-2">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        style={{ width: `${(result.text?.confidence || 0) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-blue-300 font-medium">
                                    {(result.text?.confidence * 100).toFixed(1)}% Confidence Score
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex flex-wrap gap-4 items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                            <button
                                onClick={handleGenerateReport}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-gray-200 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <Download size={16} /> Export PDF
                            </button>

                            <div className="flex items-center gap-4">
                                {feedbackStatus ? (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium">
                                        <CheckCircle2 size={16} /> Feedback Recorded
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-400">Is this accurate?</span>
                                        <button
                                            onClick={() => handleFeedback('Correct')}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors text-sm font-medium"
                                        >
                                            <CheckCircle2 size={14} /> Yes
                                        </button>
                                        <button
                                            onClick={() => handleFeedback('Incorrect')}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 transition-colors text-sm font-medium"
                                        >
                                            <AlertTriangle size={14} /> No
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Login Prompt for Guests */}
            {showLoginPrompt && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLoginPrompt(false)} />
                    <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-2xl p-8 flex flex-col items-center gap-5 text-center animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowLoginPrompt(false)} className="absolute top-3 right-3 text-gray-500 hover:text-white p-1 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.15)]">
                            <Lock size={28} className="text-indigo-400" />
                        </div>
                        <div className="space-y-1.5">
                            <h2 className="text-xl font-bold text-white">Sign In Required</h2>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Generating reports and submitting AI feedback is reserved for registered users. <br/> Please sign in to get full access!
                            </p>
                        </div>
                        <div className="w-full space-y-3 pt-1">
                            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                <LogIn size={16} /> Sign In Now
                            </button>
                            <button onClick={() => setShowLoginPrompt(false)} className="w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                                Continue as Guest
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AssessmentForm
