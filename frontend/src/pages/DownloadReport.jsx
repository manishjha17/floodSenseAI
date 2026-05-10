import { useState, useEffect } from 'react'
import axios from 'axios'
import { FileDown, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react'

const DownloadReport = ({ username }) => {
    const [address, setAddress] = useState('')
    const [assessment, setAssessment] = useState(null)
    const [status, setStatus] = useState(null)

    useEffect(() => {
        const stored = localStorage.getItem(`latest_assessment_${username || 'guest'}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setAssessment(parsed);
                if (parsed.address) setAddress(parsed.address);
            } catch (e) {
                console.error("Failed to parse latest assessment", e);
            }
        }
    }, [])

    const handleDownload = async (e) => {
        e.preventDefault()

        if (!assessment) {
            alert("Please run a Damage Assessment first to generate a report.")
            return;
        }

        setStatus('generating')

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/report/generate`, {
                address: address || assessment.address,
                prediction: assessment.prediction,
                confidence: assessment.confidence,
                text_report: assessment.text_report || "No detailed description provided."
            }, {
                responseType: 'blob'
            })

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'flood_damage_report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();

            setStatus('success')
        } catch (error) {
            console.error("Download error:", error)
            setStatus('error')
        }
    }

    return (
        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 rounded-full border border-indigo-500/30 text-indigo-400 mb-2 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <FileDown size={32} />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-100">Download Damage Report</h2>
                <p className="text-gray-400 text-sm">
                    Generate an official PDF report for insurance claims or aid applications.
                </p>
            </div>

            <form onSubmit={handleDownload} className="bg-white/5 backdrop-blur-xl shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 relative overflow-hidden group">
            
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-all group-hover:bg-indigo-500/10"></div>

                <div className="space-y-2 relative z-10">
                    <label className="block text-sm font-medium text-gray-300">
                        Property Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin size={18} className="text-gray-500 group-focus-within/input:text-indigo-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            required
                            className="block w-full pl-10 pr-3 py-3 bg-black/30 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter the address evaluated..."
                        />
                    </div>
                </div>

                {assessment ? (
                    <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 text-sm relative z-10">
                        <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                        <p>Real assessment data loaded securely from your recent activity. Ready to generate your official PDF report.</p>
                    </div>
                ) : (
                    <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-300 text-sm relative z-10">
                        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                        <p>No recent assessment found. Please run a Damage Assessment first from the dashboard to generate a real report with accurate predictions.</p>
                    </div>
                )}

                <div className="pt-2 relative z-10">
                    <button
                        type="submit"
                        disabled={status === 'generating'}
                        className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white transition-all overflow-hidden relative ${status === 'generating'
                            ? 'bg-indigo-500/50 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5'
                            } focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
                    >
                        {status === 'generating' ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Compiling Official Report...
                            </>
                        ) : (
                            <>
                                <FileDown size={18} />
                                Download PDF Document
                            </>
                        )}
                    </button>
                </div>

                {status === 'success' && (
                    <div className="p-4 rounded-xl border relative z-10 flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 origin-bottom animate-in fade-in slide-in-from-bottom-2">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-medium">Report generated and downloading!</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="p-4 rounded-xl border relative z-10 flex items-center justify-center gap-2 bg-rose-500/10 text-rose-400 border-rose-500/20 origin-bottom animate-in fade-in slide-in-from-bottom-2">
                        <AlertCircle size={18} />
                        <span className="text-sm font-medium">Failed to generate report. Please try again.</span>
                    </div>
                )}
            </form>
        </div>
    )
}

export default DownloadReport
