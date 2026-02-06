import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User as UserIcon, Sparkles, Check, Play } from 'lucide-react';
import { AIMessage, AIAction, Task } from '../types';
import { processUserMessage } from '../lib/aiService';

interface AIAssistantDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onAIAction: (action: AIAction) => void;
    currentTasks: Task[];
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose, onAIAction, currentTasks }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<AIMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello. I'm capable of analyzing your workload and organizing your board. How can I help?",
            timestamp: new Date().toISOString()
        }
    ]);
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isThinking) return;

        const userMsg: AIMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            const action = await processUserMessage(userMsg.content, currentTasks);

            const assistantMsg: AIMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: action.summary || "I've prepared that for you.",
                timestamp: new Date().toISOString()
            };

            // INTERCEPT logic: If it creates tasks, require approval
            if (action.intent === 'CREATE_TASKS') {
                assistantMsg.pendingAction = action;
                assistantMsg.content = action.summary || "I've drafted some tasks for you. Shall I proceed?";
            }
            // Insights & View Filters run immediately
            else if (action.intent !== 'NONE') {
                onAIAction(action);
            }

            setMessages(prev => [...prev, assistantMsg]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "I encountered an error. Please try again.",
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleAcceptAction = (msgId: string, action: AIAction) => {
        onAIAction(action);
        setMessages(prev => prev.map(m => {
            if (m.id === msgId) {
                return { ...m, pendingAction: undefined, content: "Running action..." };
            }
            return m;
        }));
        // Optional: Add simple confirmation message after
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Done.",
                timestamp: new Date().toISOString()
            }]);
        }, 500);
    };

    const handleDenyAction = (msgId: string) => {
        setMessages(prev => prev.map(m => {
            if (m.id === msgId) {
                return { ...m, pendingAction: undefined, content: "Cancelled." };
            }
            return m;
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-[420px] h-full bg-zinc-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out font-sans"
                onClick={e => e.stopPropagation()}
            >
                {/* Header - Transparent & Sleek */}
                <div className="p-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-900/80 backdrop-blur-xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-blue-500 to-violet-600 rounded-full shadow-lg shadow-violet-500/20">
                            <Sparkles size={18} className="text-white fill-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-medium text-lg leading-tight tracking-tight">Intelligence</h2>
                            <p className="text-xs text-zinc-400 font-medium">DevTracker AI</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            {/* Message Bubble */}
                            <div className={`
                                max-w-[85%] p-4 rounded-3xl text-[15px] leading-relaxed relative shadow-md
                                ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                    : 'bg-[#1C1C1E] text-zinc-200 rounded-bl-sm border border-white/5'}
                            `}>
                                {msg.content}

                                {/* Approval Card */}
                                {msg.pendingAction && (
                                    <div className="mt-4 bg-black/40 rounded-xl p-3 border border-white/5">
                                        <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wider font-semibold">Proposed Action</div>
                                        <div className="text-sm text-white font-medium mb-3">
                                            Create {msg.pendingAction.payload?.tasks?.length || 1} new tasks?
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAcceptAction(msg.id, msg.pendingAction!)}
                                                className="flex-1 py-2 bg-white text-black rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Play size={12} className="fill-current" /> Accept
                                            </button>
                                            <button
                                                onClick={() => handleDenyAction(msg.id)}
                                                className="flex-1 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                                            >
                                                Deny
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Timestamp / Status */}
                            <span className="text-[10px] text-zinc-600 px-1 font-medium">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}

                    {isThinking && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                                <Sparkles size={14} className="text-white fill-white animate-pulse" />
                            </div>
                            <div className="bg-[#1C1C1E] px-5 py-4 rounded-3xl rounded-bl-sm border border-white/5 flex items-center gap-1.5 shadow-md">
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-[bounce_1.4s_infinite]" />
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-[bounce_1.4s_infinite_0.2s]" />
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-[bounce_1.4s_infinite_0.4s]" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="p-5 border-t border-white/5 bg-zinc-900/80 backdrop-blur-xl">
                    <div className="relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me to create tasks..."
                            className="w-full bg-[#1C1C1E] border border-white/10 rounded-full pl-5 pr-12 py-3.5 text-[15px] text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isThinking}
                            className="absolute right-1.5 top-1.5 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all disabled:opacity-0 disabled:scale-75 shadow-lg shadow-blue-500/20"
                        >
                            <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
