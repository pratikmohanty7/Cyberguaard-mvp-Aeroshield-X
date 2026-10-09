import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Play, 
  CheckCircle, 
  Bot, 
  Activity, 
  Search, 
  AlertTriangle, 
  Layers, 
  Key, 
  BarChart3,
  Menu,
  X,
  Radio,
  Share2
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSimulateCampaign: () => void;
  onSimulateSafeNotice: () => void;
  onOpenCopilot: () => void;
  isSimulating?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSimulateCampaign,
  onSimulateSafeNotice,
  onOpenCopilot,
  isSimulating = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'dashboard', label: 'Command Center', icon: <Activity className="w-4 h-4" /> },
    { id: 'topology', label: 'Trust Topology', icon: <Share2 className="w-4 h-4 text-sky-400" /> },
    { id: 'analyze', label: 'Threat Analyzer', icon: <Search className="w-4 h-4" /> },
    { id: 'deepfake', label: 'Deepfake Lab', icon: <Radio className="w-4 h-4 text-sky-400" /> },
    { id: 'incidents', label: 'Incidents', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'events', label: 'Raw Events', icon: <Layers className="w-4 h-4" /> },
    { id: 'registry', label: 'Trust Panel', icon: <Key className="w-4 h-4 text-amber-400" /> },
    { id: 'evaluation', label: 'Benchmark', icon: <BarChart3 className="w-4 h-4" /> }
  ];

  const handleMobileNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Header Bar (iOS Frosted Glass Navigation) */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#08090D]/80 backdrop-blur-2xl px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Zone 1: Brand Wordmark (Single Text Element with Institutional Insignia) */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl min-h-[44px] group ios-pressable"
            >
              <div className="w-8 h-8 rounded-xl bg-white text-[#08090D] flex items-center justify-center font-bold transition-transform group-hover:scale-105 shadow-md">
                <ShieldCheck className="w-4 h-4 text-[#08090D]" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white font-sans leading-none">
                  CYBERGUARD
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">
                  PMEC BERHAMPUR · SOC
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (iOS Floating Segmented Pill Dock) */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-[#101422]/70 backdrop-blur-xl rounded-full border border-white/[0.08] shadow-inner text-[12px] font-sans">
            {navLinks.map(link => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`px-3 py-1 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 ios-pressable ${
                    isActive 
                      ? 'bg-white text-black font-semibold shadow-[0_2px_10px_rgba(255,255,255,0.25)]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action Controls (iOS Squircle Controls) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Safe Notice Demo Button */}
            <button
              onClick={onSimulateSafeNotice}
              disabled={isSimulating}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-sans rounded-xl border border-white/10 bg-[#121624]/80 text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 min-h-[38px] ios-pressable"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe Baseline</span>
            </button>

            {/* Copilot Trigger */}
            <button
              onClick={onOpenCopilot}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium font-sans rounded-xl border border-white/10 bg-[#121624]/80 text-slate-200 hover:bg-white/10 hover:text-white transition-all min-h-[38px] ios-pressable"
              title="Evidence-grounded SOC Copilot"
            >
              <Bot className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Copilot</span>
            </button>

            {/* Simulate Attack Campaign Button */}
            <button
              onClick={onSimulateCampaign}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold font-sans rounded-xl bg-white text-[#08090D] hover:bg-slate-200 transition-all disabled:opacity-50 whitespace-nowrap min-h-[38px] ios-pressable shadow-md"
            >
              <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : 'fill-current'}`} />
              <span className="hidden sm:inline">{isSimulating ? 'Simulating...' : 'Simulate Campaign'}</span>
              <span className="sm:hidden">{isSimulating ? 'Sim...' : 'Simulate'}</span>
            </button>

            {/* Mobile Drawer Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors ios-pressable"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-white" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (iOS Floating Action Drawer / Half Sheet) */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 p-4 bg-[#0D1222]/95 backdrop-blur-3xl border border-white/15 rounded-3xl space-y-3 font-sans animate-in fade-in slide-in-from-top-3 shadow-2xl">
            <div className="ios-grabber" />
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="text-xs font-semibold text-white tracking-tight">SOC Quick Actions & Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onSimulateSafeNotice();
                  setMobileMenuOpen(false);
                }}
                disabled={isSimulating}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-xs font-medium min-h-[44px] ios-pressable"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Safe Notice Demo</span>
              </button>

              <button
                onClick={() => {
                  onOpenCopilot();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-sky-500/30 bg-sky-950/30 text-sky-300 text-xs font-medium min-h-[44px] ios-pressable"
              >
                <Bot className="w-3.5 h-3.5 text-sky-400" />
                <span>Open Copilot</span>
              </button>
            </div>

            <div className="space-y-1 pt-1">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => handleMobileNavClick(link.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors min-h-[42px] ios-pressable ${
                    activeTab === link.id
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={activeTab === link.id ? 'text-black' : 'text-slate-400'}>{link.icon}</span>
                    <span>{link.label}</span>
                  </div>
                  {activeTab === link.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Fixed Bottom Floating Tab Bar for Smartphone & Mobile Viewports (iPhone Floating Glass Dock) */}
      <nav className="fixed bottom-3 left-3 right-3 z-40 lg:hidden max-w-lg mx-auto bg-[#0A0D18]/85 backdrop-blur-3xl border border-white/15 rounded-[26px] px-2 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.85)] pb-safe">
        <div className="grid grid-cols-5 items-center h-14 font-sans">
          {[
            { id: 'dashboard', label: 'Command', icon: <Activity className="w-5 h-5" /> },
            { id: 'topology', label: 'Topology', icon: <Share2 className="w-5 h-5" /> },
            { id: 'analyze', label: 'Analyze', icon: <Search className="w-5 h-5" /> },
            { id: 'incidents', label: 'Incidents', icon: <AlertTriangle className="w-5 h-5" /> },
            { id: 'registry', label: 'Trust Panel', icon: <Key className="w-5 h-5" /> }
          ].map(tab => {
            const isActive = activeTab === tab.id || (tab.id === 'incidents' && activeTab === 'incident_detail');
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(10); } catch (e) {}
                  }
                  setActiveTab(tab.id);
                }}
                className={`flex flex-col items-center justify-center h-full rounded-2xl transition-all select-none relative ios-pressable ${
                  isActive 
                    ? 'text-white font-semibold bg-white/10 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5 text-white' : 'text-slate-400'}`}>
                  {tab.icon}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 font-sans">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-white mt-0.5 shadow-[0_0_6px_#ffffff]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
