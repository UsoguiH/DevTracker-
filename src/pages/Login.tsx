
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { SignInPage, SignUpPage, Testimonial } from "@/components/ui/sign-in";

const sampleTestimonials: Testimonial[] = [
    {
        avatarSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
        name: "Sarah Chen",
        handle: "@sarah.dev",
        text: "DevTracker changed how I organize my sprint tasks. The focus mode is a game changer!"
    },
    {
        avatarSrc: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&q=80",
        name: "Marcus Johnson",
        handle: "@marcus_codes",
        text: "Finally a project management tool that feels like it was built for developers."
    },
];

const Login: React.FC = () => {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const clearMessages = () => {
        setError(null);
        setMessage(null);
    };

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);

        setLoading(false);
    };

    const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const rawHandle = formData.get('handle') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            setError("Passwords don't match.");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            // Create profile row
            const { error: profileError } = await supabase.from('profiles').insert({
                id: data.user.id,
                name,
                handle,
                avatar: '',
            });

            if (profileError) {
                // Profile might already exist via trigger — not fatal
                console.warn('Profile insert warning:', profileError.message);
            }

            // If email confirmation is required, session will be null
            if (!data.session) {
                setMessage("Account created! Check your email to confirm before signing in.");
                setMode('signin');
            }
            // If auto-confirm is on, onAuthStateChange in App.tsx handles the redirect
        }

        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        clearMessages();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}`,
                queryParams: { access_type: 'offline', prompt: 'consent' },
            },
        });
        if (error) setError(error.message);
    };

    const Toast = () => (
        <>
            {error && (
                <div className="fixed top-4 right-4 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl z-50 text-sm max-w-sm">
                    {error}
                </div>
            )}
            {message && (
                <div className="fixed top-4 right-4 bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl z-50 text-sm max-w-sm">
                    {message}
                </div>
            )}
        </>
    );

    if (mode === 'signup') {
        return (
            <>
                <Toast />
                <SignUpPage
                    heroImageSrc="https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=2070"
                    testimonials={sampleTestimonials}
                    onSignUp={handleSignUp}
                    onGoogleSignIn={handleGoogleLogin}
                    onSignIn={() => { clearMessages(); setMode('signin'); }}
                    loading={loading}
                />
            </>
        );
    }

    return (
        <>
            <Toast />
            <SignInPage
                heroImageSrc="https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=2070"
                testimonials={sampleTestimonials}
                onSignIn={handleSignIn}
                onGoogleSignIn={handleGoogleLogin}
                onCreateAccount={() => { clearMessages(); setMode('signup'); }}
                onResetPassword={async () => {
                    const email = window.prompt('Enter your email address to reset password:');
                    if (!email) return;
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}`,
                    });
                    if (error) setError(error.message);
                    else setMessage('Password reset email sent! Check your inbox.');
                }}
            />
        </>
    );
};

export default Login;
