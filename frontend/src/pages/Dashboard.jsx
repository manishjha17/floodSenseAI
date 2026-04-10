import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useSearchParams, Navigate } from 'react-router-dom'
import axios from 'axios'
import {
    Activity,
    CloudRain,
    Map,
    LifeBuoy,
    Download,
    Settings,
    ShieldAlert,
    LogOut,
    User,
    Menu,
    X,
    Lock,
    LogIn,
    Database,
    Users,
    AlertTriangle
} from 'lucide-react'
import AssessmentForm from '../components/AssessmentForm'
import FindResources from './FindResources'
import RequestHelp from './RequestHelp'
import DownloadReport from './DownloadReport'
import AdminPanel from './AdminPanel'
import FloodPrediction from './FloodPrediction'

// Modal shown when a guest tries to access a restricted page
const SignInPromptModal = ({ onClose, onLogout }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Card */}
            <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-2xl p-8 flex flex-col items-center gap-5 text-center">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-white p-1 rounded-lg transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.15)]">
                    <Lock size={28} className="text-indigo-400" />
                </div>

                <div className="space-y-1.5">
                    <h2 className="text-xl font-bold text-white">Sign In Required</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        This feature is only available to signed-in users.<br />
                        Please sign in to continue.
                    </p>
                </div>

                <div className="w-full space-y-3 pt-1">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    >
                        <LogIn size={16} />
                        Sign In Now
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                    >
                        Continue as Guest
                    </button>
                </div>

                <p className="text-xs text-gray-600">
                    Guest access: Damage Assessment, Flood Forecast &amp; Resources only
                </p>
            </div>
        </div>
    )
}

// Wrapper that gates a component behind sign-in for guests
const GuestGuard = ({ userRole, onLogout, children }) => {
    const [showPrompt, setShowPrompt] = useState(true)

    if (userRole === 'guest') {
        return (
            <>
                {/* Blur the underlying page content */}
                <div className="pointer-events-none select-none blur-sm opacity-40">
                    {children}
                </div>
                {showPrompt && (
                    <SignInPromptModal
                        onClose={() => setShowPrompt(false)}
                        onLogout={onLogout}
                    />
                )}
                {/* If modal dismissed, show a re-trigger button */}
                {!showPrompt && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <Lock size={40} className="text-indigo-400" />
                        <p className="text-gray-400 text-sm">This page requires sign-in.</p>
                        <button
                            onClick={onLogout}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
                        >
                            Sign In to Access
                        </button>
                    </div>
                )}
            </>
        )
    }

    return children
}

const ProfileModal = ({ username, userRole, onClose, onLogout }) => {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/profile/${username}`)
                setProfile(res.data)
            } catch (err) {
                setError('Failed to load profile data.')
            } finally {
                setLoading(false)
            }
        }
        if (username && userRole !== 'guest') fetchProfile()
        else setLoading(false)
    }, [username, userRole])

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 rounded-lg transition-colors">
                    <X size={18} />
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center border border-white/10 shrink-0 shadow-inner">
                        <User size={24} className="text-gray-300" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h2 className="text-xl font-bold text-white tracking-tight truncate">{profile?.full_name || username || 'Guest'}</h2>
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${userRole === 'admin' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : userRole === 'rescuer' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : userRole === 'citizen' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                            {userRole}
                        </span>
                    </div>
                </div>

                <div className="w-full h-px bg-white/10 my-2"></div>

                {loading ? (
                    <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div></div>
                ) : error ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm text-center">{error}</div>
                ) : profile ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-3">
                            <div className="col-span-2">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Email</p>
                                <p className="text-sm text-gray-200 font-medium truncate">{profile.email || 'N/A'}</p>
                            </div>
                            {(profile.phone || profile.address) && (
                                <>
                                    {profile.phone && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Phone</p>
                                            <p className="text-sm text-gray-200 font-medium">{profile.phone}</p>
                                        </div>
                                    )}
                                    {profile.address && (
                                        <div className={!profile.phone ? "col-span-2" : ""}>
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Address / Region</p>
                                            <p className="text-sm text-gray-200 font-medium truncate">{profile.address}</p>
                                        </div>
                                    )}
                                </>
                            )}
                            {profile.role === 'rescuer' && (
                                <>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Organization</p>
                                        <p className="text-sm text-gray-200 font-medium truncate">{profile.organization || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Badge</p>
                                        <p className="text-sm text-gray-200 font-medium truncate">{profile.badge_number || 'N/A'}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-sm text-gray-400">Profile data not available for generic guests.</div>
                )}

                <div className="mt-4 pt-4 border-t border-white/10 w-full">
                    <button onClick={onLogout} className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex items-center justify-center gap-2">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
}

const Dashboard = ({ userRole, username, onLogout }) => {
    const location = useLocation()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

    const isGuest = userRole === 'guest'
    const restrictedPaths = ['/help', '/report']

    const getLinkClass = (path) => {
        const isActive = location.pathname === path
        const isRestricted = isGuest && restrictedPaths.includes(path)
        return `flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 border outline-none ${isActive
            ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/10 text-indigo-300 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
            : isRestricted
                ? 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-100 hover:bg-white/5'
            }`
    }

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false)
    }

    return (
        <div className="flex h-full w-full bg-transparent overflow-hidden relative">

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#000000]/95 md:bg-white/5 backdrop-blur-xl border-r border-white/10 
                transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <h1 className="text-xl font-bold text-gray-100 tracking-wide">Flood<span className="text-indigo-400">Sense</span> AI</h1>
                    </div>

                    {/* Close button for mobile */}
                    <button
                        onClick={closeMobileMenu}
                        className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 mt-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {/* Damage Assessment — hidden for admins */}
                    {userRole !== 'admin' && (
                        <Link to="/" className={getLinkClass('/')} onClick={closeMobileMenu}>
                            <Map size={18} />
                            <span className="font-medium text-sm">Damage Assessment</span>
                        </Link>
                    )}
                    <Link to="/forecast" className={getLinkClass('/forecast')} onClick={closeMobileMenu}>
                        <CloudRain size={18} />
                        <span className="font-medium text-sm">Flood Forecast</span>
                    </Link>
                    <Link to="/resources" className={getLinkClass('/resources')} onClick={closeMobileMenu}>
                        <LifeBuoy size={18} />
                        <span className="font-medium text-sm">Resources</span>
                    </Link>

                    {/* Request Help — only for citizens/guests, hidden for rescuers & admins */}
                    {userRole !== 'rescuer' && userRole !== 'admin' && (
                        <Link to="/help" className={getLinkClass('/help')} onClick={closeMobileMenu}>
                            <ShieldAlert size={18} />
                            <span className="font-medium text-sm">Request Help</span>
                            {isGuest && <Lock size={12} className="ml-auto text-gray-600" />}
                        </Link>
                    )}

                    {/* Reports — only for citizens/guests, hidden for rescuers & admins */}
                    {userRole !== 'rescuer' && userRole !== 'admin' && (
                        <Link to="/report" className={getLinkClass('/report')} onClick={closeMobileMenu}>
                            <Download size={18} />
                            <span className="font-medium text-sm">Reports</span>
                            {isGuest && <Lock size={12} className="ml-auto text-gray-600" />}
                        </Link>
                    )}

                    {/* Live Emergencies — shown as regular nav tab for rescuers */}
                    {userRole === 'rescuer' && (
                        <Link to="/emergencies" className={getLinkClass('/emergencies')} onClick={closeMobileMenu}>
                            <ShieldAlert size={18} />
                            <span className="font-medium text-sm">Live Emergencies</span>
                        </Link>
                    )}

                    {/* Admin section links — shown directly in sidebar for admins */}
                    {userRole === 'admin' && (
                        <>
                            <Link to="/feedback" className={getLinkClass('/feedback')} onClick={closeMobileMenu}>
                                <Database size={18} />
                                <span className="font-medium text-sm">Model Feedback</span>
                            </Link>
                            <Link to="/rescuers" className={getLinkClass('/rescuers')} onClick={closeMobileMenu}>
                                <Users size={18} />
                                <span className="font-medium text-sm">Pending Rescuers</span>
                            </Link>
                            <Link to="/emergencies" className={getLinkClass('/emergencies')} onClick={closeMobileMenu}>
                                <AlertTriangle size={18} />
                                <span className="font-medium text-sm">Live Emergencies</span>
                            </Link>
                        </>
                    )}
                </nav>

                {/* Guest sign-in nudge */}
                {isGuest && (
                    <div className="mx-3 mb-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
                        <p className="text-xs text-gray-500 mb-2 leading-relaxed">Sign in to unlock all features</p>
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition-all"
                        >
                            <LogIn size={13} />
                            Sign In
                        </button>
                    </div>
                )}

                <div className="p-4 mt-auto border-t border-white/10">
                    <button
                        onClick={onLogout}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
                    >
                        <LogOut size={16} />
                        <span>{isGuest ? 'Exit Guest Mode' : 'Sign Out'}</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent z-10">

                {/* Top Header */}
                <header className="flex-shrink-0 h-16 border-b border-white/5 bg-white/[0.02] backdrop-blur-md flex items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <Menu size={20} />
                        </button>

                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-sm text-gray-400">Current role:</span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border shadow-[0_0_10px_rgba(99,102,241,0.1)] ${isGuest
                                ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                }`}>
                                {isGuest ? 'Guest' : userRole}
                            </span>
                            {isGuest && (
                                <button
                                    onClick={onLogout}
                                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/10 transition-all flex items-center gap-1"
                                >
                                    <LogIn size={11} /> Sign In
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-5">

                        <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-full">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center border border-white/10">
                                <User size={16} className="text-gray-300" />
                            </div>
                        </button>
                    </div>
                </header>

                {isProfileModalOpen && (
                    <ProfileModal
                        username={username}
                        userRole={userRole}
                        onClose={() => setIsProfileModalOpen(false)}
                        onLogout={onLogout}
                    />
                )}

                {/* Main Scrollable Content */}
                <main className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar relative z-0">
                    <div className="max-w-6xl mx-auto">
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    userRole === 'admin' 
                                        ? <Navigate to="/forecast" replace /> 
                                        : <AssessmentForm username={username} userRole={userRole} onLogout={onLogout} />
                                } 
                            />
                            <Route path="/forecast" element={<FloodPrediction />} />
                            <Route path="/resources" element={<FindResources />} />
                            <Route
                                path="/help"
                                element={
                                    <GuestGuard userRole={userRole} onLogout={onLogout}>
                                        <RequestHelp username={username} />
                                    </GuestGuard>
                                }
                            />
                            <Route
                                path="/report"
                                element={
                                    <GuestGuard userRole={userRole} onLogout={onLogout}>
                                        <DownloadReport username={username} />
                                    </GuestGuard>
                                }
                            />
                            <Route path="/admin" element={<AdminPanel userRole={userRole} username={username} />} />
                            <Route path="/feedback" element={<AdminPanel userRole={userRole} username={username} forcedTab="feedback" />} />
                            <Route path="/rescuers" element={<AdminPanel userRole={userRole} username={username} forcedTab="rescuers" />} />
                            <Route path="/emergencies" element={<AdminPanel userRole={userRole} username={username} forcedTab="emergencies" />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default Dashboard
