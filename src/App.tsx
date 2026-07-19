import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Terminal, 
  User, 
  Trophy, 
  Plus, 
  Layers, 
  ChevronRight, 
  Info, 
  Clock, 
  Search, 
  Download, 
  Cpu, 
  Globe, 
  Key, 
  Map, 
  FileText, 
  Network, 
  CheckCircle, 
  AlertTriangle,
  Award,
  LogOut,
  Sliders,
  Database
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { dbService, isLeaderboardFrozen, setLeaderboardFreeze } from './database';
import type { Challenge, Team, SubmissionLog, CTFStats, ChallengeCategory, ChallengeDifficulty } from './types';
import { getSavedFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, isFirebaseConfigured } from './firebase';

export default function App() {
  // Navigation & User session
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard' | 'challenges' | 'leaderboard' | 'profile' | 'admin'>('landing');
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionLog[]>([]);
  const [stats, setStats] = useState<CTFStats>({
    totalTeams: 0,
    totalChallenges: 0,
    prizePool: '$2,500',
    eventEndTimestamp: new Date(Date.now() + 86400000 * 2).toISOString()
  });

  // Theme configuration modal / Firebase config
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  // Challenge filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  // Interactive inputs for submissions / hints / administration
  const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
  const [incorrectFlags, setIncorrectFlags] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

  // Toast notification
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false, message: '', type: 'info'
  });

  // Authentication Fields (Login / Register Modal)
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [authForm, setAuthForm] = useState({
    teamName: '',
    teamLeader: '',
    email: '',
    password: ''
  });

  // Admin states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminAuthInput, setAdminAuthInput] = useState({ email: '', password: '' });
  const [isFrozen, setIsFrozen] = useState(isLeaderboardFrozen());
  const [editingChallenge, setEditingChallenge] = useState<Partial<Challenge> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adminSolutionOpen, setAdminSolutionOpen] = useState<Record<string, boolean>>({});

  // Sound effects fallback (synthesized AudioContext to work without media files)
  const playSound = (type: 'success' | 'error' | 'click' | 'intro') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'click') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === 'intro') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
        osc.start();
        osc.stop(ctx.currentTime + 0.7);
      }
    } catch (e) {
      console.warn('Audio API not allowed or supported', e);
    }
  };

  // Matrix Background Effect Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*()_-+=[]{}|;:,.<>?';
    const fontSize = 14;
    const columns = width / fontSize;
    const rainDrops = Array.from({ length: Math.floor(columns) }).map(() => 1);

    const draw = () => {
      ctx.fillStyle = 'rgba(5, 5, 8, 0.05)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#00ff88';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

        if (rainDrops[i] * fontSize > height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
    };

    const interval = setInterval(draw, 33);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sync state data on load
  const reloadData = async () => {
    const freshStats = await dbService.getStats();
    const freshTeams = await dbService.getTeams();
    const freshChallenges = await dbService.getChallenges();
    const freshSubmissions = await dbService.getSubmissions();

    setStats(freshStats);
    setAllTeams(freshTeams);
    setChallenges(freshChallenges);
    setSubmissions(freshSubmissions);

    // Sync active session if logged in
    const activeTeamId = sessionStorage.getItem('cyber_ctf_active_team_id');
    if (activeTeamId) {
      const active = freshTeams.find(t => t.id === activeTeamId);
      if (active) {
        setCurrentTeam(active);
      }
    }
  };

  useEffect(() => {
    sessionStorage.removeItem('cyber_ctf_active_team_id');
    reloadData();
    playSound('intro');
    // Load config state
    const saved = getSavedFirebaseConfig();
    if (saved) {
      setFirebaseConfigInput(saved);
    }
  }, []);


  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { teamName, teamLeader, email, password } = authForm;
    if (!teamName || !teamLeader || !email || !password) {
      triggerToast('All credentials are required to spawn a session.', 'error');
      playSound('error');
      return;
    }

    const newTeam: Team = {
      id: 'team-' + Math.random().toString(36).substr(2, 9),
      name: teamName,
      leader: teamLeader,
      email,
      points: 0,
      solvedChallenges: [],
      usedHints: [],
      badges: [],
      lastSubmissionTime: new Date().toISOString()
    };

    await dbService.saveTeam(newTeam);
    setCurrentTeam(newTeam);
    sessionStorage.setItem('cyber_ctf_active_team_id', newTeam.id);
    setAuthMode(null);
    triggerToast(`Team ${teamName} registered successfully!`, 'success');
    playSound('success');
    reloadData();
    setActiveTab('dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email } = authForm;
    const teams = await dbService.getTeams();
    const match = teams.find(t => t.email.toLowerCase() === email.toLowerCase());

    if (match) {
      setCurrentTeam(match);
      sessionStorage.setItem('cyber_ctf_active_team_id', match.id);
      setAuthMode(null);
      triggerToast(`Access Granted: Welcome back, ${match.name}.`, 'success');
      playSound('success');
      reloadData();
      setActiveTab('dashboard');
    } else {
      triggerToast('Access Denied: Invalid team credentials.', 'error');
      playSound('error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('cyber_ctf_active_team_id');
    setCurrentTeam(null);
    setActiveTab('landing');
    triggerToast('Logged out. Session terminated.', 'info');
    playSound('click');
  };

  const handleFlagSubmit = async (challengeId: string) => {
    if (!currentTeam) {
      triggerToast('You must register/login to submit flags.', 'error');
      playSound('error');
      return;
    }

    const input = flagInputs[challengeId] || '';
    if (!input) {
      triggerToast('Please type a flag sequence first.', 'info');
      return;
    }

    const res = await dbService.submitFlag(currentTeam.id, challengeId, input);

    if (res.success) {
      triggerToast(res.message, 'success');
      playSound('success');
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ff88', '#00cfff', '#bd00ff']
      });

      // Clear field
      setFlagInputs(prev => ({ ...prev, [challengeId]: '' }));
      reloadData();
    } else {
      triggerToast(res.message, 'error');
      playSound('error');
      setIncorrectFlags(prev => ({ ...prev, [challengeId]: true }));
      setTimeout(() => {
        setIncorrectFlags(prev => ({ ...prev, [challengeId]: false }));
      }, 5000);
    }
  };

  // Handle hint with penalty deduction
  const handleUseHint = async (challengeId: string) => {
    if (!currentTeam) {
      triggerToast('You must login to reveal hints.', 'error');
      return;
    }
    const alreadyUsed = revealedHints[challengeId];
    if (alreadyUsed) {
      // Just toggle off
      setRevealedHints(prev => ({ ...prev, [challengeId]: false }));
      return;
    }
    // First time — apply penalty
    const res = await dbService.useHint(currentTeam.id, challengeId);
    setRevealedHints(prev => ({ ...prev, [challengeId]: true }));
    triggerToast(res.message, 'info');
    playSound('click');
    reloadData();
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(firebaseConfigInput);
    triggerToast('Configuration updated! Reloading app...', 'success');
    setShowConfigModal(false);
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleClearFirebaseConfig = () => {
    clearFirebaseConfig();
    triggerToast('Configuration cleared! Reloading to Local mode...', 'info');
    setShowConfigModal(false);
    setTimeout(() => window.location.reload(), 1000);
  };

  // Admin challenge CRUD operations
  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;

    const chal: Challenge = {
      id: editingChallenge.id || 'ch-' + Math.random().toString(36).substr(2, 9),
      title: editingChallenge.title || 'Untitled Challenge',
      category: editingChallenge.category as ChallengeCategory || 'Linux',
      difficulty: editingChallenge.difficulty as ChallengeDifficulty || 'Easy',
      points: Number(editingChallenge.points) || 100,
      description: editingChallenge.description || '',
      attachmentName: editingChallenge.attachmentName || '',
      flag: editingChallenge.flag || 'flag{placeholder}',
      hint: editingChallenge.hint || '',
      hintReleased: editingChallenge.hintReleased || false
    };

    await dbService.saveChallenge(chal);
    triggerToast('Challenge configurations synchronized.', 'success');
    playSound('success');
    setEditingChallenge(null);
    setShowAddForm(false);
    reloadData();
  };

  const handleDeleteChallenge = async (id: string) => {
    if (confirm('Verify system deletion on challenge? This cannot be undone.')) {
      await dbService.deleteChallenge(id);
      triggerToast('Challenge purged from core database.', 'info');
      playSound('click');
      reloadData();
    }
  };

  const handleToggleFreeze = () => {
    const nextState = !isFrozen;
    setLeaderboardFreeze(nextState);
    setIsFrozen(nextState);
    triggerToast(`Leaderboard status: ${nextState ? 'FROZEN' : 'ACTIVE'}`, 'info');
    playSound('click');
  };

  // Get active leaderboard standings sorted by points, then last submission
  const sortedLeaderboard = [...allTeams].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    const timeA = a.lastSubmissionTime ? new Date(a.lastSubmissionTime).getTime() : Infinity;
    const timeB = b.lastSubmissionTime ? new Date(b.lastSubmissionTime).getTime() : Infinity;
    return timeA - timeB;
  });

  // Search/Filters for Challenges page
  const filteredChallenges = challenges.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'All' || c.category === selectedCategory;
    const matchDiff = selectedDifficulty === 'All' || c.difficulty === selectedDifficulty;
    return matchSearch && matchCat && matchDiff;
  });

  const getDifficultyColor = (diff: ChallengeDifficulty) => {
    switch (diff) {
      case 'Easy': return 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/5';
      case 'Medium': return 'text-[#00cfff] border-[#00cfff]/30 bg-[#00cfff]/5';
      case 'Hard': return 'text-amber-500 border-amber-500/30 bg-amber-500/5';
      case 'Expert': return 'text-[#bd00ff] border-[#bd00ff]/30 bg-[#bd00ff]/5';
      default: return 'text-gray-400 border-gray-400/30';
    }
  };

  const getCategoryIcon = (cat: ChallengeCategory) => {
    switch (cat) {
      case 'Linux': return <Terminal className="w-4 h-4 text-gray-300" />;
      case 'Web Security': return <Globe className="w-4 h-4 text-[#00cfff]" />;
      case 'Cryptography': return <Key className="w-4 h-4 text-[#bd00ff]" />;
      case 'OSINT': return <Map className="w-4 h-4 text-emerald-400" />;
      case 'Digital Forensics': return <FileText className="w-4 h-4 text-[#00ff88]" />;
      case 'Networking': return <Network className="w-4 h-4 text-pink-400" />;
      case 'Reverse Engineering': return <Cpu className="w-4 h-4 text-orange-400" />;
    }
  };

  return (
    <div className="relative min-h-screen pb-16 bg-[#050508] text-[#f0f4f8]">
      {/* Visual Backdrops */}
      <div className="cyber-grid" />
      <div className="scanline-overlay" />
      <canvas ref={canvasRef} className="matrix-canvas" />

      {/* Header bar / Navbar */}
      <header className="sticky top-0 z-40 w-full bg-black/85 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => { playSound('click'); setActiveTab('landing'); }}
          >
            <div className="relative">
              <Shield className="w-8 h-8 text-[#00ff88] filter drop-shadow-[0_0_12px_rgba(0,255,136,0.6)] group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-[#00ff88]/30 blur-md rounded-full -z-10 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-widest text-white flex items-center gap-1 font-mono m-0">
                CYBER<span className="text-[#00cfff] glow-blue">CTF</span>
                <span className="text-xs bg-[#ff0055]/20 text-[#ff0055] px-2 py-0.5 border border-[#ff0055]/30 rounded font-mono ml-2">2026</span>
              </h1>
            </div>
          </div>

          {/* Navigation links with glow on select */}
          <nav className="hidden md:flex items-center space-x-2 font-mono text-sm">
            <button 
              onClick={() => { playSound('click'); setActiveTab('landing'); }}
              className={`px-4 py-2 rounded-md transition duration-200 ${
                activeTab === 'landing' 
                  ? 'text-[#00ff88] bg-white/5 border border-[#00ff88]/20 shadow-[0_0_10px_rgba(0,255,136,0.15)]' 
                  : 'text-[#8b9bb4] hover:text-white hover:bg-white/5'
              }`}
            >
              System.Init
            </button>
            {currentTeam && (
              <>
                <button 
                  onClick={() => { playSound('click'); setActiveTab('dashboard'); }}
                  className={`px-4 py-2 rounded-md transition duration-200 ${
                    activeTab === 'dashboard' 
                      ? 'text-[#00ff88] bg-white/5 border border-[#00ff88]/20 shadow-[0_0_10px_rgba(0,255,136,0.15)]' 
                      : 'text-[#8b9bb4] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => { playSound('click'); setActiveTab('challenges'); }}
                  className={`px-4 py-2 rounded-md transition duration-200 ${
                    activeTab === 'challenges' 
                      ? 'text-[#00ff88] bg-white/5 border border-[#00ff88]/20 shadow-[0_0_10px_rgba(0,255,136,0.15)]' 
                      : 'text-[#8b9bb4] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Challenges
                </button>
              </>
            )}
            <button 
              onClick={() => { playSound('click'); setActiveTab('leaderboard'); }}
              className={`px-4 py-2 rounded-md transition duration-200 ${
                activeTab === 'leaderboard' 
                  ? 'text-[#00ff88] bg-white/5 border border-[#00ff88]/20 shadow-[0_0_10px_rgba(0,255,136,0.15)]' 
                  : 'text-[#8b9bb4] hover:text-white hover:bg-white/5'
              }`}
            >
              Scoreboard
            </button>
            {currentTeam && (
              <button 
                onClick={() => { playSound('click'); setActiveTab('profile'); }}
                className={`px-4 py-2 rounded-md transition duration-200 ${
                  activeTab === 'profile' 
                    ? 'text-[#00ff88] bg-white/5 border border-[#00ff88]/20 shadow-[0_0_10px_rgba(0,255,136,0.15)]' 
                    : 'text-[#8b9bb4] hover:text-white hover:bg-white/5'
                }`}
              >
                Profile
              </button>
            )}
            <button 
              onClick={() => { playSound('click'); setActiveTab('admin'); }}
              className={`px-4 py-2 rounded-md transition duration-200 ${
                activeTab === 'admin' 
                  ? 'text-[#bd00ff] bg-white/5 border border-[#bd00ff]/20 shadow-[0_0_10px_rgba(189,0,255,0.15)]' 
                  : 'text-[#8b9bb4] hover:text-white hover:bg-white/5'
              }`}
            >
              Admin.Panel
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            {/* Database status widget */}
            <button 
              onClick={() => { playSound('click'); setShowConfigModal(true); }}
              className={`text-xs flex items-center gap-2 px-3 py-2 rounded border transition ${
                isFirebaseConfigured 
                  ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' 
                  : 'border-[#00cfff]/40 text-[#00cfff] bg-[#00cfff]/10 hover:bg-[#00cfff]/20'
              } font-mono`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isFirebaseConfigured ? 'Firebase Production' : 'Sandbox (Local)'}</span>
            </button>

            {currentTeam ? (
              <div className="flex items-center gap-3">
                <span className="hidden lg:inline text-xs text-[#00cfff] font-mono border border-[#00cfff]/20 px-2 py-1 rounded bg-[#00cfff]/5">
                  {currentTeam.name}
                </span>
                <button 
                  onClick={handleLogout}
                  className="neon-button-purple text-xs py-2 px-4 rounded-md flex items-center gap-2 font-mono"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { playSound('click'); setAuthMode('login'); }}
                className="neon-button-green text-xs py-2 px-5 rounded-md font-mono"
              >
                Access Terminal
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Toast popup */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full glass-card border-l-4 border-l-[#00cfff] border border-white/15 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-start space-x-3">
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-[#00ff88] flex-shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-[#00cfff] flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">System Message Broadcast</p>
              <p className="text-sm font-semibold text-white mt-1">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pages Container */}
      <main className="max-w-7xl mx-auto px-6 py-10 relative">
        
        {/* PAGE 1: LANDING PAGE */}
        {activeTab === 'landing' && (
          <div className="space-y-12">
            
            {/* Beautiful Cyber Hero card with premium layout */}
            <div className="relative glass-card p-10 md:p-20 text-center space-y-8 rounded-2xl border border-white/5 overflow-hidden">
              {/* Floating ambient globes */}
              <div className="absolute -top-10 -right-10 w-96 h-96 bg-[#00cfff]/5 rounded-full blur-[120px] pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-[#bd00ff]/5 rounded-full blur-[120px] pointer-events-none"></div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 border border-[#00ff88]/30 bg-[#00ff88]/5 px-4 py-1.5 rounded-full text-xs font-mono text-[#00ff88] tracking-widest uppercase mb-2">
                  <Terminal className="w-4 h-4" />
                  College Technical Festival Live CTF
                </div>
                <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white leading-none">
                  CAPTURE THE FLAG <span className="text-[#00ff88] glow-green">2026</span>
                </h1>
                <p className="text-[#8b9bb4] max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
                  Analyze payloads, reverse engineer binaries, decompile custom systems, exploit vulnerabilities, and decode encrypted sequences.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 justify-center pt-4">
                {currentTeam ? (
                  <button 
                    onClick={() => { playSound('click'); setActiveTab('dashboard'); }}
                    className="neon-button-green py-3.5 px-10 rounded-lg text-sm font-mono tracking-widest"
                  >
                    Enter Control Terminal
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => { playSound('click'); setAuthMode('register'); }}
                      className="neon-button-green py-3.5 px-10 rounded-lg text-sm font-mono tracking-widest"
                    >
                      Establish Team Profile
                    </button>
                    <button 
                      onClick={() => { playSound('click'); setAuthMode('login'); }}
                      className="py-3.5 px-10 rounded-lg text-sm font-mono tracking-widest border border-white/20 text-white bg-white/5 hover:bg-white/10 hover:border-white/40 transition duration-200"
                    >
                      Connect credentials
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'REGISTERED TEAMS', val: allTeams.length || '3', color: 'text-[#00ff88]', glow: 'shadow-[0_0_20px_rgba(0,255,136,0.1)]' },
                { label: 'LIVE CHALLENGE PACKS', val: challenges.length || '5', color: 'text-[#00cfff]', glow: 'shadow-[0_0_20px_rgba(0,207,255,0.1)]' }
              ].map((s, idx) => (
                <div key={idx} className={`glass-card p-8 rounded-xl border border-white/5 text-center space-y-3 bg-black/40 ${s.glow}`}>
                  <span className="text-xs text-slate-500 font-mono tracking-widest block">{s.label}</span>
                  <div className={`text-4xl font-extrabold font-mono ${s.color}`}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Event console terminal rules */}
            <div className="glass-card p-8 rounded-xl border border-white/5 space-y-6 bg-black/50">
              <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                <Terminal className="w-6 h-6 text-[#00ff88]" />
                <h2 className="text-xl font-bold tracking-wider font-mono text-white m-0">security_protocol_rules.log</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-sm text-[#8b9bb4]">
                <ul className="space-y-4 list-disc pl-5">
                  <li>Respect infrastructure limitations. No brute-forcing CTF system score platforms.</li>
                  <li>Flag share operations or key leakage between teams will trigger profile isolation.</li>
                  <li>Hints release timing can be configured dynamically by CTF administration agents.</li>
                </ul>
                <ul className="space-y-4 list-disc pl-5">
                  <li>First blood decrypts obtain +50 additional points added instantly.</li>
                  <li>Real-time calculations will adjust final team ranks as submissions execute.</li>
                  <li>In the event of a tie, the team executing the earlier submit captures the rank.</li>
                </ul>
              </div>
            </div>

          </div>
        )}

        {/* PAGE 2: USER DASHBOARD */}
        {activeTab === 'dashboard' && currentTeam && (
          <div className="space-y-8">
            
            {/* Dashboard Welcome panel */}
            <div className="glass-card p-8 rounded-2xl border-[#00cfff]/30 bg-[#00cfff]/[0.03] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-[0_0_30px_rgba(0,207,255,0.05)]">
              <div>
                <h2 className="text-3xl font-extrabold text-white font-mono tracking-wider flex items-center gap-3">
                  SYSTEM READY: <span className="text-[#00ff88] glow-green">{currentTeam.name}</span>
                </h2>
                <p className="text-xs text-[#8b9bb4] mt-2 font-mono tracking-widest">
                  TEAM TOKEN: {currentTeam.id} | RANKING STATIONS: #{sortedLeaderboard.findIndex(t => t.id === currentTeam.id) + 1} OF {allTeams.length}
                </p>
              </div>
              <div className="flex items-center space-x-8">
                <div className="text-right font-mono">
                  <span className="text-4xl font-black text-[#00cfff] block glow-blue">{currentTeam.points}</span>
                  <span className="text-[10px] text-slate-500 tracking-widest uppercase">Points Solved</span>
                </div>
                <div className="text-right font-mono border-l border-white/10 pl-8">
                  <span className="text-4xl font-black text-[#bd00ff] block glow-purple">
                    {Math.round((currentTeam.solvedChallenges.length / (challenges.length || 1)) * 100)}%
                  </span>
                  <span className="text-[10px] text-slate-500 tracking-widest uppercase">Completion Rate</span>
                </div>
              </div>
            </div>

            {/* Progress bar widget */}
            <div className="glass-card p-6 rounded-xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#00ff88]">SOLVED: {currentTeam.solvedChallenges.length} / {challenges.length} PACKS</span>
                <span className="text-slate-400">{Math.round((currentTeam.solvedChallenges.length / (challenges.length || 1)) * 100)}% COMPLETE</span>
              </div>
              <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-[#00ff88] via-[#00cfff] to-[#bd00ff] h-full rounded-full transition-all duration-700" 
                  style={{ width: `${(currentTeam.solvedChallenges.length / (challenges.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Quick Category shortcuts */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white font-mono tracking-wider flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#bd00ff]" />
                Explore Core Challenges
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'Linux', desc: 'Secure host configuration and privilege escalation sequences.', color: 'border-l-[#00ff88]' },
                  { name: 'Web Security', desc: 'Bypassing verification interfaces, SQL injection, and logic flaws.', color: 'border-l-[#00cfff]' },
                  { name: 'Cryptography', desc: 'Symmetric and asymmetric message decryption tasks.', color: 'border-l-[#bd00ff]' },
                  { name: 'Digital Forensics', desc: 'Analyzing packet streams, hex bytes, and corrupted headers.', color: 'border-l-pink-500' },
                  { name: 'Reverse Engineering', desc: 'Disassembling logic loops and XOR verification keys.', color: 'border-l-orange-500' },
                  { name: 'OSINT', desc: 'Investigating datasets using open source search scripts.', color: 'border-l-emerald-500' },
                  { name: 'Multi-Stage', desc: 'Stacked puzzle layers with multiple decoding and transformation stages.', color: 'border-l-yellow-500' }
                ].map((cat, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      playSound('click');
                      setSelectedCategory(cat.name);
                      setActiveTab('challenges');
                    }}
                    className={`glass-card p-6 rounded-xl border border-white/5 text-left border-l-4 ${cat.color} hover:bg-white/[0.02] hover:-translate-y-1 transition-all duration-300 group`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-mono font-bold text-white group-hover:text-[#00cfff] text-base">{cat.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition" />
                    </div>
                    <p className="text-xs text-[#8b9bb4] leading-relaxed">{cat.desc}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* PAGE 3: CHALLENGE MATRIX */}
        {activeTab === 'challenges' && (
          <div className="space-y-8">
            
            {/* Filter and Search system */}
            <div className="glass-card p-6 rounded-xl border border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-mono text-sm bg-black/40">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Query challenge index..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-[#00ff88] transition"
                />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-black border border-white/15 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#00ff88] transition"
                >
                  <option value="All">All Categories</option>
                  <option value="Linux">Linux</option>
                  <option value="Web Security">Web Security</option>
                  <option value="Cryptography">Cryptography</option>
                  <option value="OSINT">OSINT</option>
                  <option value="Digital Forensics">Digital Forensics</option>
                  <option value="Networking">Networking</option>
                  <option value="Misc">Misc</option>
                  <option value="Logic">Logic</option>
                  <option value="Security Awareness">Security Awareness</option>
                  <option value="Multi-Stage">Multi-Stage</option>
                  <option value="Reverse Engineering">Reverse Engineering</option>
                </select>

                <select 
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="bg-black border border-white/15 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#00ff88] transition"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy (100 pts)</option>
                  <option value="Medium">Medium (200 pts)</option>
                  <option value="Hard">Hard (300 pts)</option>
                  <option value="Expert">Expert (500 pts)</option>
                </select>
              </div>
            </div>

            {/* Challenge Cards Grid */}
            {filteredChallenges.length === 0 ? (
              <div className="glass-card p-16 rounded-xl text-center text-[#8b9bb4]">
                <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
                <p className="font-mono text-sm uppercase tracking-wider">No corresponding system modules found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredChallenges.map((c) => {
                  const isSolved = currentTeam?.solvedChallenges.includes(c.id);
                  const isIncorrect = incorrectFlags[c.id];
                  const hasHint = !!c.hint;
                  const isHintRevealed = revealedHints[c.id];

                  return (
                    <div 
                      key={c.id} 
                      className={`glass-card p-8 rounded-xl border border-white/5 flex flex-col justify-between space-y-6 relative overflow-hidden transition-all duration-300 bg-black/40 ${
                        isSolved ? 'border-[#00ff88]/30 bg-[#00ff88]/[0.01]' : ''
                      } ${isIncorrect ? 'error-shake-anim border-red-500 bg-red-500/[0.01]' : ''}`}
                    >
                      {/* Solved Overlay Badge */}
                      {isSolved && (
                        <div className="absolute top-4 right-4 text-[10px] border border-[#00ff88]/50 text-[#00ff88] bg-[#00ff88]/15 px-3 py-1 rounded-md font-mono uppercase tracking-widest font-extrabold">
                          Captured
                        </div>
                      )}

                      <div className="space-y-4">
                        {/* Meta Tags */}
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center gap-1.5 text-xs text-[#00cfff] font-mono border border-[#00cfff]/20 bg-[#00cfff]/5 px-2.5 py-1 rounded">
                            {getCategoryIcon(c.category)}
                            {c.category}
                          </span>
                          <span className={`text-[10px] font-mono px-2.5 py-1 border rounded uppercase ${getDifficultyColor(c.difficulty)}`}>
                            {c.difficulty}
                          </span>
                          <span className="text-xs text-[#bd00ff] font-mono font-bold">
                            {c.points} PTS
                          </span>
                        </div>

                        <h3 className="text-2xl font-extrabold text-white tracking-tight">{c.title}</h3>
                        <p className="text-sm text-[#8b9bb4] leading-relaxed">{c.description}</p>
                      </div>

                      {/* First Blood Award Box */}
                      {c.firstBloodTeam && (
                        <div className="border border-rose-500/20 bg-rose-500/[0.02] p-3 rounded-lg flex items-center gap-2.5 text-xs text-rose-400 font-mono">
                          <Award className="w-4 h-4 text-rose-500" />
                          <span>First Blood: <strong className="text-white">{c.firstBloodTeam}</strong> gets +50 pts!</span>
                        </div>
                      )}

                      {/* Download Attachments and hints */}
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center space-x-3">
                          {c.attachmentName && (
                            <button 
                              onClick={() => triggerToast(`Downloading sandbox artifact: ${c.attachmentName}`, 'info')}
                              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition font-mono"
                            >
                              <Download className="w-4 h-4 text-[#00cfff]" />
                              {c.attachmentName}
                            </button>
                          )}

                          {hasHint && (
                            <button 
                              onClick={() => handleUseHint(c.id)}
                              className={`text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition font-mono ml-auto border ${
                                isHintRevealed 
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                              }`}
                            >
                              {isHintRevealed ? 'Hide Hint' : `Reveal Hint (-${c.hintPenalty ?? 25} pts)`}
                            </button>
                          )}
                        </div>

                        {/* Expandable Hint Container with penalty warning */}
                        {hasHint && isHintRevealed && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] text-rose-400 font-mono bg-rose-500/5 border border-rose-500/20 px-3 py-1.5 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Hint penalty applied: -{c.hintPenalty ?? 25} points deducted from team score.</span>
                            </div>
                            <div className="glass-card p-4 rounded-lg border-amber-500/20 bg-amber-500/[0.03] text-xs text-amber-300 font-mono flex items-start gap-2.5">
                              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                              <span>{c.hint}</span>
                            </div>
                          </div>
                        )}

                        {/* Submission Inputs */}
                        {!isSolved ? (
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="flag{...}"
                              value={flagInputs[c.id] || ''}
                              onChange={(e) => setFlagInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                              className="flex-1 bg-black/60 border border-white/15 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00ff88] font-mono transition"
                            />
                            <button 
                              onClick={() => handleFlagSubmit(c.id)}
                              className="neon-button-green py-2.5 px-6 rounded-lg text-xs font-mono uppercase tracking-widest"
                            >
                              Deploy
                            </button>
                          </div>
                        ) : (
                          <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-lg p-3 text-center text-xs text-[#00ff88] font-mono tracking-widest uppercase">
                            FLAG SECURED AND REGISTERED BY TEAM
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* PAGE 4: SCOREBOARD LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-8">
            
            <div className="flex justify-between items-center font-mono">
              <div>
                <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-[#bd00ff] filter drop-shadow-[0_0_8px_#bd00ff]" />
                  Standings Scoreboard
                </h2>
                <p className="text-xs text-[#8b9bb4] tracking-widest mt-1 uppercase">Live synchronization logs active</p>
              </div>
              {isFrozen && (
                <div className="border border-[#ff0055]/30 bg-[#ff0055]/10 text-[#ff0055] px-4 py-2 rounded-lg text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>Leaderboard Frozen</span>
                </div>
              )}
            </div>

            {/* Scoreboard table */}
            <div className="glass-card rounded-xl overflow-hidden border-white/5 bg-black/40">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs text-[#8b9bb4] uppercase tracking-wider">
                    <th className="py-5 px-6 text-center w-24">Rank</th>
                    <th className="py-5 px-6">Team Agent</th>
                    <th className="py-5 px-6 text-center">Score</th>
                    <th className="py-5 px-6 text-center font-semibold">Captures</th>
                    <th className="py-5 px-6">Last Capture Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {sortedLeaderboard.map((team, index) => {
                    const isTopThree = index < 3;
                    const placeColors = [
                      'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30 shadow-[0_0_10px_rgba(0,255,136,0.15)]', 
                      'text-[#00cfff] bg-[#00cfff]/10 border-[#00cfff]/30 shadow-[0_0_10px_rgba(0,207,255,0.15)]', 
                      'text-amber-500 bg-amber-500/10 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                    ];

                    return (
                      <tr 
                        key={team.id} 
                        className={`hover:bg-white/[0.01] transition-colors ${
                          currentTeam?.id === team.id ? 'bg-[#00cfff]/[0.03]' : ''
                        }`}
                      >
                        <td className="py-5 px-6 text-center font-bold">
                          {isTopThree ? (
                            <span className={`inline-block border px-3 py-1 rounded text-xs ${placeColors[index]}`}>
                              #{index + 1}
                            </span>
                          ) : (
                            <span className="text-slate-400">#{index + 1}</span>
                          )}
                        </td>
                        <td className="py-5 px-6 font-bold text-white flex items-center gap-2">
                          {team.name}
                          {currentTeam?.id === team.id && (
                            <span className="text-[10px] bg-[#00cfff]/20 text-[#00cfff] border border-[#00cfff]/30 px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">YOU</span>
                          )}
                        </td>
                        <td className="py-5 px-6 text-center text-[#00ff88] font-extrabold text-base">{team.points}</td>
                        <td className="py-5 px-6 text-center text-white">{team.solvedChallenges.length}</td>
                        <td className="py-5 px-6 text-xs text-slate-500">
                          {team.lastSubmissionTime ? new Date(team.lastSubmissionTime).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* PAGE 5: PROFILE */}
        {activeTab === 'profile' && currentTeam && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Team details */}
            <div className="glass-card p-8 rounded-xl border border-white/5 space-y-6 lg:col-span-1 bg-black/40">
              <div className="text-center space-y-4 pb-6 border-b border-white/10">
                <div className="w-20 h-20 bg-[#00cfff]/15 border border-[#00cfff]/35 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,207,255,0.15)]">
                  <User className="w-10 h-10 text-[#00cfff]" />
                </div>
                <h3 className="text-3xl font-extrabold text-white font-mono tracking-wider">{currentTeam.name}</h3>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded font-mono font-bold tracking-widest uppercase">ACTIVE TEAM PASS</span>
              </div>

              <div className="space-y-4 font-mono text-sm">
                <div>
                  <span className="text-xs text-slate-500 block uppercase tracking-wider">Security Contact Email</span>
                  <span className="text-white font-semibold mt-1 block">{currentTeam.email}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase tracking-wider">Team Commander</span>
                  <span className="text-white font-semibold mt-1 block">{currentTeam.leader}</span>
                </div>
              </div>
            </div>

            {/* Badges and decrypt details */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Profile Achievements Badges */}
              <div className="glass-card p-8 rounded-xl border border-white/5 space-y-6 bg-black/40">
                <h3 className="text-xl font-bold text-white font-mono tracking-wider flex items-center gap-2">
                  <Award className="w-6 h-6 text-amber-500" />
                  Unlocked Achievements
                </h3>
                {currentTeam.badges.length === 0 ? (
                  <p className="text-sm font-mono text-slate-500 leading-relaxed">Capture platform flags to generate network achievements badges.</p>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {currentTeam.badges.map((b, idx) => (
                      <span 
                        key={idx} 
                        className="bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 px-4 py-2.5 rounded-lg text-xs font-mono font-extrabold flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Decrypted logs history */}
              <div className="glass-card p-8 rounded-xl border border-white/5 space-y-6 bg-black/40">
                <h3 className="text-xl font-bold text-white font-mono tracking-wider">Decryption Audit Timeline</h3>
                <div className="space-y-4 font-mono text-xs">
                  {submissions.filter(s => s.teamId === currentTeam.id).length === 0 ? (
                    <p className="text-slate-500">No flags decrypted yet.</p>
                  ) : (
                    submissions
                      .filter(s => s.teamId === currentTeam.id)
                      .map((sub, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-white/[0.01] border border-white/10 rounded-lg hover:border-white/20 transition">
                          <div>
                            <span className="text-[#00ff88] font-bold block text-sm">{sub.challengeTitle}</span>
                            <span className="text-slate-500 block mt-1">{new Date(sub.submittedAt).toLocaleString()}</span>
                          </div>
                          <span className="text-[#00cfff] font-bold text-sm">+{sub.points} PTS</span>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* PAGE 6: ADMIN PANEL */}
        {activeTab === 'admin' && !isAdminAuthenticated && (
          <div className="max-w-md mx-auto glass-card p-8 rounded-xl border-[#bd00ff]/30 bg-black/80 space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <Sliders className="w-12 h-12 text-[#bd00ff] mx-auto filter drop-shadow-[0_0_8px_#bd00ff]" />
              <h2 className="text-xl font-bold text-white font-mono uppercase tracking-widest">Admin Authorization</h2>
              <p className="text-xs text-slate-500 font-mono">Sign in to initialize administrator actions.</p>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (adminAuthInput.email === 'sreegs875@gmail.com' && adminAuthInput.password === '1234') {
                  setIsAdminAuthenticated(true);
                  triggerToast('Admin authorization verified successfully.', 'success');
                  playSound('success');
                } else {
                  triggerToast('Access Denied: Invalid administrator keys.', 'error');
                  playSound('error');
                }
              }}
              className="space-y-4 font-mono text-sm"
            >
              <div>
                <label className="text-xs text-slate-400 block mb-2">EMAIL</label>
                <input 
                  type="email" 
                  required
                  value={adminAuthInput.email}
                  onChange={(e) => setAdminAuthInput(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff]"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-2">PASSKEY</label>
                <input 
                  type="password" 
                  required
                  value={adminAuthInput.password}
                  onChange={(e) => setAdminAuthInput(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff]"
                />
              </div>
              <button 
                type="submit" 
                className="w-full neon-button-purple py-3 rounded-lg text-xs font-mono tracking-widest uppercase"
              >
                Authenticate Control
              </button>
            </form>
          </div>
        )}

        {activeTab === 'admin' && isAdminAuthenticated && (
          <div className="space-y-8">
            
            {/* Control Bar */}
            <div className="glass-card p-6 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-4 font-mono text-sm bg-black/40">
              <div className="flex items-center space-x-3">
                <Sliders className="w-5 h-5 text-[#bd00ff]" />
                <h2 className="text-xl font-bold text-white m-0">Admin Controller</h2>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleToggleFreeze}
                  className={`px-5 py-2.5 rounded-lg border text-xs font-mono tracking-widest ${
                    isFrozen 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500 font-bold' 
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  } transition`}
                >
                  {isFrozen ? 'UNFREEZE STANDINGS' : 'FREEZE STANDINGS'}
                </button>
                <button 
                  onClick={() => {
                    playSound('click');
                    setEditingChallenge({
                      id: 'ch-' + Math.random().toString(36).substr(2, 9),
                      title: '',
                      category: 'Linux',
                      difficulty: 'Easy',
                      points: 100,
                      description: '',
                      flag: '',
                      hint: '',
                      hintReleased: false
                    });
                    setShowAddForm(true);
                  }}
                  className="neon-button-purple text-xs py-2.5 px-5 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  CREATE CHALLENGE
                </button>
              </div>
            </div>

            {/* Editing / Adding panel */}
            {showAddForm && editingChallenge && (
              <form onSubmit={handleSaveChallenge} className="glass-card p-8 rounded-xl border-[#bd00ff]/30 bg-[#bd00ff]/[0.02] space-y-6">
                <h3 className="text-lg font-bold text-white font-mono tracking-wider border-b border-white/10 pb-2">CREATE/CONFIGURE SYSTEM CHALLENGE</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs text-[#8b9bb4] font-mono block mb-2 uppercase tracking-wider">Challenge Title</label>
                    <input 
                      type="text" 
                      required
                      value={editingChallenge.title || ''}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8b9bb4] font-mono block mb-2 uppercase tracking-wider">Category</label>
                    <select 
                      value={editingChallenge.category || 'Linux'}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev, category: e.target.value as ChallengeCategory }))}
                      className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff] font-mono"
                    >
                      <option value="Linux">Linux</option>
                      <option value="Web Security">Web Security</option>
                      <option value="Cryptography">Cryptography</option>
                      <option value="OSINT">OSINT</option>
                      <option value="Digital Forensics">Digital Forensics</option>
                      <option value="Networking">Networking</option>
                      <option value="Reverse Engineering">Reverse Engineering</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#8b9bb4] font-mono block mb-2 uppercase tracking-wider">Difficulty</label>
                    <select 
                      value={editingChallenge.difficulty || 'Easy'}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev, difficulty: e.target.value as ChallengeDifficulty, points: e.target.value === 'Easy' ? 100 : e.target.value === 'Medium' ? 200 : e.target.value === 'Hard' ? 300 : 500 }))}
                      className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff] font-mono"
                    >
                      <option value="Easy">Easy (100)</option>
                      <option value="Medium">Medium (200)</option>
                      <option value="Hard">Hard (300)</option>
                      <option value="Expert">Expert (500)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#8b9bb4] font-mono block mb-2 uppercase tracking-wider">Challenge Description</label>
                  <textarea 
                    value={editingChallenge.description || ''}
                    rows={3}
                    onChange={(e) => setEditingChallenge(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff] font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs text-[#8b9bb4] font-mono block mb-2 uppercase tracking-wider">Attachment File Name</label>
                    <input 
                      type="text" 
                      value={editingChallenge.attachmentName || ''}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev, attachmentName: e.target.value }))}
                      className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8b9bb4] font-mono block mb-2 uppercase tracking-wider">Flag Sequence Code</label>
                    <input 
                      type="text" 
                      required
                      placeholder="flag{...}"
                      value={editingChallenge.flag || ''}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev, flag: e.target.value }))}
                      className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8b9bb4] font-mono block mb-2 uppercase tracking-wider">Hint Text</label>
                    <input 
                      type="text" 
                      value={editingChallenge.hint || ''}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev, hint: e.target.value }))}
                      className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-[#8b9bb4] font-mono block mb-2 uppercase tracking-wider">Hint Penalty (Points Deducted)</label>
                    <input 
                      type="number" 
                      min={0}
                      value={editingChallenge.hintPenalty ?? 25}
                      onChange={(e) => setEditingChallenge(prev => ({ ...prev, hintPenalty: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#bd00ff] font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-[10px] text-slate-500 font-mono">💡 Points to deduct when a team clicks &quot;Reveal Hint&quot;. Set to 0 for free hints.</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#bd00ff] font-mono block mb-2 uppercase tracking-wider">🔐 Step-by-Step Solution (Admin Only — Never shown to players)</label>
                  <textarea 
                    value={editingChallenge.solution || ''}
                    rows={5}
                    placeholder="Enter detailed step-by-step solution here..."
                    onChange={(e) => setEditingChallenge(prev => ({ ...prev, solution: e.target.value }))}
                    className="w-full bg-black border border-[#bd00ff]/30 rounded-lg p-3 text-green-300 focus:outline-none focus:border-[#bd00ff] font-mono text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)}
                    className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-lg text-white font-mono text-xs hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="neon-button-purple py-2.5 px-6 rounded-lg text-xs font-mono"
                  >
                    Commit Build
                  </button>
                </div>
              </form>
            )}

            {/* List challenges CRUD */}
            <div className="glass-card rounded-xl overflow-hidden border-white/5 bg-black/40">
              <div className="p-4 border-b border-white/10 bg-white/[0.02]">
                <h3 className="text-sm font-bold text-white font-mono tracking-wider">Manage Platform Modules</h3>
              </div>
              <div className="divide-y divide-white/5 font-mono text-xs">
              {challenges.map((c) => {
                return (
                  <div key={c.id} className="p-4 hover:bg-white/[0.01] border-b border-white/5 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[#00ff88] font-bold text-sm">{c.title}</span>
                        <div className="flex gap-3 text-[10px] text-slate-500 uppercase">
                          <span>{c.category}</span>
                          <span>•</span>
                          <span>{c.difficulty}</span>
                          <span>•</span>
                          <span>{c.points} pts</span>
                          <span>•</span>
                          <span className="text-amber-500">Hint penalty: -{c.hintPenalty ?? 25} pts</span>
                          <span>•</span>
                          <span className="text-rose-400 font-mono">Flag: {c.flag}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          onClick={() => {
                            setAdminSolutionOpen(prev => ({ ...prev, [c.id]: !prev[c.id] }));
                          }}
                          className="bg-[#bd00ff]/10 border border-[#bd00ff]/30 text-[#bd00ff] px-3 py-1.5 rounded text-[10px] font-mono hover:bg-[#bd00ff]/20 transition"
                        >
                          {adminSolutionOpen[c.id] ? 'Hide Answer' : 'View Answer'}
                        </button>
                        <button 
                          onClick={() => {
                            setEditingChallenge(c);
                            setShowAddForm(true);
                            playSound('click');
                          }}
                          className="bg-white/5 border border-white/10 text-white px-3 py-1.5 rounded hover:border-[#bd00ff] transition text-[10px]"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteChallenge(c.id)}
                          className="bg-white/5 border border-white/15 text-red-400 px-3 py-1.5 rounded hover:border-red-500 transition text-[10px]"
                        >
                          Purge
                        </button>
                      </div>
                    </div>
                    {/* Solution Accordion */}
                    {adminSolutionOpen[c.id] && c.solution && (
                      <div className="mt-4 bg-[#bd00ff]/[0.03] border border-[#bd00ff]/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="w-3 h-3 text-[#bd00ff]" />
                          <span className="text-[10px] text-[#bd00ff] font-mono uppercase tracking-widest font-bold">Admin Solution — Confidential</span>
                        </div>
                        <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap leading-relaxed">{c.solution}</pre>
                      </div>
                    )}
                    {adminSolutionOpen[c.id] && !c.solution && (
                      <div className="mt-3 text-xs text-slate-500 font-mono italic">No solution added for this challenge. Edit to add one.</div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>

            {/* real-time submission logs */}
            <div className="glass-card rounded-xl overflow-hidden border-white/5 bg-black/40">
              <div className="p-4 border-b border-white/10 bg-white/[0.02]">
                <h3 className="text-sm font-bold text-white font-mono tracking-wider">Security Operations Center - Real-time Logs</h3>
              </div>
              <div className="p-6 space-y-3 max-h-80 overflow-y-auto font-mono text-xs">
                {submissions.length === 0 ? (
                  <p className="text-slate-500">No submission logs logged yet.</p>
                ) : (
                  [...submissions].reverse().map((sub, idx) => (
                    <div key={idx} className="flex justify-between items-center border-l-2 border-[#00ff88] bg-white/[0.01] p-4 rounded-r-lg hover:bg-white/[0.02] transition">
                      <span className="text-slate-400">
                        [{new Date(sub.submittedAt).toLocaleTimeString()}] Team <strong className="text-white">{sub.teamName}</strong> decrypted <strong className="text-[#00cfff]">{sub.challengeTitle}</strong> (+{sub.points} pts)
                        {sub.hintUsed && <span className="ml-2 text-amber-400 text-[9px] border border-amber-400/30 px-1.5 py-0.5 rounded">HINT USED</span>}
                      </span>
                      {sub.isFirstBlood && (
                        <span className="text-rose-400 text-[10px] font-bold border border-rose-400/30 px-2 py-0.5 rounded">FIRST BLOOD</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* LOGIN/REGISTER MODALS */}
      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full border-[#00ff88]/30 bg-[#0a0a0f] p-8 space-y-6 rounded-2xl shadow-[0_0_50px_rgba(0,255,136,0.1)]">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white font-mono uppercase tracking-widest">
                {authMode === 'login' ? 'Authentication Gate' : 'Establish Team'}
              </h3>
              <button 
                onClick={() => setAuthMode(null)}
                className="text-slate-500 hover:text-white font-mono text-sm"
              >
                [CLOSE]
              </button>
            </div>

            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4 font-mono text-sm">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-xs text-[#8b9bb4] block mb-2 uppercase tracking-wider">Team Name</label>
                    <input 
                      type="text" 
                      required
                      value={authForm.teamName}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, teamName: e.target.value }))}
                      className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#00ff88] transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8b9bb4] block mb-2 uppercase tracking-wider">Team Commander (Leader)</label>
                    <input 
                      type="text" 
                      required
                      value={authForm.teamLeader}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, teamLeader: e.target.value }))}
                      className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#00ff88] transition"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-[#8b9bb4] block mb-2 uppercase tracking-wider">Security Email</label>
                <input 
                  type="email" 
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#00ff88] transition"
                />
              </div>

              <div>
                <label className="text-xs text-[#8b9bb4] block mb-2 uppercase tracking-wider">Passkey Token</label>
                <input 
                  type="password" 
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:border-[#00ff88] transition"
                />
              </div>

              <button 
                type="submit" 
                className="w-full neon-button-green py-3 rounded-lg text-sm font-mono tracking-widest uppercase mt-4"
              >
                {authMode === 'login' ? 'DECIPHER & CONNECT' : 'INITIATE REGISTRATION'}
              </button>
            </form>

            <div className="text-center pt-2">
              {authMode === 'login' ? (
                <button 
                  onClick={() => setAuthMode('register')} 
                  className="text-xs text-[#00cfff] hover:underline font-mono"
                >
                  Register a new CTF team profile
                </button>
              ) : (
                <button 
                  onClick={() => setAuthMode('login')} 
                  className="text-xs text-[#00cfff] hover:underline font-mono"
                >
                  Already registered? Connect session gate
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* CONFIGURATION SETUP MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full border-[#00cfff]/30 bg-[#0a0a0f] p-8 space-y-6 rounded-2xl">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-4 font-mono">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-[#00cfff]" />
                DATABASE INTEGRATION CONTROLLER
              </h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-slate-500 hover:text-white"
              >
                [CLOSE]
              </button>
            </div>

            <p className="text-xs font-mono text-[#8b9bb4] leading-relaxed">
              By default, this web application stores challenge creations, user teams, and logs inside **localStorage** for instant testing and sandbox demonstration.
              To deploy for production, enter your **Firebase Web Credentials** below:
            </p>

            <form onSubmit={handleSaveFirebaseConfig} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-2 uppercase tracking-wider">API Key</label>
                  <input 
                    type="text" 
                    value={firebaseConfigInput.apiKey}
                    onChange={(e) => setFirebaseConfigInput(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full bg-black border border-white/15 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00cfff]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-2 uppercase tracking-wider">Auth Domain</label>
                  <input 
                    type="text" 
                    value={firebaseConfigInput.authDomain}
                    onChange={(e) => setFirebaseConfigInput(prev => ({ ...prev, authDomain: e.target.value }))}
                    className="w-full bg-black border border-white/15 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00cfff]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-2 uppercase tracking-wider">Project ID</label>
                  <input 
                    type="text" 
                    value={firebaseConfigInput.projectId}
                    onChange={(e) => setFirebaseConfigInput(prev => ({ ...prev, projectId: e.target.value }))}
                    className="w-full bg-black border border-white/15 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00cfff]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-2 uppercase tracking-wider">Storage Bucket</label>
                  <input 
                    type="text" 
                    value={firebaseConfigInput.storageBucket}
                    onChange={(e) => setFirebaseConfigInput(prev => ({ ...prev, storageBucket: e.target.value }))}
                    className="w-full bg-black border border-white/15 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00cfff]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-2 uppercase tracking-wider">Messaging Sender ID</label>
                  <input 
                    type="text" 
                    value={firebaseConfigInput.messagingSenderId}
                    onChange={(e) => setFirebaseConfigInput(prev => ({ ...prev, messagingSenderId: e.target.value }))}
                    className="w-full bg-black border border-white/15 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00cfff]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-2 uppercase tracking-wider">App ID</label>
                  <input 
                    type="text" 
                    value={firebaseConfigInput.appId}
                    onChange={(e) => setFirebaseConfigInput(prev => ({ ...prev, appId: e.target.value }))}
                    className="w-full bg-black border border-white/15 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00cfff]"
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-between pt-4">
                <button 
                  type="button" 
                  onClick={handleClearFirebaseConfig}
                  className="bg-red-500/10 border border-red-500/30 text-[#ff0055] px-5 py-2.5 rounded-lg font-bold font-mono tracking-widest uppercase hover:bg-red-500/20 transition"
                >
                  Clear Config
                </button>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowConfigModal(false)}
                    className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-lg text-white hover:bg-white/10 transition"
                  >
                    Keep Sandbox
                  </button>
                  <button 
                    type="submit" 
                    className="neon-button-purple text-xs py-2.5 px-6 rounded-lg font-mono tracking-widest uppercase"
                  >
                    Deploy & Connect
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
