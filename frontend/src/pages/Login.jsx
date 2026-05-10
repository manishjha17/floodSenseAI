import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Eye, EyeOff, X, UploadCloud, CheckCircle2, ChevronDown, Trash2 } from 'lucide-react'

// Reusable custom floating label input
const FloatingInput = ({ label, id, type = "text", value, onChange, required, rightIcon, onRightIconClick, className = "", ...props }) => {
    return (
        <div className={`relative ${className}`}>
            <input
                type={type}
                id={id}
                required={required}
                className="peer w-full bg-[#060B15]/50 border border-white/10 rounded-xl pb-1 pt-8 px-4 text-white text-sm focus:outline-none focus:border-[#0284c7] focus:ring-[3px] focus:ring-[#0284c7]/15 transition-all placeholder-transparent"
                placeholder={label}
                value={value}
                onChange={onChange}
                {...props}
            />
            <label
                htmlFor={id}
                className="absolute left-4 top-2.5 text-[10px] uppercase tracking-[0.05em] text-slate-400 font-bold transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-placeholder-shown:text-slate-500 peer-focus:top-2.5 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-[#0284c7] peer-focus:font-bold cursor-text pointer-events-none"
            >
                <span>{label}</span>
                {required && <span className="text-red-500 ml-1 inline-block">*</span>}
            </label>
            {rightIcon && (
                <button type="button" onClick={onRightIconClick} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-10 flex items-center justify-center p-1">
                    {rightIcon}
                </button>
            )}
        </div>
    )
}

const Login = ({ onLogin }) => {
    // Scroll state for navbar
    const [isScrolled, setIsScrolled] = useState(false)

    // Auth Modal State
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [authMode, setAuthMode] = useState('login') // 'login', 'register', 'forgot-password', 'reset-password'

    // Form State
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [selectedRole, setSelectedRole] = useState('citizen')
    const [passwordBlurred, setPasswordBlurred] = useState(false)

    // Registration extra fields
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [organization, setOrganization] = useState('')
    const [badgeNumber, setBadgeNumber] = useState('')
    const [idProofData, setIdProofData] = useState(null)
    const [idProofName, setIdProofName] = useState('')

    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // Custom Dropdown State
    const [isRoleOpen, setIsRoleOpen] = useState(false)
    const [isQuestionOpen, setIsQuestionOpen] = useState(false)
    const roleRef = useRef(null)
    const questionRef = useRef(null)

    // Security Question state
    const [securityQuestion, setSecurityQuestion] = useState('What was your first pet\'s name?')
    const [securityAnswer, setSecurityAnswer] = useState('')

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (roleRef.current && !roleRef.current.contains(event.target)) {
                setIsRoleOpen(false)
            }
            if (questionRef.current && !questionRef.current.contains(event.target)) {
                setIsQuestionOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (sessionStorage.getItem('auto_open_login')) {
            setShowLoginModal(true)
            sessionStorage.removeItem('auto_open_login')
        }
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 40)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Scroll Reveal Animation
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.remove('opacity-0', 'translate-y-8')
                        entry.target.classList.add('opacity-100', 'translate-y-0')
                        observer.unobserve(entry.target)
                    }
                })
            },
            { threshold: 0.1 }
        )
        const elements = document.querySelectorAll('.scroll-reveal')
        elements.forEach((el) => observer.observe(el))
        return () => observer.disconnect()
    }, [])

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        setIdProofName(file.name)
        const reader = new FileReader()
        reader.onloadend = () => {
            setIdProofData(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const resetForm = () => {
        setUsername('')
        setPassword('')
        setNewPassword('')
        setFullName('')
        setEmail('')
        setPhone('')
        setAddress('')
        setOrganization('')
        setBadgeNumber('')
        setIdProofData(null)
        setIdProofName('')
        setSecurityQuestion('What was your first pet\'s name?')
        setSecurityAnswer('')
        setError('')
        setSuccessMsg('')
    }

    const switchMode = (mode) => {
        setAuthMode(mode)
        resetForm()
        if (mode === 'register' && selectedRole === 'admin') {
            setSelectedRole('citizen') // Admin registration not allowed through public UI
        }
    }

    const handleAuthSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccessMsg('')
        setIsLoading(true)

        // Password Complexity Validation for Register/Reset
        if (authMode === 'register' || authMode === 'reset-password') {
            const pwd = authMode === 'register' ? password : newPassword;
            const hasMinLen = pwd.length >= 8;
            const hasLower = /[a-z]/.test(pwd);
            const hasUpper = /[A-Z]/.test(pwd);
            const hasNumber = /[0-9]/.test(pwd);
            const hasSpecial = /[#.\-?!@$%^&*]/.test(pwd);

            if (!(hasMinLen && hasLower && hasUpper && hasNumber && hasSpecial)) {
                setError('Please meet all password security requirements.');
                setIsLoading(false);
                return;
            }
        }

        if (authMode === 'login') {
            try {
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
                    username,
                    password
                })

                const actualRole = response.data.role;

                if (actualRole !== selectedRole) {
                    setError(`Login successful, but you are not a ${selectedRole}. You are a ${actualRole}.`)
                    setIsLoading(false)
                    return;
                }

                onLogin(actualRole, response.data.username, response.data.token)
            } catch (err) {
                setIsLoading(false)
                if (err.response && err.response.status === 403) {
                    setError(err.response.data.detail || 'Your account is pending admin verification.')
                } else if (err.response && err.response.status === 401) {
                    setError('Invalid username or password')
                } else {
                    console.error(err)
                    setError(`Login failed: ${err.message || 'Unknown error'}`)
                }
            }
        } else if (authMode === 'register') {
            // Registration Mode
            if (!idProofData) {
                setError('ID Proof Document is required.')
                setIsLoading(false)
                return
            }

            // Phone Validation
            if (phone) {
                const phoneRegex = /^\+?[0-9]{10,15}$/;
                if (!phoneRegex.test(phone)) {
                    setError('Invalid phone number format. Please enter 10 to 15 digits, optionally starting with +.');
                    setIsLoading(false);
                    return;
                }
            }

            // Email Validation
            if (email) {
                // Regex for standard email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setError('Invalid email address format. Please enter a valid email.');
                    setIsLoading(false);
                    return;
                }
            }

            try {
                const payload = {
                    username,
                    password,
                    role: selectedRole,
                    full_name: fullName,
                    email,
                    phone,
                    address: selectedRole === 'citizen' ? address : undefined,
                    organization: selectedRole === 'rescuer' ? organization : undefined,
                    badge_number: selectedRole === 'rescuer' ? badgeNumber : undefined,
                    id_proof_data: idProofData,
                    security_question: securityQuestion,
                    security_answer: securityAnswer
                }

                const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, payload)

                setIsLoading(false)
                setSuccessMsg(response.data.message)

                const currUser = username
                resetForm()
                setUsername(currUser)

                setTimeout(() => {
                    setAuthMode('login')
                    setSuccessMsg('')
                }, 3000)

            } catch (err) {
                setIsLoading(false)
                if (err.response && err.response.status === 409) {
                    setError(err.response.data.detail || 'Username already exists.')
                } else {
                    console.error(err)
                    setError(`Registration failed: ${err.message || 'Unknown error'}`)
                }
            }
        } else if (authMode === 'forgot-password') {
            try {
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/forgot-password-question`, {
                    username
                })
                setSecurityQuestion(response.data.question)
                setIsLoading(false)
                setSuccessMsg('User found. Please answer your security question.')
                setTimeout(() => {
                    setSuccessMsg('')
                    setAuthMode('reset-password')
                }, 1500)
            } catch (err) {
                setIsLoading(false)
                if (err.response && err.response.status === 404) {
                    setError('User not found.')
                } else if (err.response && err.response.status === 400) {
                    setError(err.response.data.detail)
                } else {
                    console.error(err)
                    setError('Failed to retrieve security question.')
                }
            }
        } else if (authMode === 'reset-password') {
            try {
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
                    username,
                    security_answer: securityAnswer,
                    newPassword
                })
                setIsLoading(false)
                setSuccessMsg(response.data.message)
                setTimeout(() => {
                    switchMode('login')
                }, 2000)
            } catch (err) {
                setIsLoading(false)
                if (err.response && err.response.status === 401) {
                    setError('Incorrect security answer.')
                } else {
                    console.error(err)
                    setError('Failed to reset password.')
                }
            }
        }
    }

    const handleGuestAccess = () => {
        onLogin('guest', null)
    }

    // Available roles in dropdown based on mode
    const roles = [
        { id: 'citizen', label: 'Citizen', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { id: 'rescuer', label: 'Rescuer', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>, color: 'text-[#0284c7]', bg: 'bg-[#0284c7]/10' }
    ]
    if (authMode === 'login') {
        roles.push({ id: 'admin', label: 'Admin', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>, color: 'text-rose-400', bg: 'bg-rose-500/10' })
    }

    return (
        <div className="min-h-screen bg-[#020813] text-slate-300 font-sans selection:bg-[#0284c7]/30 selection:text-white relative">

            {/* Background Ambient Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-cyan-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 blur-[120px] rounded-full"></div>
            </div>

            {/* Sticky Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-[#020813]/80 backdrop-blur-xl border-white/10 py-4 shadow-lg shadow-black/50' : 'bg-transparent border-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">FloodSense AI</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                        <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
                        <a href="#workflow" className="hover:text-cyan-400 transition-colors">Workflow</a>
                        <a href="#impact" className="hover:text-cyan-400 transition-colors">Impact</a>
                        <a href="#sdg" className="hover:text-cyan-400 transition-colors">SDG Alignment</a>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="text-sm font-semibold text-white bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full border border-white/10 transition-all"
                        >
                            Log In / Register
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 pt-32">

                {/* 1. Hero Section */}
                <section className="scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 ease-out max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-24 text-center lg:text-left flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2 space-y-8">

                        <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
                            Forecast Floods. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Assess Damage.</span>
                        </h1>
                        <p className="text-lg lg:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                            A unified intelligence platform integrating real-time open-source weather APIs with Deep Learning (CNNs) to predict flood risks and instantly classify post-disaster structural damage.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <button
                                onClick={() => setShowLoginModal(true)}
                                className="w-full sm:w-auto px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-bold shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all active:scale-95"
                            >
                                Access Dashboard
                            </button>
                            <a href="#workflow" className="w-full sm:w-auto px-8 py-4 bg-transparent border border-slate-600 hover:border-slate-400 text-slate-300 rounded-full font-bold transition-all text-center">
                                Learn How It Works
                            </a>
                        </div>
                    </div>

                    {/* Hero Abstract UI Preview */}
                    <div className="lg:w-1/2 w-full relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 blur-3xl rounded-full"></div>
                        <div className="relative bg-[#0d1526]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden aspect-[4/3] flex flex-col">
                            {/* Faux Header */}
                            <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                            </div>
                            {/* Faux Content */}
                            <div className="flex-1 p-6 flex flex-col gap-4">
                                <div className="w-1/3 h-4 rounded-md bg-white/10"></div>
                                <div className="flex gap-4">
                                    <div className="w-1/2 h-32 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 flex flex-col justify-between p-4">
                                        <div className="text-xs text-red-400 font-bold tracking-widest">FLOOD RISK</div>
                                        <div className="text-3xl font-bold text-white">84%</div>
                                    </div>
                                    <div className="w-1/2 h-32 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col justify-between p-4">
                                        <div className="text-xs text-cyan-400 font-bold tracking-widest">RIVER DISCHARGE</div>
                                        <div className="text-3xl font-bold text-white">0.82 m³/s</div>
                                    </div>
                                </div>
                                <div className="flex-1 rounded-xl bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center border border-white/10 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[#020813]/60"></div>
                                    {/* Faux Map Pins */}
                                    <div className="absolute top-1/2 left-1/3 w-4 h-4 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse"></div>
                                    <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,1)] animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Problem / Solution Split */}
                <section className="scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 ease-out bg-white/[0.02] border-y border-white/5 py-24">
                    <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold text-white">The Problem</h2>
                            <p className="text-slate-400 leading-relaxed text-lg">
                                When floods hit, response teams waste hours doing manual surveys with no real-time data. By the time damage is assessed, lives and resources are already lost.
                            </p>
                        </div>
                        <div className="space-y-6 pl-0 md:pl-16 border-l-0 md:border-l border-white/10">
                            <h2 className="text-3xl font-bold text-cyan-400">Our Solution</h2>
                            <p className="text-slate-400 leading-relaxed text-lg">
                                We use live weather data and a trained AI model to instantly predict flood risk by location. Users can also upload flood photos and get instant damage severity results — all in one platform.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. Features Grid */}
                <section id="features" className="scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 ease-out max-w-7xl mx-auto px-6 md:px-12 py-32">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-4xl font-extrabold text-white">Platform Capabilities</h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">Everything you need — from flood prediction to damage assessment — in one simple platform for citizens, rescuers, and admins.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 hover:bg-[#171717] hover:border-cyan-500/30 transition-all group">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Real-time Flood Prediction</h3>
                            <p className="text-slate-400 leading-relaxed text-sm">Enter any location and get an instant flood risk score — Low, Moderate, High, or Severe — based on live rainfall, river level, and soil data.</p>
                        </div>
                        {/* Feature 2 */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 hover:bg-[#171717] hover:border-cyan-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl"></div>
                            <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">AI Image Assessment</h3>
                            <p className="text-slate-400 leading-relaxed text-sm">Upload drone or satellite imagery of affected areas. Our custom CNN model classifies structural damage as Minor, Moderate, or Severe instantly.</p>
                        </div>
                        {/* Feature 3 */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 hover:bg-[#171717] hover:border-red-500/30 transition-all group">
                            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Role-Based Dashboards</h3>
                            <p className="text-slate-400 leading-relaxed text-sm">Different views for Citizens, Rescuers, and Admins — each person sees only what they need to act fast.</p>
                        </div>
                    </div>
                </section>

                {/* 4. Workflow Section */}
                <section id="workflow" className="scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 ease-out bg-[#040814] py-32 border-y border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-1/4 w-[40vw] h-[40vw] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none"></div>
                    <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                        <div className="text-center mb-20 space-y-4">
                            <h2 className="text-4xl font-extrabold text-white">How It Works</h2>
                            <p className="text-slate-400 text-lg max-w-2xl mx-auto">A simple 6-step process — from checking flood risk to submitting reports and requesting help.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                            {/* Desktop Connectors - Row 1 (1 -> 2 -> 3) */}
                            <div className="hidden md:block absolute top-[28px] left-[16.666%] right-[16.666%] h-0.5 bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-indigo-500/50 pointer-events-none"></div>

                            {/* Mobile Connectors - Vertical */}
                            <div className="md:hidden absolute top-[28px] bottom-[28px] left-[27px] w-0.5 bg-gradient-to-b from-cyan-500/50 via-purple-500/50 to-emerald-500/50 pointer-events-none"></div>

                            {/* Step 1 */}
                            <div className="relative pl-16 md:pl-0 md:pt-16">
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 md:top-0 w-14 h-14 bg-[#060B15] border-2 border-cyan-500 rounded-2xl flex items-center justify-center font-bold text-xl text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] z-10">1</div>
                                <div className="md:text-center">
                                    <h3 className="text-xl font-bold text-white mb-3">Gather Data</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">The user enters a location. We fetch live rainfall, river discharge, and soil moisture data from free weather APIs for that area.</p>
                                </div>
                            </div>
                            {/* Step 2 */}
                            <div className="relative pl-16 md:pl-0 md:pt-16">
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 md:top-0 w-14 h-14 bg-[#060B15] border-2 border-blue-500 rounded-2xl flex items-center justify-center font-bold text-xl text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] z-10">2</div>
                                <div className="md:text-center">
                                    <h3 className="text-xl font-bold text-white mb-3">Predict Flood Risk</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">Our ML model analyses the live data and gives a flood risk score — Low, Moderate, High, or Severe — with a clear explanation.</p>
                                </div>
                            </div>
                            {/* Step 3 */}
                            <div className="relative pl-16 md:pl-0 md:pt-16">
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 md:top-0 w-14 h-14 bg-[#060B15] border-2 border-indigo-500 rounded-2xl flex items-center justify-center font-bold text-xl text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] z-10">3</div>
                                <div className="md:text-center">
                                    <h3 className="text-xl font-bold text-white mb-3">Assess Damage</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">Upload a photo of flood-affected area. Our CNN model instantly classifies structural damage as Minor, Moderate, or Severe.</p>
                                </div>
                            </div>
                        </div>

                        {/* Row 2 Flow */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 md:mt-16 relative">
                            {/* Desktop Connector - Vertical connection from Row 1 to Row 2 on right side (Snake) */}
                            <div className="hidden md:block absolute -top-16 right-[16.666%] w-0.5 h-16 bg-gradient-to-b from-indigo-500/50 to-purple-500/50 pointer-events-none"></div>

                            {/* Desktop Connectors - Row 2 (6 <- 5 <- 4) */}
                            <div className="hidden md:block absolute top-[28px] left-[16.666%] right-[16.666%] h-0.5 bg-gradient-to-r from-emerald-500/50 via-pink-500/50 to-purple-500/50 pointer-events-none"></div>

                            {/* Step 4 */}
                            <div className="relative pl-16 md:pl-0 md:pt-16 md:order-3">
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 md:top-0 w-14 h-14 bg-[#060B15] border-2 border-purple-500 rounded-2xl flex items-center justify-center font-bold text-xl text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] z-10">4</div>
                                <div className="md:text-center">
                                    <h3 className="text-xl font-bold text-white mb-3">Generate Report</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">A detailed damage report is automatically created and can be downloaded as a PDF, showing risk scores, image results, and location details.</p>
                                </div>
                            </div>
                            {/* Step 5 */}
                            <div className="relative pl-16 md:pl-0 md:pt-16 md:order-2">
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 md:top-0 w-14 h-14 bg-[#060B15] border-2 border-pink-500 rounded-2xl flex items-center justify-center font-bold text-xl text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)] z-10">5</div>
                                <div className="md:text-center">
                                    <h3 className="text-xl font-bold text-white mb-3">Request Help</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">Citizens can submit an urgent help request with their location and situation. Rescue teams are notified with the priority level.</p>
                                </div>
                            </div>
                            {/* Step 6 */}
                            <div className="relative pl-16 md:pl-0 md:pt-16 md:order-1">
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 md:top-0 w-14 h-14 bg-[#060B15] border-2 border-emerald-500 rounded-2xl flex items-center justify-center font-bold text-xl text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] z-10">6</div>
                                <div className="md:text-center">
                                    <h3 className="text-xl font-bold text-white mb-3">Admin Control</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">Admins review all submitted reports and help requests, verify user registrations, and manage rescue operations from a central panel.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. Impact Section */}
                <section id="impact" className="scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 ease-out max-w-7xl mx-auto px-6 md:px-12 py-32">
                    {/* Section Header — same pattern as other sections */}
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-4xl font-extrabold text-white">Real-world <span className="text-cyan-400">Impact</span></h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            FloodSense AI saves time, reduces errors, and helps people act fast during floods — whether they're a citizen, a rescuer, or an admin.
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-[#0B1220] to-[#040814] border border-white/10 rounded-3xl p-8 md:p-16 relative overflow-hidden">
                        <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none"></div>
                        <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
                            <div className="space-y-6">
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-4">
                                        <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <span className="text-slate-300">Cuts damage assessment time from days to just seconds.</span>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <span className="text-slate-300">Shows flood risk for any location using live weather data.</span>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <span className="text-slate-300">Lets citizens request help and rescuers find them instantly.</span>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <span className="text-slate-300">Gives admins a clear overview to manage resources and reports.</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#02050E]/80 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex flex-col justify-start transition-all duration-300 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                                    <div className="text-2xl font-black text-white mb-1">Rapid</div>
                                    <div className="text-xs text-slate-500 font-bold tracking-wider uppercase">Response Time</div>
                                </div>
                                <div className="bg-[#02050E]/80 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex flex-col justify-start transition-all duration-300 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                    <div className="text-2xl font-black text-cyan-400 mb-1">24/7</div>
                                    <div className="text-xs text-slate-500 font-bold tracking-wider uppercase">On Demand</div>
                                </div>
                                <div className="bg-[#02050E]/80 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex flex-col justify-start transition-all duration-300 hover:border-red-400/60 hover:shadow-[0_0_20px_rgba(248,113,113,0.2)]">
                                    <div className="text-2xl font-black text-red-400 mb-1">Smart</div>
                                    <div className="text-xs text-slate-500 font-bold tracking-wider uppercase">Resource Allocation</div>
                                </div>
                                <div className="bg-[#02050E]/80 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex flex-col justify-start transition-all duration-300 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                                    <div className="text-2xl font-black text-white mb-1">Proactive</div>
                                    <div className="text-xs text-slate-500 font-bold tracking-wider uppercase">Community Safety</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* 6. SDG Mapping Section */}
                <div className="bg-white/[0.02] border-y border-white/5">
                    <section id="sdg" className="scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 ease-out max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-32">
                        <div className="text-center mb-16 space-y-4">

                            <h2 className="text-4xl font-extrabold text-white">SDG Alignment</h2>
                            <p className="text-slate-400 text-lg max-w-2xl mx-auto">FloodSense AI directly advances four United Nations Sustainable Development Goals, contributing to a more resilient, equitable, and sustainable world.</p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* SDG 3 */}
                            <div className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-green-500/40 transition-all overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full group-hover:bg-green-500/10 transition-all"></div>
                                <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(22,163,74,0.3)] group-hover:scale-110 transition-transform">
                                    <span className="text-white font-black text-xl">3</span>
                                </div>
                                <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">SDG 3</p>
                                <h3 className="text-lg font-bold text-white mb-3">Good Health & Well-being</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">Early flood warnings and real-time emergency resource mapping help rescue teams reach the injured faster, reducing flood-related casualties and health crises.</p>
                            </div>

                            {/* SDG 9 */}
                            <div className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-orange-500/40 transition-all overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full group-hover:bg-orange-500/10 transition-all"></div>
                                <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(249,115,22,0.3)] group-hover:scale-110 transition-transform">
                                    <span className="text-white font-black text-xl">9</span>
                                </div>
                                <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">SDG 9</p>
                                <h3 className="text-lg font-bold text-white mb-3">Industry, Innovation & Infrastructure</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">Our CNN-powered damage detection and real-time API infrastructure support resilient, tech-driven disaster response systems.</p>
                            </div>

                            {/* SDG 11 */}
                            <div className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-amber-500/40 transition-all overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full group-hover:bg-amber-500/10 transition-all"></div>
                                <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:scale-110 transition-transform">
                                    <span className="text-white font-black text-xl">11</span>
                                </div>
                                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">SDG 11</p>
                                <h3 className="text-lg font-bold text-white mb-3">Sustainable Cities</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">By classifying structural damage at scale, FloodSense AI directly informs urban planners and governments on rebuilding resilient, flood-resistant infrastructure.</p>
                            </div>

                            {/* SDG 13 */}
                            <div className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-all overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-2xl rounded-full group-hover:bg-cyan-500/10 transition-all"></div>
                                <div className="w-14 h-14 rounded-2xl bg-cyan-600 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(8,145,178,0.3)] group-hover:scale-110 transition-transform">
                                    <span className="text-white font-black text-xl">13</span>
                                </div>
                                <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">SDG 13</p>
                                <h3 className="text-lg font-bold text-white mb-3">Climate Action</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">Continuous real-time meteorological monitoring and ML-based predictions contribute directly to proactive climate disaster preparedness and adaptive response frameworks.</p>
                            </div>
                        </div>

                        {/* UN SDG Banner */}
                        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="flex gap-2">
                                    <div className="w-6 h-6 rounded bg-green-600 flex items-center justify-center text-white text-[10px] font-black">3</div>
                                    <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white text-[10px] font-black">9</div>
                                    <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-white text-[10px] font-black">11</div>
                                    <div className="w-6 h-6 rounded bg-cyan-600 flex items-center justify-center text-white text-[10px] font-black">13</div>
                                </div>
                                <span className="text-slate-400 text-sm">Contributing to <span className="text-white font-semibold">4 of 17</span> UN Sustainable Development Goals</span>
                            </div>
                            <a href="https://sdgs.un.org/goals" target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2">Learn more about the UN SDGs →</a>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <footer className="scroll-reveal opacity-0 transition-all duration-1000 ease-out border-t border-white/5 bg-[#00040d] px-6 md:px-12 py-8">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Brand */}
                        <div className="flex items-center gap-2 text-slate-400">
                            <svg className="w-4 h-4 text-cyan-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-sm font-semibold text-white">FloodSense AI</span>
                            <span className="text-slate-700 mx-1">·</span>
                            <span className="text-xs">AI-driven flood intelligence &amp; damage assessment</span>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5 group"
                        >
                            Sign In to Portal
                            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>

                        {/* Copyright */}
                        <p className="text-xs text-slate-600 font-medium">
                            © 2026 FloodSense AI
                        </p>
                    </div>
                </footer>
            </main>

            {/* Login / Register PREMIUM Modal Overlay */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity"
                        onClick={() => setShowLoginModal(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative w-full max-w-[480px] max-h-[90vh] overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#02050E] to-[#060B15] backdrop-blur-[15px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full z-10 transition-colors"
                            onClick={() => setShowLoginModal(false)}
                        >
                            <X size={18} />
                        </button>

                        <div className="text-center mb-6">
                            <h2 className="text-[28px] font-semibold text-white tracking-tight leading-tight">System Access</h2>
                            <p className="text-sm text-slate-400 opacity-70 mt-1">Authenticate or create an account</p>
                        </div>

                        {/* Tabs (Hidden during forgot-password flow) */}
                        {authMode === 'login' || authMode === 'register' ? (
                            <div className="relative flex p-1 bg-[#02050E]/80 rounded-xl mb-8 border border-white/10">
                                {/* Animated pill background */}
                                <div className="absolute inset-1 flex pointer-events-none">
                                    <div className={`w-1/2 bg-[#0284c7] rounded-lg shadow-[0_2px_10px_rgba(2,132,199,0.3)] transition-transform duration-300 ease-in-out ${authMode === 'login' ? 'translate-x-0' : 'translate-x-full'}`}></div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${authMode === 'login' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchMode('register')}
                                    className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${authMode === 'register' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Register
                                </button>
                            </div>
                        ) : (
                            <div className="mb-6 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                    Back to Login
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleAuthSubmit} className="space-y-4">
                            {/* Role Selector */}
                            {(authMode === 'login' || authMode === 'register') && (
                                <div className="space-y-1.5 relative mb-2" ref={roleRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsRoleOpen(!isRoleOpen)}
                                        className={`w-full relative flex items-center justify-between px-4 pb-2.5 pt-6 rounded-xl border text-left transition-all ${isRoleOpen ? 'bg-[#060B15] border-[#0284c7] ring-[3px] ring-[#0284c7]/15' : 'bg-[#060B15]/50 border-white/10 hover:border-white/20'}`}
                                    >
                                        <span className={`absolute left-4 top-2.5 text-[10px] uppercase tracking-[0.05em] font-bold transition-colors ${isRoleOpen ? 'text-[#0284c7]' : 'text-slate-400'}`}>
                                            {authMode === 'register' ? 'Registering As' : 'System Role'}
                                        </span>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center ${selectedRole === 'citizen' ? 'bg-emerald-500/20 text-emerald-400' : selectedRole === 'rescuer' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {selectedRole === 'citizen' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                                {selectedRole === 'rescuer' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                                {selectedRole === 'admin' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                                            </div>
                                            <span className="font-semibold text-white text-sm">
                                                {selectedRole === 'citizen' && 'Citizen'}
                                                {selectedRole === 'rescuer' && 'Rescuer'}
                                                {selectedRole === 'admin' && 'Admin'}
                                            </span>
                                        </div>
                                        <ChevronDown size={18} className={`transition-transform duration-300 ${isRoleOpen ? 'rotate-180 text-[#0284c7]' : 'text-slate-400'}`} />
                                    </button>

                                    {isRoleOpen && (
                                        <div className="absolute z-50 w-full mt-2 bg-[#060B15] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                                            {roles.map((role) => (
                                                <button
                                                    key={role.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedRole(role.id)
                                                        setIsRoleOpen(false)
                                                    }}
                                                    className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${selectedRole === role.id
                                                        ? 'bg-white/10'
                                                        : 'hover:bg-white/5'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${role.bg} ${role.color}`}>
                                                        {role.icon}
                                                    </div>
                                                    <span className={`font-semibold text-sm ${selectedRole === role.id ? 'text-white' : 'text-slate-400'}`}>
                                                        {role.label}
                                                    </span>
                                                    {selectedRole === role.id && (
                                                        <CheckCircle2 size={16} className="ml-auto text-[#0284c7]" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CORE AUTH FIELDS */}
                            <FloatingInput
                                id="username"
                                label="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={authMode === 'reset-password'}
                            />

                            {(authMode === 'login' || authMode === 'register') && (
                                <div>
                                    <FloatingInput
                                        id="password"
                                        label="Password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setPasswordBlurred(false)}
                                        onBlur={() => setPasswordBlurred(true)}
                                        required
                                        rightIcon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        onRightIconClick={() => setShowPassword(!showPassword)}
                                    />

                                    {/* Password Validator UI (Context-Aware) */}
                                    {authMode === 'register' && (
                                        (() => {
                                            const rules = [
                                                { label: "Min. 8 characters", met: password.length >= 8 },
                                                { label: "Lowercase letter", met: /[a-z]/.test(password) },
                                                { label: "Uppercase letter", met: /[A-Z]/.test(password) },
                                                { label: "Include number", met: /[0-9]/.test(password) },
                                                { label: "Special character", met: /[#.\-?!@$%^&*]/.test(password) },
                                            ];
                                            const allMet = rules.every(r => r.met);

                                            // Only show if not all met, or if we haven't finished typing (not blurred)
                                            if (allMet && passwordBlurred) return null;

                                            return (
                                                <div className={`mt-4 grid grid-cols-2 gap-2 p-4 bg-black/40 border rounded-xl transition-all duration-300 ${passwordBlurred && !allMet ? 'border-rose-500/30 ring-1 ring-rose-500/20' : 'border-white/5'}`}>
                                                    {rules.map((rule, idx) => {
                                                        const showRed = passwordBlurred && !rule.met;
                                                        return (
                                                            <div key={idx} className={`flex items-center gap-2 text-[11px] transition-colors ${rule.met ? 'text-emerald-400' : showRed ? 'text-rose-400' : 'text-slate-500'}`}>
                                                                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${rule.met ? 'bg-emerald-500/20 border-emerald-500/50' : showRed ? 'bg-rose-500/10 border-rose-500/50' : 'border-slate-700'}`}>
                                                                    {rule.met ? <CheckCircle2 size={10} /> : showRed ? <X size={8} /> : null}
                                                                </div>
                                                                <span>{rule.met ? 'Done: ' : ''}{rule.label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {!allMet && (
                                                        <div className="col-span-2 mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-600">
                                                            Accepted symbols: <code className="text-slate-400">#.-?!@$%^&*</code>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()
                                    )}
                                    {authMode === 'login' && (
                                        <div className="flex justify-end mt-2">
                                            <button
                                                type="button"
                                                onClick={() => switchMode('forgot-password')}
                                                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* FORGOT PASSWORD FIELDS */}
                            {authMode === 'reset-password' && (
                                <div className="space-y-4 pt-4 mt-2 animate-in fade-in duration-300">
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center shadow-inner">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Security Question</div>
                                        <div className="font-semibold text-white text-[15px]">{securityQuestion}</div>
                                    </div>

                                    <FloatingInput
                                        id="securityAnswer"
                                        label="Your Answer"
                                        value={securityAnswer}
                                        onChange={(e) => setSecurityAnswer(e.target.value)}
                                        required
                                    />

                                    <FloatingInput
                                        id="newPassword"
                                        label="New Password"
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        rightIcon={showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        onRightIconClick={() => setShowNewPassword(!showNewPassword)}
                                    />
                                </div>
                            )}

                            {/* REGISTRATION FIELDS */}
                            {authMode === 'register' && (
                                <div className="space-y-4 pt-4 mt-2 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FloatingInput
                                            id="fullName"
                                            label="Full Name"
                                            value={fullName}
                                            onChange={(e) => {
                                                // Only allow letters, spaces, hyphens, and apostrophes
                                                const val = e.target.value.replace(/[^a-zA-Z\s\-']/g, '');
                                                setFullName(val);
                                            }}
                                            required
                                        />
                                        <FloatingInput
                                            id="email"
                                            label="Email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FloatingInput
                                            id="phone"
                                            label="Phone Number"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => {
                                                // Only allow numbers, spaces, plus sign, hyphens, and parentheses
                                                const val = e.target.value.replace(/[^0-9\s+\-()]/g, '');
                                                setPhone(val);
                                            }}
                                            required={selectedRole === 'rescuer'}
                                        />

                                        {/* Address logic for Citizen / Rescuer */}
                                        {selectedRole === 'citizen' ? (
                                            <FloatingInput
                                                id="address"
                                                label="Primary Address / Region"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                required
                                            />
                                        ) : (
                                            <FloatingInput
                                                id="organization"
                                                label="Organization / Agency"
                                                value={organization}
                                                onChange={(e) => setOrganization(e.target.value)}
                                                required
                                            />
                                        )}
                                    </div>

                                    {selectedRole === 'rescuer' && (
                                        <FloatingInput
                                            id="badge"
                                            label="Responder Badge / ID #"
                                            value={badgeNumber}
                                            onChange={(e) => setBadgeNumber(e.target.value)}
                                            required
                                        />
                                    )}

                                    {/* Security Question Field */}
                                    <div className="space-y-1.5 relative mb-2" ref={questionRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsQuestionOpen(!isQuestionOpen)}
                                            className={`w-full relative flex items-center justify-between px-4 pb-2.5 pt-6 rounded-xl border text-left transition-all ${isQuestionOpen ? 'bg-[#060B15] border-[#0284c7] ring-[3px] ring-[#0284c7]/15' : 'bg-[#060B15]/50 border-white/10 hover:border-white/20'}`}
                                        >
                                            <span className={`absolute left-4 top-2.5 text-[10px] uppercase tracking-[0.05em] font-bold transition-colors ${isQuestionOpen ? 'text-[#0284c7]' : 'text-slate-400'}`}>
                                                Security Question <span className="text-red-500">*</span>
                                            </span>
                                            <div className="flex items-center gap-3 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                                <span className="font-semibold text-white text-sm truncate">
                                                    {securityQuestion}
                                                </span>
                                            </div>
                                            <ChevronDown size={18} className={`transition-transform duration-300 ${isQuestionOpen ? 'rotate-180 text-[#0284c7]' : 'text-slate-400'} shrink-0`} />
                                        </button>

                                        {isQuestionOpen && (
                                            <div className="absolute z-50 w-full mt-2 bg-[#060B15] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                                                {[
                                                    "What was your first pet's name?",
                                                    "What is your mother's maiden name?",
                                                    "In what city were you born?",
                                                    "What was the name of your first school?",
                                                    "What was your childhood nickname?"
                                                ].map((q) => (
                                                    <button
                                                        key={q}
                                                        type="button"
                                                        onClick={() => {
                                                            setSecurityQuestion(q)
                                                            setIsQuestionOpen(false)
                                                        }}
                                                        className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${securityQuestion === q ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                                    >
                                                        <span className={`font-semibold text-sm truncate ${securityQuestion === q ? 'text-white' : 'text-slate-400'}`}>
                                                            {q}
                                                        </span>
                                                        {securityQuestion === q && (
                                                            <CheckCircle2 size={16} className="ml-auto text-[#0284c7] shrink-0" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <FloatingInput
                                        id="securityAnswer"
                                        label="Security Answer"
                                        value={securityAnswer}
                                        onChange={(e) => setSecurityAnswer(e.target.value)}
                                        required
                                    />

                                    {/* ID Proof Dropzone */}
                                    <div className="pt-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.05em] block mb-2 pl-4">
                                            Valid ID Proof Document <span className="text-red-500">*</span>
                                        </label>
                                        {!idProofName ? (
                                            <div className="relative group rounded-xl overflow-hidden">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    id="id-proof"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    onChange={handleFileChange}
                                                />
                                                <div className="flex flex-col items-center justify-center w-full px-4 py-8 border border-dashed border-white/20 bg-[#060B15]/30 group-hover:bg-[#060B15]/70 group-hover:border-[#0284c7]/50 transition-all">
                                                    <UploadCloud size={24} className="text-slate-400 group-hover:text-[#0284c7] mb-3 transition-colors" />
                                                    <span className="text-sm font-semibold text-slate-300">Drag &amp; drop ID proof here</span>
                                                    <span className="text-xs font-medium text-slate-500 mt-1 pointer-events-none">or click to browse</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex border border-emerald-500/30 bg-emerald-500/10 rounded-xl px-4 py-3.5 items-center justify-between shadow-inner">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                                    <span className="text-sm text-emerald-300 font-semibold truncate">{idProofName}</span>
                                                </div>
                                                <button type="button" onClick={() => { setIdProofName(''); setIdProofData(null); }} className="text-slate-400 hover:text-rose-400 p-1.5 bg-black/20 hover:bg-black/40 rounded-lg transition-colors border border-transparent hover:border-rose-500/30 ml-2">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl font-medium flex items-center justify-center text-center animate-in fade-in shake text-balance">
                                    {error}
                                </div>
                            )}

                            {successMsg && (
                                <div className="p-3 mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl font-medium flex items-center justify-center text-center animate-in fade-in text-balance">
                                    {successMsg}
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full h-[50px] rounded-xl font-bold transition-all text-[15px] tracking-wide shadow-lg flex items-center justify-center ${isLoading ? 'bg-[#060B15] text-slate-400 border border-white/10 cursor-not-allowed' : 'bg-gradient-to-r from-[#0369a1] to-[#0284c7] text-white hover:shadow-[0_8px_20px_rgba(2,132,199,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none border border-transparent'
                                        }`}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        authMode === 'login' ? 'Sign In' :
                                            authMode === 'register' ? 'Create Account' :
                                                authMode === 'forgot-password' ? 'Find Account' :
                                                    'Reset Password'
                                    )}
                                </button>
                            </div>

                            {authMode === 'login' && (
                                <>
                                    <div className="relative flex items-center py-4">
                                        <div className="flex-1 h-[1px] bg-white/5"></div>
                                        <span className="px-4 text-xs font-semibold text-slate-500 lowercase">or</span>
                                        <div className="flex-1 h-[1px] bg-white/5"></div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleGuestAccess}
                                        className="w-full h-[50px] rounded-xl font-semibold text-[14px] text-slate-400 hover:text-white bg-transparent border border-transparent hover:bg-white/5 transition-all"
                                    >
                                        Continue as Guest
                                    </button>
                                    <p className="text-center text-[11px] font-medium text-slate-500 mt-2">
                                        Guest access is limited — Help &amp; Reports require sign-in
                                    </p>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes zoom-in-95 {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes subtle-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .shake {
                    animation: subtle-shake 0.35s ease-in-out;
                }
                .animate-in {
                    animation-fill-mode: forwards;
                }
                .fade-in {
                    animation-name: fade-in;
                }
                .zoom-in-95 {
                    animation-name: zoom-in-95;
                }
                .duration-200 {
                    animation-duration: 200ms;
                }
                .duration-300 {
                    animation-duration: 300ms;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}} />
        </div>
    )
}

export default Login
