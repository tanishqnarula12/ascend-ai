import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Camera, Check, Brain, Sparkles, Calendar, Activity, Flame, Skull, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { isPushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush } from '../lib/push';

// Expressiveness presets for the Reality Check. Brutal unleashes uncensored profanity;
// Normal and Hard tone it down for users who don't want the swearing.
const EXPRESSIVENESS_LEVELS = [
    { id: 'normal', label: 'Normal', icon: Sparkles, desc: 'Supportive & professional coaching.', accent: 'text-emerald-500', ring: 'ring-emerald-500', bg: 'bg-emerald-500' },
    { id: 'hard', label: 'Hard', icon: Flame, desc: 'Blunt tough-love. No profanity.', accent: 'text-amber-500', ring: 'ring-amber-500', bg: 'bg-amber-500' },
    { id: 'brutal', label: 'Brutal', icon: Skull, desc: 'Uncensored & savage. Explicit language.', accent: 'text-red-500', ring: 'ring-red-500', bg: 'bg-red-500' },
];

const Profile = () => {
    const { currentUser, setCurrentUser, api } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: currentUser?.username || '',
        email: currentUser?.email || '',
    });
    const fileInputRef = useRef(null);

    // Reality Check state
    const [expressLevel, setExpressLevel] = useState('brutal');
    const [verdict, setVerdict] = useState(null);
    const [verdictLoading, setVerdictLoading] = useState(false);

    // Push notification toggle state
    const [pushState, setPushState] = useState('checking');
    const [pushBusy, setPushBusy] = useState(false);

    useEffect(() => {
        if (isPushSupported()) {
            getPushSubscriptionState().then(setPushState).catch(() => setPushState('unsupported'));
        } else {
            setPushState('unsupported');
        }
    }, []);

    const toggleNotifications = async () => {
        if (pushBusy || pushState === 'denied') return;
        setPushBusy(true);
        try {
            if (pushState === 'subscribed') {
                await unsubscribeFromPush();
                setPushState('unsubscribed');
            } else {
                await subscribeToPush();
                setPushState('subscribed');
            }
        } catch {
            setPushState(Notification.permission === 'denied' ? 'denied' : 'unsubscribed');
        } finally {
            setPushBusy(false);
        }
    };

    const runRealityCheck = async () => {
        setVerdictLoading(true);
        setVerdict(null);
        try {
            const res = await api.get(`/ai/verdict?level=${expressLevel}`);
            setVerdict(res.data.verdict);
        } catch (e) {
            setVerdict('The AI refused to speak. Wait 30s and try again.');
        } finally {
            setVerdictLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.put('/auth/profile', { 
                username: formData.username, 
                email: formData.email,
                photoUrl: currentUser?.photoUrl 
            });
            const updatedUser = response.data;
            setCurrentUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile', error);
            alert('Failed to update profile: ' + (error.response?.data?.message || error.message));
        }
    };

    const handlePhotoClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handlePhotoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const img = new Image();
                img.onload = async () => {
                    // Create an intelligently compressed 250x250 portrait 
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Maintain aspect ratio while sizing down
                    const maxDim = 250;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxDim) {
                            height *= maxDim / width;
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width *= maxDim / height;
                            height = maxDim;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Super compressed base64 jpg (virtually instant upload!)
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

                    try {
                        const response = await api.put('/auth/profile', { 
                            username: currentUser.username, 
                            email: currentUser.email,
                            photoUrl: compressedBase64 
                        });
                        const updatedUser = response.data;
                        setCurrentUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    } catch (error) {
                        console.error('Failed to upload photo', error);
                        alert('Failed to upload photo: ' + (error.response?.data?.message || 'Server timeout'));
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    // Calculate a display date
    const dateJoined = "March 2026";

    const randomMindsetMessage = React.useMemo(() => {
        const name = currentUser?.username || 'User';
        const templates = [
            <span key="1">"Success is the sum of small efforts repeated day in and day out." Keep up the amazing work, <strong className="font-bold text-primary">{name}</strong>. Every task you complete here is bringing you one step closer to your ultimate vision.</span>,
            <span key="2">"Excellence is not an act, but a habit." The consistency you bring today is the foundation for your success tomorrow, <strong className="font-bold text-primary">{name}</strong>. Keep climbing!</span>,
            <span key="3">Your potential is limitless, <strong className="font-bold text-primary">{name}</strong>. Focus on your most important tasks, block out the noise, and watch as you turn your goals into continuous achievements.</span>,
            <span key="4">Big journeys begin with small steps. Stay disciplined, <strong className="font-bold text-primary">{name}</strong>, and trust the process. You are building an incredible system for your personal growth.</span>,
            <span key="5">"Vision without execution is just a hallucination." You are here to execute, <strong className="font-bold text-primary">{name}</strong>. Let your daily actions echo your long-term ambitions.</span>
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }, [currentUser?.username]);

    const notificationCopy = {
        subscribed: { label: 'On', hint: 'You\'ll get notified about pending tasks & new reports.' },
        unsubscribed: { label: 'Off', hint: 'Turn on to get notified about pending tasks & new reports.' },
        denied: { label: 'Blocked', hint: 'Allow notifications for this site in your browser settings.' },
        unsupported: { label: 'Unavailable', hint: 'Not supported on this browser/device.' },
        checking: { label: '…', hint: '' },
    };
    const notifCopy = notificationCopy[pushState] || notificationCopy.unsubscribed;

    return (
        <div className="w-full pb-8">
            {/* Header Banner */}
            <div className="w-full h-28 md:h-40 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-background border border-border/50 relative shadow-sm overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400/10 via-transparent to-transparent opacity-50"></div>
                <div className="absolute top-5 left-6 md:top-7 md:left-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                        Profile Details
                    </h1>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-2 sm:px-6 relative z-10 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start -mt-12 md:-mt-16">

                    {/* Left Column - Profile Identity & Status */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-4 flex flex-col items-center lg:items-start"
                    >
                        {/* Avatar */}
                        <div className="relative group cursor-pointer mb-4" onClick={handlePhotoClick}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoChange}
                            />
                            <div className="w-28 h-28 md:w-32 md:h-32 bg-secondary text-primary rounded-full flex items-center justify-center text-4xl md:text-5xl font-bold border-[5px] border-background shadow-xl overflow-hidden relative z-10">
                                {currentUser?.photoUrl ? (
                                    <img src={currentUser.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    currentUser?.username?.charAt(0).toUpperCase() || 'U'
                                )}
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-20 backdrop-blur-sm">
                                    <Camera className="text-white w-7 h-7 mb-1" />
                                    <span className="text-[10px] text-white font-medium uppercase tracking-wider">Change photo</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center lg:text-left w-full">
                            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1.5">{currentUser?.username || 'User'}</h2>
                            <div className="inline-flex bg-secondary/50 px-3 py-1 rounded-full mb-5">
                                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2"><Mail size={14} /> {currentUser?.email || 'No email provided'}</p>
                            </div>

                            <div className="w-full bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                                <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <Shield size={16} className="text-primary" /> Account Status
                                </h3>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Status</span>
                                    <span className="text-green-500 font-bold flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1 rounded-md">
                                        <Check size={14} strokeWidth={3} /> Active
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Member Since</span>
                                    <span className="text-foreground font-medium flex items-center gap-1.5">
                                        <Calendar size={14} className="text-muted-foreground" /> {dateJoined}
                                    </span>
                                </div>
                            </div>

                            {pushState !== 'unsupported' && pushState !== 'checking' && (
                                <div className="w-full bg-card border border-border rounded-xl p-5 shadow-sm mt-4">
                                    <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                                        <Bell size={16} className="text-primary" /> Notifications
                                    </h3>
                                    <div className="flex justify-between items-center gap-3">
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-foreground">Push Notifications</p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notifCopy.hint}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={toggleNotifications}
                                            disabled={pushBusy || pushState === 'denied'}
                                            aria-pressed={pushState === 'subscribed'}
                                            aria-label="Toggle push notifications"
                                            className={`relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${pushState === 'subscribed' ? 'bg-primary' : 'bg-secondary'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pushState === 'subscribed' ? 'translate-x-5' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Right Column - Forms & AI Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-8 space-y-6 lg:mt-20"
                    >
                        {/* Editor Section */}
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                    <User className="text-primary w-5 h-5" /> 
                                    Account Details
                                </h3>
                                <button 
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-sm bg-primary/10 text-primary px-4 py-1.5 rounded-full hover:bg-primary/20 transition font-medium"
                                >
                                    {isEditing ? 'Cancel' : 'Edit Profile'}
                                </button>
                            </div>

                            {isEditing ? (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Username</label>
                                            <input 
                                                type="text" 
                                                name="username"
                                                value={formData.username} 
                                                onChange={handleChange}
                                                className="w-full p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Email Address</label>
                                            <input 
                                                type="email" 
                                                name="email"
                                                value={formData.email} 
                                                onChange={handleChange}
                                                className="w-full p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <button type="submit" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition shadow-sm flex items-center gap-2">
                                            <Check size={18}/> Save Changes
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-secondary/30 rounded-xl border border-border/40 flex flex-col gap-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Username</p>
                                        <p className="text-foreground font-medium text-lg">{currentUser?.username || 'Not set'}</p>
                                    </div>
                                    <div className="p-4 bg-secondary/30 rounded-xl border border-border/40 flex flex-col gap-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email Address</p>
                                        <p className="text-foreground font-medium text-lg">{currentUser?.email || 'Not set'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* AI Reports Summary Section inside Profile */}
                        <div className="bg-card border border-primary/20 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors duration-500"></div>
                            
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                                <Brain className="text-primary w-5 h-5" /> 
                                Personal Blueprint
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 flex items-center gap-1.5 border-b border-border/60 pb-4">
                                <Sparkles size={14} className="text-primary"/>
                                Building momentum since <strong>{dateJoined}</strong>
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="bg-background border border-border p-4 rounded-xl hover:border-primary/30 transition-colors">
                                    <p className="text-[11px] text-primary font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Sparkles size={12} /> Core Mindset</p>
                                    <p className="text-sm text-foreground/90 leading-relaxed">
                                        {randomMindsetMessage}
                                    </p>
                                </div>
                                <div className="bg-background border border-border p-4 rounded-xl hover:border-primary/30 transition-colors">
                                    <p className="text-[11px] text-primary font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Brain size={12} /> System Philosophy</p>
                                    <p className="text-sm text-foreground/90 leading-relaxed">
                                        AscendAI is engineered to maintain your momentum. Remember to focus on consistency over intensity—break your massive goals into manageable daily bites to guarantee long-term progress.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Standalone AI Verdict Section */}
                        <div className="bg-card border border-primary/20 rounded-2xl p-6 shadow-sm relative overflow-hidden group mt-6">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/10 transition-colors duration-500"></div>
                            
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                                <Activity className="text-primary w-5 h-5" />
                                The Ascend Matrix Reality Check
                            </h3>
                            <p className="text-sm text-muted-foreground mb-5 pb-2">
                                Request an honest audit of your recent task velocity and consistency. Choose how hard the AI hits.
                            </p>

                            {/* Expressiveness Filter */}
                            <div className="mb-5 relative z-10">
                                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Expressiveness Level</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {EXPRESSIVENESS_LEVELS.map((lvl) => {
                                        const Icon = lvl.icon;
                                        const active = expressLevel === lvl.id;
                                        return (
                                            <button
                                                key={lvl.id}
                                                type="button"
                                                onClick={() => setExpressLevel(lvl.id)}
                                                className={`text-left p-3 rounded-xl border transition-all duration-200 ${active
                                                    ? `border-transparent ring-2 ${lvl.ring} bg-secondary/60 shadow-sm`
                                                    : 'border-border bg-background hover:border-primary/30 hover:bg-secondary/30'
                                                    }`}
                                            >
                                                <span className={`flex items-center gap-1.5 font-bold text-sm ${active ? lvl.accent : 'text-foreground'}`}>
                                                    <Icon size={15} /> {lvl.label}
                                                </span>
                                                <span className="block text-[11px] text-muted-foreground mt-1 leading-snug">{lvl.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {expressLevel === 'brutal' && (
                                    <p className="text-[11px] text-red-500/90 mt-2 flex items-center gap-1.5">
                                        <Skull size={12} /> Heads up: Brutal mode uses explicit, uncensored language.
                                    </p>
                                )}
                            </div>

                            <div className="bg-background border border-primary/20 p-5 rounded-xl transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 relative z-10">
                                    <p className="text-sm text-primary font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Brain size={16} /> Matrix Output
                                    </p>
                                    <button
                                        onClick={runRealityCheck}
                                        disabled={verdictLoading}
                                        className="text-sm bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:scale-105 transition-transform font-bold shadow-md relative z-10 cursor-pointer w-full sm:w-auto disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
                                    >
                                        {verdictLoading ? 'Connecting...' : 'Execute Reality Check'}
                                    </button>
                                </div>
                                <div className="bg-black/20 p-4 rounded-lg border border-primary/10 relative z-10">
                                    <p className="text-[15px] text-foreground/90 leading-relaxed font-medium min-h-[60px] italic border-l-2 border-primary/50 pl-4 py-1 whitespace-pre-line">
                                        {verdictLoading
                                            ? 'Analyzing your discipline...'
                                            : (verdict || 'System idle. Pick an expressiveness level and click the button above to receive an honest review of your recent progress.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
