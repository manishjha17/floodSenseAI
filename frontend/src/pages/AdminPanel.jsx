import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import {
    Shield, Download, Image as ImageIcon, CheckCircle, Database, FileText,
    Users, UserCheck, XCircle, ChevronRight, DownloadCloud, ShieldAlert, MapPin
} from 'lucide-react'

const CLASS_NAMES = ['Destroyed', 'No Damage', 'Low Damage', 'Medium Damage']

const AdminPanel = ({ userRole, forcedTab, username }) => {
    const isAdmin = userRole === 'admin'
    const [searchParams] = useSearchParams()
    const tabParam = searchParams.get('tab')
    //forcedTab overrides everything
    const [internalTab, setInternalTab] = useState(tabParam || (isAdmin ? 'feedback' : 'emergencies'))
    const activeTab = forcedTab || internalTab
    const setActiveTab = (tab) => !forcedTab && setInternalTab(tab)


    //feedback state
    const [feedbackItems, setFeedbackItems] = useState([])
    const [loadingFeedback, setLoadingFeedback] = useState(true)
    const [selectedLabels, setSelectedLabels] = useState({})
    const [exportedItems, setExportedItems] = useState([])
    const [showHistory, setShowHistory] = useState(false)

    //rescuers state
    const [pendingRescuers, setPendingRescuers] = useState([])
    const [loadingRescuers, setLoadingRescuers] = useState(true)

    //emergencies state
    const [emergencies, setEmergencies] = useState([])
    const [loadingEmergencies, setLoadingEmergencies] = useState(true)

    const getConfig = () => {
        const session = JSON.parse(localStorage.getItem('auth_session') || '{}')
        return { headers: { Authorization: `Bearer ${session.token}` } }
    }

    useEffect(() => {
        if (activeTab === 'feedback') {
            fetchFeedback()
        } else if (activeTab === 'rescuers') {
            fetchPendingRescuers()
        } else if (activeTab === 'emergencies') {
            fetchEmergencies()
        }
    }, [activeTab])

    const fetchEmergencies = async () => {
        setLoadingEmergencies(true)
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/help/requests`, getConfig())
            //admin sees all, rescuers see pending
            const data = isAdmin ? response.data : response.data.filter(r => r.status !== 'fulfilled')
            setEmergencies(data)
        } catch (error) {
            console.error("Error fetching emergencies:", error)
        } finally {
            setLoadingEmergencies(false)
        }
    }

    const resolveEmergency = async (id) => {
        try {
            await axios.patch(`${import.meta.env.VITE_API_URL}/help/requests/${id}/fulfill`, {
                rescuer_username: username || 'rescuer'
            }, getConfig())
            //update local state for rescuer view
            setEmergencies(prev => prev.filter(e => e.id !== id))
        } catch (error) {
            console.error("Error resolving emergency:", error)
        }
    }


    const fetchFeedback = async () => {
        setLoadingFeedback(true)
        try {
            const [allRes, approvedRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/feedback/all`, getConfig()),
                axios.get(`${import.meta.env.VITE_API_URL}/feedback/approved`, getConfig())
            ])
            setFeedbackItems(allRes.data)
            setExportedItems(approvedRes.data)

            //init labels
            const labels = {}
            allRes.data.forEach(item => {
                labels[item.id] = item.corrected_label || CLASS_NAMES[0]
            })
            setSelectedLabels(labels)
        } catch (error) {
            console.error("Error fetching feedback:", error)
        } finally {
            setLoadingFeedback(false)
        }
    }

    const fetchPendingRescuers = async () => {
        setLoadingRescuers(true)
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/pending-rescuers`, getConfig())
            setPendingRescuers(response.data)
        } catch (error) {
            console.error("Error fetching pending rescuers:", error)
        } finally {
            setLoadingRescuers(false)
        }
    }

    const handleLabelChange = (id, label) => {
        setSelectedLabels(prev => ({ ...prev, [id]: label }))
    }

    const handleUpdateLabel = async (id) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/feedback/update-label`, {
                id,
                corrected_label: selectedLabels[id]
            }, getConfig())
            alert('Label updated successfully!')

            //remove item locally to avoid double updates

            //optimistic update, no refetch needed
            //fetchFeedback()
        } catch (error) {
            console.error("Error updating label:", error)
            alert('Failed to update label')
        }
    }

    const handleExport = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/feedback/export`, {
                ...getConfig(),
                responseType: 'blob'
            })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `corrected_training_data_${new Date().toISOString().slice(0, 10)}.zip`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            fetchFeedback()
        } catch (error) {
            console.error('Export error:', error)
            alert('Export failed. Make sure there are labelled items to export.')
        }
    }


    const handleVerifyAction = async (userId, action) => {
        if (action === 'reject') {
            const confirm = window.confirm('Are you sure you want to reject and delete this registration?')
            if (!confirm) return
        }

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/auth/verify-rescuer`, { userId, action }, getConfig())
            alert(`Application ${action === 'approve' ? 'approved' : 'rejected'}.`)
            fetchPendingRescuers()
        } catch (error) {
            console.error(`Error verifying rescuer (action: ${action}):`, error)
            alert(`Failed to ${action} user.`)
        }
    }

    const downloadIdProof = (base64String, username) => {
        if (!base64String) return

        //temp link for download
        const a = document.createElement('a')
        a.href = base64String
        a.download = `ID_Proof_${username}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }


    const incorrectItems = feedbackItems.filter(item => item.feedback_status === 'Incorrect' && !item.is_exported)

    const pageTitles = {
        feedback: { title: 'Model Feedback', subtitle: 'Review and correct AI model predictions to improve accuracy.' },
        rescuers: { title: 'Pending Rescuers', subtitle: 'Approve or reject pending rescuer registrations.' },
        emergencies: { title: 'Live Emergencies', subtitle: 'Real-time SOS requests dispatched from citizens.' }
    }
    const currentPage = pageTitles[activeTab] || pageTitles.feedback

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/*header info*/}
            <div className="border-b border-white/5 pb-2">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-100">{currentPage.title}</h2>
                        <p className="text-gray-400 text-sm mt-1">{currentPage.subtitle}</p>
                    </div>
                </div>

                {/*tab switcher*/}
                {!forcedTab && (
                    <div className="flex gap-6 relative">
                        <button
                            onClick={() => setActiveTab('feedback')}
                            className={`pb-3 font-semibold text-sm transition-all border-b-2 ${activeTab === 'feedback' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Database size={16} />
                                Model Feedback
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('rescuers')}
                            className={`pb-3 font-semibold text-sm transition-all border-b-2 ${activeTab === 'rescuers' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Users size={16} />
                                Pending Rescuers
                                {pendingRescuers.length > 0 && (
                                    <span className="ml-1.5 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                                        {pendingRescuers.length}
                                    </span>
                                )}
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('emergencies')}
                            className={`pb-3 font-semibold text-sm transition-all border-b-2 ${activeTab === 'emergencies' ? 'border-red-400 text-red-500' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={16} />
                                Live Emergencies
                                {emergencies.length > 0 && (
                                    <span className="ml-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                                        {emergencies.length}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                )}
            </div>


            {/*feedback review*/}
            {
                activeTab === 'feedback' && (
                    <div className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-white/20 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                                <h3 className="text-lg font-semibold text-gray-200">Found {incorrectItems.length} items to review</h3>
                            </div>
                            <button
                                onClick={handleExport}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-500/50 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                            >
                                <DownloadCloud size={16} /> Export Training Data
                            </button>
                        </div>

                        {loadingFeedback ? (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                                Loading admin data...
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {incorrectItems.map((item) => (
                                    <div key={item.id} className="bg-[#000000] rounded-2xl shadow-xl overflow-hidden border border-white/10 flex flex-col hover:border-indigo-500/30 transition-colors group">
                                        {/*Image Display*/}
                                        {item.image_url ? (
                                            <div className="relative h-48 w-full group-hover:opacity-90 transition-opacity">
                                                <img
                                                    src={item.image_url}
                                                    alt={`Feedback ${item.id}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#000000] to-transparent opacity-80 pointer-events-none"></div>
                                                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-gray-300 px-2.5 py-1 rounded-lg text-xs border border-white/10 font-mono">
                                                    ID: {item.id}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-48 w-full bg-black/40 flex items-center justify-center border-b border-white/5">
                                                <ImageIcon size={32} className="text-gray-600" />
                                            </div>
                                        )}

                                        {/*Info Section*/}
                                        <div className="p-5 flex-1 flex flex-col">
                                            {/*model prediction*/}
                                            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-4 relative overflow-hidden">
                                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>
                                                <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">Model predicted:</p>
                                                <p className="text-xl font-bold text-gray-100">{item.prediction}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${item.confidence * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-xs text-rose-300/80 font-medium">{(item.confidence * 100).toFixed(1)}%</span>
                                                </div>
                                            </div>

                                            {/*report text*/}
                                            {item.text_report && (
                                                <div className="text-sm text-gray-300 bg-white/5 border border-white/5 p-3 rounded-xl max-h-24 overflow-y-auto custom-scrollbar mb-4 flex gap-2">
                                                    <FileText size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs leading-relaxed">{item.text_report}</p>
                                                </div>
                                            )}

                                            <div className="mt-auto space-y-4 pt-2 border-t border-white/5">
                                                {/*label selection*/}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-400 mb-2">
                                                        Select Correct Label:
                                                    </label>
                                                    <select
                                                        value={selectedLabels[item.id] || 'TBD'}
                                                        onChange={(e) => handleLabelChange(item.id, e.target.value)}
                                                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer appearance-none shadow-inner"
                                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                                                    >
                                                        <option value="TBD" disabled className="bg-gray-900 text-gray-500">-- Select a label --</option>
                                                        {CLASS_NAMES.map(label => (
                                                            <option key={label} value={label} className="bg-gray-900">{label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* update btn */}
                                                <button
                                                    onClick={() => handleUpdateLabel(item.id)}
                                                    disabled={!selectedLabels[item.id] || selectedLabels[item.id] === 'TBD'}
                                                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 bg-indigo-600/90 text-white rounded-xl hover:bg-indigo-500 font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600/90 disabled:hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                                >
                                                    <CheckCircle size={16} /> Save Correction
                                                </button>

                                                <p className="text-[10px] text-gray-500 text-center font-mono">
                                                    {(() => {
                                                        if (!item.timestamp) return 'N/A';
                                                        const d = new Date(item.timestamp);
                                                        if (isNaN(d.getTime())) return 'Invalid Date';
                                                        
                                                        //Force treating the components as UTC to get correct IST shift
                                                        const utcDate = new Date(Date.UTC(
                                                            d.getFullYear(), d.getMonth(), d.getDate(), 
                                                            d.getHours(), d.getMinutes(), d.getSeconds()
                                                        ));
                                                        return utcDate.toLocaleString('en-GB');
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loadingFeedback && incorrectItems.length === 0 && (
                            <div className="text-center py-16 bg-white/5 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 border-dashed">
                                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <CheckCircle size={32} className="text-emerald-500/70" />
                                </div>
                                <h3 className="text-xl font-medium text-gray-200">All caught up</h3>
                                <p className="text-gray-500 mt-2 text-sm">No incorrect predictions pending review.</p>
                            </div>
                        )}

                        {/*history*/}
                        {exportedItems.length > 0 && (
                            <div className="mt-4">
                                <button
                                    onClick={() => setShowHistory(h => !h)}
                                    className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-200 transition-colors mb-4"
                                >
                                    <ChevronRight size={16} className={`transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                                    Previously Exported ({exportedItems.length} records)
                                </button>
                                {showHistory && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {exportedItems.map(item => (
                                            <div key={item.id} className="bg-black/30 rounded-xl border border-emerald-500/20 overflow-hidden flex flex-col">
                                                {item.image_url ? (
                                                    <div className="h-36 w-full">
                                                        <img src={item.image_url} alt={`Exported ${item.id}`} className="w-full h-full object-cover opacity-70" />
                                                    </div>
                                                ) : (
                                                    <div className="h-36 w-full bg-black/40 flex items-center justify-center">
                                                        <ImageIcon size={28} className="text-gray-600" />
                                                    </div>
                                                )}
                                                <div className="p-4 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500 font-mono">ID: {item.id}</span>
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg uppercase tracking-wider">Exported</span>
                                                    </div>
                                                    <div className="flex gap-2 text-xs">
                                                        <span className="text-rose-400 line-through">{item.prediction}</span>
                                                        <span className="text-gray-500">→</span>
                                                        <span className="text-emerald-400 font-semibold">{item.corrected_label}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-600 font-mono">{(() => {
    if (!item.timestamp) return 'N/A';
    const d = new Date(item.timestamp);
    if (isNaN(d.getTime())) return 'Invalid Date';

    //Force treating the components as UTC to get correct IST shift
    const utcDate = new Date(Date.UTC(
        d.getFullYear(), d.getMonth(), d.getDate(), 
        d.getHours(), d.getMinutes(), d.getSeconds()
    ));
    return utcDate.toLocaleString('en-GB');
})()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            {/*rescuer approvals*/}
            {
                activeTab === 'rescuers' && (
                    <div className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-white/20 transition-colors">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-semibold text-gray-200">Verify Rescuer Identities</h3>
                                <p className="text-sm text-gray-400">Approve or reject account applications for rapid-response personnel.</p>
                            </div>
                        </div>

                        {loadingRescuers ? (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
                                Fetching applications...
                            </div>
                        ) : pendingRescuers.length === 0 ? (
                            <div className="text-center py-16 bg-white/5 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 border-dashed">
                                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <UserCheck size={32} className="text-cyan-500/70" />
                                </div>
                                <h3 className="text-xl font-medium text-gray-200">No Pending Applications</h3>
                                <p className="text-gray-500 mt-2 text-sm">All rescuer accounts have been verified.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {pendingRescuers.map(user => (
                                    <div key={user.id} className="bg-[#000000] rounded-2xl shadow-xl overflow-hidden border border-white/10 flex flex-col hover:border-cyan-500/30 transition-colors">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
                                                        <span className="text-cyan-400 font-bold text-xl">{user.full_name?.charAt(0) || user.username.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white">{user.full_name}</h3>
                                                        <p className="text-sm text-gray-400">@{user.username}</p>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider rounded-lg">
                                                    Pending Review
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mb-6 border-y border-white/5 py-4">
                                                <div>
                                                    <span className="block text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Organization</span>
                                                    <span className="text-gray-200">{user.organization || 'Not provided'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Badge ID</span>
                                                    <span className="text-gray-200 font-mono">{user.badge_number || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Email</span>
                                                    <span className="text-gray-200">{user.email || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Phone</span>
                                                    <span className="text-gray-200">{user.phone || 'N/A'}</span>
                                                </div>
                                            </div>

                                            {user.id_proof_data && (
                                                <div className="mb-6">
                                                    <span className="block text-gray-500 text-xs uppercase tracking-wider font-bold mb-2">Submitted Identity Proof</span>
                                                    <div className="relative group rounded-xl overflow-hidden bg-black/50 border border-white/10">
                                                        {user.id_proof_data.startsWith('data:image') ? (
                                                            <div className="h-40 w-full relative">
                                                                <img
                                                                    src={user.id_proof_data}
                                                                    alt="ID Proof Preview"
                                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                                                                    <button
                                                                        onClick={() => downloadIdProof(user.id_proof_data, user.username)}
                                                                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white font-medium border border-white/20"
                                                                    >
                                                                        <DownloadCloud size={16} /> View / Download File
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-20 w-full flex items-center justify-between px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <FileText className="text-slate-400" />
                                                                    <span className="text-sm text-slate-300">Document Uploaded</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => downloadIdProof(user.id_proof_data, user.username)}
                                                                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-white font-medium border border-white/10 text-xs"
                                                                >
                                                                    <DownloadCloud size={14} /> Download
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => handleVerifyAction(user.id, 'reject')}
                                                    className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl font-semibold flex justify-center items-center gap-2 transition-colors"
                                                >
                                                    <XCircle size={18} /> Reject
                                                </button>
                                                <button
                                                    onClick={() => handleVerifyAction(user.id, 'approve')}
                                                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                                                >
                                                    <CheckCircle size={18} /> Approve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }
            {/*live emergencies*/}
            {
                activeTab === 'emergencies' && (
                    <div className="space-y-6">
                        <div className="bg-red-500/10 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-red-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2"><ShieldAlert size={20} /> Active SOS Requests</h3>
                                <p className="text-sm text-gray-400">Real-time emergency requests dispatched from citizens.</p>
                            </div>
                            <button onClick={fetchEmergencies} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md text-sm font-bold transition-colors">
                                Refresh Data
                            </button>
                        </div>

                        {loadingEmergencies ? (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                                <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mb-4"></div>
                                Fetching emergency signals...
                            </div>
                        ) : emergencies.length === 0 ? (
                            <div className="text-center py-16 bg-white/5 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 border-dashed">
                                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <CheckCircle size={32} className="text-emerald-500/70" />
                                </div>
                                <h3 className="text-xl font-medium text-gray-200">No Active Emergencies</h3>
                                <p className="text-gray-500 mt-2 text-sm">No citizens have requested urgent assistance recently.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {emergencies.map(req => (
                                    <div key={req.id} className={`p-5 rounded-xl border flex flex-col md:flex-row gap-6 relative overflow-hidden bg-[#000000] shadow-xl ${req.urgency === 'High' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : req.urgency === 'Medium' ? 'border-amber-500/30' : 'border-emerald-500/30'}`}>
                                        {req.urgency === 'High' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}

                                        <div className="flex-1 space-y-4">
                                            <div className="flex justify-between items-start flex-wrap gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${req.urgency === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : req.urgency === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                        {req.urgency || 'Unknown'} Priority
                                                    </span>
                                                    <span className="ml-1 text-sm text-gray-500 font-mono">{req.timestamp}</span>
                                                </div>
                                                {/*status/action*/}
                                                <div className="flex items-center gap-2">
                                                    {!isAdmin ? (
                                                        <button
                                                            onClick={() => resolveEmergency(req.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors"
                                                            title="Mark this request as fulfilled"
                                                        >
                                                            <CheckCircle size={13} /> Mark Fulfilled
                                                        </button>
                                                    ) : req.status === 'fulfilled' ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                                            <CheckCircle size={13} className="text-emerald-400" />
                                                            <span className="text-xs font-bold text-emerald-400">Fulfilled</span>
                                                            {req.fulfilled_by && (
                                                                <span className="text-xs text-gray-400 ml-1">by <span className="text-emerald-300 font-semibold">{req.fulfilled_by}</span></span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                                            <span className="text-xs font-bold text-amber-400">Pending</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-1">Situation Report</h4>
                                                <p className="text-gray-200 bg-white/5 p-3 rounded-lg border border-white/5">{req.report_text}</p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                                <div>
                                                    <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-1 flex items-center gap-1"><MapPin size={12} /> Location</h4>
                                                    <p className="text-sm text-gray-300 font-medium">{req.address}</p>
                                                </div>
                                                {(req.username || req.full_name) && (
                                                    <div className="bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10">
                                                        <h4 className="text-xs uppercase font-bold text-indigo-400/70 tracking-wider mb-2">Requester Details</h4>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold text-indigo-300">{req.full_name || req.username}</p>
                                                            {req.phone && <p className="text-xs text-gray-400">Phone: <span className="text-gray-200">{req.phone}</span></p>}
                                                            <p className="text-xs text-gray-400">User ID: <span className="font-mono text-gray-500">{req.username}</span></p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/*map link*/}
                                        {req.lat && req.lng && (
                                            <div className="md:w-48 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                                                <div className="text-center">
                                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 mb-2">
                                                        <MapPin size={24} />
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 font-mono shrink-0">GPS Coordinates Attached</p>
                                                </div>
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${req.lat},${req.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg text-center transition-colors"
                                                >
                                                    Open in Maps
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    )
}

export default AdminPanel
