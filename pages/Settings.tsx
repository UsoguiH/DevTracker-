import React, { useState, useEffect } from 'react';
import { Save, Trash2, Bell, Shield, Smartphone, Mail, User as UserIcon, LogOut } from 'lucide-react';
import { User } from '../types';

interface SettingsProps {
    user: User;
    onUpdateUser: (updatedUser: User) => void;
    onClearData: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser, onClearData }) => {
    const [formData, setFormData] = useState<User>(user);
    const [isDirty, setIsDirty] = useState(false);
    const [showSaved, setShowSaved] = useState(false);

    // Sync local state if prop changes
    useEffect(() => {
        setFormData(user);
    }, [user]);

    const handleChange = (field: keyof User, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setShowSaved(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateUser(formData);
        setIsDirty(false);
        setShowSaved(true);
        
        // Hide "Saved" message after 3 seconds
        setTimeout(() => setShowSaved(false), 3000);
    };

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <h1 className="text-3xl font-bold text-white mb-2 animate-slide-up">Settings</h1>
            <p className="text-gray-400 mb-8 animate-slide-up delay-100">Manage your profile and application preferences.</p>

            <div className="grid gap-8">
                {/* Profile Section */}
                <div className="bg-surface border border-border rounded-3xl p-8 shadow-lg animate-slide-up delay-100">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                        <div className="p-3 bg-surface-highlight rounded-xl text-primary">
                            <UserIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Profile Information</h2>
                            <p className="text-sm text-gray-400">Update your public profile details.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar Preview */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <img 
                                        src={formData.avatar} 
                                        alt="Avatar" 
                                        className="w-32 h-32 rounded-full border-4 border-surface-highlight object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-not-allowed">
                                        <span className="text-xs font-bold text-white">Preview Only</span>
                                    </div>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="flex-1 w-full space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Display Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                                            placeholder="Your Name"
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Handle</label>
                                        <input
                                            type="text"
                                            value={formData.handle}
                                            onChange={(e) => handleChange('handle', e.target.value)}
                                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                                            placeholder="@handle"
                                        />
                                    </div>
                                </div>
                                
                                <div className="group">
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Avatar URL</label>
                                    <input
                                        type="text"
                                        value={formData.avatar}
                                        onChange={(e) => handleChange('avatar', e.target.value)}
                                        className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 font-mono text-xs text-gray-300"
                                        placeholder="https://..."
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Paste a direct image link. Support for uploads coming soon.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-border">
                            <button 
                                type="submit" 
                                disabled={!isDirty}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300
                                    ${isDirty 
                                        ? 'bg-primary text-black hover:scale-105 shadow-[0_0_15px_rgba(209,244,95,0.3)]' 
                                        : 'bg-surface-highlight text-gray-500 cursor-not-allowed'}`}
                            >
                                <Save size={18} />
                                {showSaved ? 'Saved!' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Notifications & Preferences Mockup */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-surface border border-border rounded-3xl p-8 shadow-lg animate-slide-up delay-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-surface-highlight rounded-xl text-secondary">
                                <Bell size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-white">Notifications</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-background/30 rounded-xl border border-border/50">
                                <div className="flex items-center gap-3">
                                    <Mail size={18} className="text-gray-400" />
                                    <span className="text-sm font-medium text-gray-200">Email Alerts</span>
                                </div>
                                <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer opacity-80 hover:opacity-100">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full shadow-sm"></div>
                                </div>
                            </div>
                             <div className="flex items-center justify-between p-4 bg-background/30 rounded-xl border border-border/50">
                                <div className="flex items-center gap-3">
                                    <Smartphone size={18} className="text-gray-400" />
                                    <span className="text-sm font-medium text-gray-200">Push Notifications</span>
                                </div>
                                <div className="w-10 h-6 bg-surface-highlight rounded-full relative cursor-pointer border border-border hover:border-gray-500">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-gray-500 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                     </div>

                     <div className="bg-surface border border-border rounded-3xl p-8 shadow-lg animate-slide-up delay-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-surface-highlight rounded-xl text-white">
                                <Shield size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-white">Privacy</h2>
                        </div>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                            Your data is stored locally in your browser's LocalStorage. We do not transmit your tasks or project data to any external server.
                        </p>
                        <div className="flex items-center gap-2 text-xs font-mono text-primary bg-primary/10 p-3 rounded-lg border border-primary/20">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            Local Storage: Connected
                        </div>
                     </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-[#1a0505] border border-red-900/50 rounded-3xl p-8 shadow-lg animate-slide-up delay-400">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-red-900/20 rounded-xl text-red-500">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-red-500">Danger Zone</h2>
                            <p className="text-sm text-red-400/70">Irreversible actions regarding your data.</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-red-950/10 border border-red-900/30 rounded-2xl">
                        <div>
                            <h3 className="font-bold text-white mb-1">Delete all application data</h3>
                            <p className="text-sm text-gray-400">This will remove all projects, tasks, and reset your profile settings.</p>
                        </div>
                        <button 
                            onClick={() => {
                                if(window.confirm("Are you absolutely sure? This will wipe all your projects and tasks.")) {
                                    onClearData();
                                }
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all hover:scale-105 shadow-lg shadow-red-900/20 whitespace-nowrap"
                        >
                            <LogOut size={18} />
                            Reset App Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;