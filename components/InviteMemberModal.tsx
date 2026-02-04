import React, { useState } from 'react';
import { X, UserPlus, Loader2, AtSign } from 'lucide-react';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (handle: string) => Promise<void>;
    projectName: string;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    projectName
}) => {
    const [handle, setHandle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!handle.trim()) return;

        setIsLoading(true);
        setError('');

        // Remove @ if user included it
        const cleanHandle = handle.trim().startsWith('@') ? handle.trim().substring(1) : handle.trim();

        try {
            await onSubmit(cleanHandle);
            setHandle('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to invite user');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-pop-in">
                <div className="p-6 border-b border-border flex justify-between items-center bg-surface-highlight/30">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserPlus size={20} className="text-primary" />
                        Invite to Project
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-gray-400 text-sm mb-6">
                        Add a team member to <span className="text-white font-bold">{projectName}</span>.
                        They will be able to view and edit all tasks.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                                User Handle
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                    <AtSign size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={handle}
                                    onChange={(e) => setHandle(e.target.value)}
                                    placeholder="username"
                                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <p className="text-red-400 text-xs mt-2 flex items-center gap-1 animate-in slide-in-from-top-1">
                                    <span className="w-1 h-1 bg-red-400 rounded-full inline-block" />
                                    {error}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 text-gray-400 font-bold hover:bg-white/5 rounded-xl transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !handle.trim()}
                                className="flex-1 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    'Invite Member'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;
