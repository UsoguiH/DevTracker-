import React, { useState, useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { Eye, EyeOff, User, AtSign } from 'lucide-react';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
);

const BrandMark = () => (
    <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-md bg-primary inline-flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-on-primary" />
        </span>
        <span className="text-[16px] font-semibold tracking-tight text-ink">DevTracker</span>
    </div>
);

// --- TYPE DEFINITIONS ---

export interface Testimonial {
    avatarSrc: string;
    name: string;
    handle: string;
    text: string;
}

interface SignInPageProps {
    title?: React.ReactNode;
    description?: React.ReactNode;
    heroImageSrc?: string;
    testimonials?: Testimonial[];
    onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
    onGoogleSignIn?: () => void;
    onResetPassword?: () => void;
    onCreateAccount?: () => void;
}

interface SignUpPageProps {
    heroImageSrc?: string;
    testimonials?: Testimonial[];
    onSignUp?: (event: React.FormEvent<HTMLFormElement>) => void;
    onGoogleSignIn?: () => void;
    onSignIn?: () => void;
    loading?: boolean;
}

// --- SHARED HOOK: GSAP entrance, reusing the existing element markers ---

const useEntrance = () => {
    const root = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.animate-element', { y: 18, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' });
            gsap.from('.gs-hero', { xPercent: 6, opacity: 0, duration: 0.9, ease: 'power3.out' });
            gsap.from('.animate-testimonial', { y: 22, opacity: 0, duration: 0.6, stagger: 0.15, delay: 0.55, ease: 'power3.out' });
        }, root);
        return () => ctx.revert();
    }, []);
    return root;
};

// --- SUB-COMPONENTS ---

const InputWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-1.5 rounded-md border border-hairline-strong bg-surface-card transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        {children}
    </div>
);

const labelCls = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-muted';
const inputCls = 'w-full bg-transparent text-[15px] p-3.5 rounded-md focus:outline-none text-ink placeholder-muted-soft';

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
    <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-lg bg-surface-card border border-hairline p-5 w-64`}>
        <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-md" alt="avatar" />
        <div className="text-sm leading-snug">
            <p className="font-semibold text-ink">{testimonial.name}</p>
            <p className="text-muted">{testimonial.handle}</p>
            <p className="mt-1 text-body">{testimonial.text}</p>
        </div>
    </div>
);

const HeroPanel = ({ heroImageSrc, testimonials }: { heroImageSrc?: string; testimonials: Testimonial[] }) => {
    if (!heroImageSrc) return null;
    return (
        <section className="hidden md:block flex-1 relative p-4">
            <div className="gs-hero absolute inset-4 rounded-lg overflow-hidden border border-hairline">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }} />
                {/* warm cream wash so the photo sits in the editorial palette */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-ink/10 to-transparent" />
                <div className="absolute top-6 left-6 rounded-md bg-canvas/90 backdrop-blur px-3 py-1.5 border border-hairline">
                    <BrandMark />
                </div>
            </div>
            {testimonials.length > 0 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
                    <TestimonialCard testimonial={testimonials[0]} delay="" />
                    {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="" /></div>}
                    {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="" /></div>}
                </div>
            )}
        </section>
    );
};

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
    title = <span className="display text-ink">Welcome back</span>,
    description = "Sign in to your workspace and keep shipping.",
    heroImageSrc,
    testimonials = [],
    onSignIn,
    onGoogleSignIn,
    onResetPassword,
    onCreateAccount,
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const root = useEntrance();

    return (
        <div ref={root} className="h-[100dvh] flex flex-col md:flex-row font-sans w-[100dvw] bg-canvas text-ink">
            {/* Left column: sign-in form */}
            <section className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="animate-element mb-10"><BrandMark /></div>
                    <div className="flex flex-col gap-5">
                        <h1 className="animate-element text-[34px] md:text-[40px] leading-tight">{title}</h1>
                        <p className="animate-element text-body -mt-2">{description}</p>

                        <form className="space-y-4 mt-2" onSubmit={onSignIn}>
                            <div className="animate-element">
                                <label className={labelCls}>Email Address</label>
                                <InputWrapper>
                                    <input name="email" type="email" placeholder="you@company.com" className={inputCls} />
                                </InputWrapper>
                            </div>

                            <div className="animate-element">
                                <label className={labelCls}>Password</label>
                                <InputWrapper>
                                    <div className="relative">
                                        <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className={inputCls + ' pr-12'} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                                            {showPassword ? <EyeOff className="w-5 h-5 text-muted hover:text-ink transition-colors" /> : <Eye className="w-5 h-5 text-muted hover:text-ink transition-colors" />}
                                        </button>
                                    </div>
                                </InputWrapper>
                            </div>

                            <div className="animate-element flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" name="rememberMe" className="accent-primary w-4 h-4 rounded border-hairline-strong" />
                                    <span className="text-body">Keep me signed in</span>
                                </label>
                                <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="hover:underline text-primary font-medium transition-colors">Reset password</a>
                            </div>

                            <button type="submit" className="animate-element w-full rounded-2xl bg-primary py-4 font-medium text-on-primary hover:bg-primary-active transition-colors">
                                Sign In
                            </button>
                        </form>

                        <div className="animate-element relative flex items-center justify-center my-1">
                            <span className="w-full border-t border-hairline"></span>
                            <span className="px-4 text-[11px] uppercase tracking-[0.08em] text-muted-soft bg-canvas absolute">Or continue with</span>
                        </div>

                        <button onClick={onGoogleSignIn} className="animate-element w-full flex items-center justify-center gap-3 border border-hairline-strong rounded-2xl py-4 hover:bg-canvas-soft transition-colors text-ink font-medium">
                            <GoogleIcon />
                            Continue with Google
                        </button>

                        <p className="animate-element text-center text-sm text-muted">
                            New to DevTracker? <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-primary font-medium hover:underline transition-colors">Create Account</a>
                        </p>
                    </div>
                </div>
            </section>

            <HeroPanel heroImageSrc={heroImageSrc} testimonials={testimonials} />
        </div>
    );
};

// --- SIGN UP PAGE ---

export const SignUpPage: React.FC<SignUpPageProps> = ({
    heroImageSrc,
    testimonials = [],
    onSignUp,
    onGoogleSignIn,
    onSignIn,
    loading = false,
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const root = useEntrance();

    return (
        <div ref={root} className="h-[100dvh] flex flex-col md:flex-row font-sans w-[100dvw] bg-canvas text-ink">
            {/* Left column: sign-up form */}
            <section className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="w-full max-w-md py-8">
                    <div className="animate-element mb-8"><BrandMark /></div>
                    <div className="flex flex-col gap-4">
                        <div>
                            <h1 className="animate-element text-[34px] md:text-[40px] leading-tight display text-ink">Create account</h1>
                            <p className="animate-element text-body mt-2">Join DevTracker and start shipping faster.</p>
                        </div>

                        <form className="space-y-3.5" onSubmit={onSignUp}>
                            <div className="animate-element">
                                <label className={labelCls}>Full Name</label>
                                <InputWrapper>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-soft" />
                                        <input name="name" type="text" required placeholder="Your full name" className={inputCls + ' pl-11'} />
                                    </div>
                                </InputWrapper>
                            </div>

                            <div className="animate-element">
                                <label className={labelCls}>Username / Handle</label>
                                <InputWrapper>
                                    <div className="relative">
                                        <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-soft" />
                                        <input name="handle" type="text" required placeholder="yourhandle" className={inputCls + ' pl-11'} />
                                    </div>
                                </InputWrapper>
                            </div>

                            <div className="animate-element">
                                <label className={labelCls}>Email Address</label>
                                <InputWrapper>
                                    <input name="email" type="email" required placeholder="you@company.com" className={inputCls} />
                                </InputWrapper>
                            </div>

                            <div className="animate-element">
                                <label className={labelCls}>Password</label>
                                <InputWrapper>
                                    <div className="relative">
                                        <input name="password" type={showPassword ? 'text' : 'password'} required placeholder="Min. 6 characters" className={inputCls + ' pr-12'} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                                            {showPassword ? <EyeOff className="w-5 h-5 text-muted hover:text-ink transition-colors" /> : <Eye className="w-5 h-5 text-muted hover:text-ink transition-colors" />}
                                        </button>
                                    </div>
                                </InputWrapper>
                            </div>

                            <div className="animate-element">
                                <label className={labelCls}>Confirm Password</label>
                                <InputWrapper>
                                    <div className="relative">
                                        <input name="confirmPassword" type={showConfirm ? 'text' : 'password'} required placeholder="Re-enter your password" className={inputCls + ' pr-12'} />
                                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-3 flex items-center">
                                            {showConfirm ? <EyeOff className="w-5 h-5 text-muted hover:text-ink transition-colors" /> : <Eye className="w-5 h-5 text-muted hover:text-ink transition-colors" />}
                                        </button>
                                    </div>
                                </InputWrapper>
                            </div>

                            <button type="submit" disabled={loading} className="animate-element w-full rounded-2xl bg-primary py-4 font-medium text-on-primary hover:bg-primary-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>

                        <div className="animate-element relative flex items-center justify-center my-1">
                            <span className="w-full border-t border-hairline"></span>
                            <span className="px-4 text-[11px] uppercase tracking-[0.08em] text-muted-soft bg-canvas absolute">Or continue with</span>
                        </div>

                        <button onClick={onGoogleSignIn} className="animate-element w-full flex items-center justify-center gap-3 border border-hairline-strong rounded-2xl py-4 hover:bg-canvas-soft transition-colors text-ink font-medium">
                            <GoogleIcon />
                            Continue with Google
                        </button>

                        <p className="animate-element text-center text-sm text-muted">
                            Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onSignIn?.(); }} className="text-primary font-medium hover:underline transition-colors">Sign In</a>
                        </p>
                    </div>
                </div>
            </section>

            <HeroPanel heroImageSrc={heroImageSrc} testimonials={testimonials} />
        </div>
    );
};
