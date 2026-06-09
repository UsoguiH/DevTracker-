import React, { useState } from 'react';
import { X, UserPlus, Loader2, AtSign } from 'lucide-react';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (handle: string) => Promise<void>;
    projectName: string;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onSubmit, projectName }) => {
    const [handle, setHandle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!handle.trim()) return;
        setIsLoading(true);
        setError('');
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface-card border border-hairline w-full max-w-md rounded-xl shadow-sm overflow-hidden animate-pop-in">
                <div className="p-6 border-b border-hairline flex justify-between items-center bg-canvas-soft">
                    <h3 className="display text-lg text-ink flex items-center gap-2">
                        <UserPlus size={20} className="text-primary" />
                        Invite to Project
                    </h3>
                    <button onClick={onClose} className="text-muted hover:text-ink transition-colors p-1 hover:bg-canvas-soft rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-body text-sm mb-6">
                        Add a team member to <span className="text-ink font-semibold">{projectName}</span>. They will be able to view and edit all tasks.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">User Handle</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><AtSign size={16} /></div>
                                <input type="text" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="username"
                                    className="w-full bg-surface-card border border-hairline-strong rounded-md pl-10 pr-4 py-3 text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all" autoFocus />
                            </div>
                            {error && (
                                <p className="text-error text-xs mt-2 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-error rounded-full inline-block" />
                                    {error}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} disabled={isLoading}
                                className="flex-1 py-3 text-body font-medium hover:bg-canvas-soft border border-hairline-strong rounded-md transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={isLoading || !handle.trim()}
                                className="flex-1 py-3 bg-primary text-on-primary font-medium rounded-md hover:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                                {isLoading ? (<><Loader2 size={18} className="animate-spin" /> Checking...</>) : 'Invite Member'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;
