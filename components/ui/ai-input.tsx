"use client"

import * as React from "react"
import { useState } from "react"
import { cx } from "class-variance-authority"
import { AnimatePresence, motion } from "motion/react"
import { Play, ArrowUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { processUserMessage } from "../../lib/aiService"
import { AIAction, Task } from "../../types"

interface OrbProps {
    dimension?: string
    className?: string
    tones?: {
        base?: string
        accent1?: string
        accent2?: string
        accent3?: string
    }
    spinDuration?: number
}

const ColorOrb: React.FC<OrbProps> = ({
    dimension = "192px",
    className,
    tones,
    spinDuration = 20,
}) => {
    const fallbackTones = {
        base: "oklch(95% 0.02 264.695)",
        accent1: "oklch(75% 0.15 350)",
        accent2: "oklch(80% 0.12 200)",
        accent3: "oklch(78% 0.14 280)",
    }

    const palette = { ...fallbackTones, ...tones }

    const dimValue = parseInt(dimension.replace("px", ""), 10)

    const blurStrength =
        dimValue < 50 ? Math.max(dimValue * 0.008, 1) : Math.max(dimValue * 0.015, 4)

    const contrastStrength =
        dimValue < 50 ? Math.max(dimValue * 0.004, 1.2) : Math.max(dimValue * 0.008, 1.5)

    const pixelDot = dimValue < 50 ? Math.max(dimValue * 0.004, 0.05) : Math.max(dimValue * 0.008, 0.1)

    const shadowRange = dimValue < 50 ? Math.max(dimValue * 0.004, 0.5) : Math.max(dimValue * 0.008, 2)

    const maskRadius =
        dimValue < 30 ? "0%" : dimValue < 50 ? "5%" : dimValue < 100 ? "15%" : "25%"

    const adjustedContrast =
        dimValue < 30 ? 1.1 : dimValue < 50 ? Math.max(contrastStrength * 1.2, 1.3) : contrastStrength

    return (
        <div
            className={cn("color-orb", className)}
            style={{
                width: dimension,
                height: dimension,
                "--base": palette.base,
                "--accent1": palette.accent1,
                "--accent2": palette.accent2,
                "--accent3": palette.accent3,
                "--spin-duration": `${spinDuration}s`,
                "--blur": `${blurStrength}px`,
                "--contrast": adjustedContrast,
                "--dot": `${pixelDot}px`,
                "--shadow": `${shadowRange}px`,
                "--mask": maskRadius,
            } as React.CSSProperties}
        >
            <style>{`
        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .color-orb {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 50%;
          position: relative;
          transform: scale(1.1);
        }

        .color-orb::before,
        .color-orb::after {
          content: "";
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform: translateZ(0);
        }

        .color-orb::before {
          background:
            conic-gradient(
              from calc(var(--angle) * 2) at 25% 70%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 45% 75%,
              var(--accent2),
              transparent 30% 60%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * -3) at 80% 20%,
              var(--accent1),
              transparent 40% 60%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 15% 5%,
              var(--accent2),
              transparent 10% 90%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * 1) at 20% 80%,
              var(--accent1),
              transparent 10% 90%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * -2) at 85% 10%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            );
          box-shadow: inset var(--base) 0 0 var(--shadow) calc(var(--shadow) * 0.2);
          filter: blur(var(--blur)) contrast(var(--contrast));
          animation: spin var(--spin-duration) linear infinite;
        }

        .color-orb::after {
          background-image: radial-gradient(
            circle at center,
            var(--base) var(--dot),
            transparent var(--dot)
          );
          background-size: calc(var(--dot) * 2) calc(var(--dot) * 2);
          backdrop-filter: blur(calc(var(--blur) * 2)) contrast(calc(var(--contrast) * 2));
          mix-blend-mode: overlay;
        }

        .color-orb[style*="--mask: 0%"]::after {
          mask-image: none;
        }

        .color-orb:not([style*="--mask: 0%"])::after {
          mask-image: radial-gradient(black var(--mask), transparent 75%);
        }

        @keyframes spin {
          to {
            --angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .color-orb::before {
            animation: none;
          }
        }
      `}</style>
        </div>
    )
}

const SPEED_FACTOR = 1

interface MorphPanelProps {
    onAIAction: (action: AIAction) => void;
    currentTasks: Task[];
}

interface ContextShape {
    showForm: boolean
    successFlag: boolean
    isThinking: boolean
    triggerOpen: () => void
    triggerClose: () => void
    handleAIRequest: (text: string) => Promise<void>
}

const FormContext = React.createContext({} as ContextShape)
const useFormContext = () => React.useContext(FormContext)

export function MorphPanel({ onAIAction, currentTasks }: MorphPanelProps) {
    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

    const [showForm, setShowForm] = React.useState(false)
    const [successFlag, setSuccessFlag] = React.useState(false)
    const [isThinking, setIsThinking] = React.useState(false)
    const [pendingAction, setPendingAction] = useState<AIAction | null>(null);

    const triggerClose = React.useCallback(() => {
        setShowForm(false)
        textareaRef.current?.blur()
    }, [])

    const triggerOpen = React.useCallback(() => {
        setShowForm(true)
        setTimeout(() => {
            textareaRef.current?.focus()
        })
    }, [])

    const handleSuccess = React.useCallback(() => {
        triggerClose()
        setSuccessFlag(true)
        setTimeout(() => setSuccessFlag(false), 1500)
    }, [triggerClose])

    const handleAIRequest = async (text: string) => {
        setIsThinking(true);
        try {
            const action = await processUserMessage(text, currentTasks);

            if (action.intent === 'CREATE_TASKS') {
                // Trigger Approval Flow
                setPendingAction(action);
                // Do NOT close yet, let user engage with approval
            } else if (action.intent !== 'NONE') {
                onAIAction(action);
                handleSuccess();
            } else {
                // Just a chat message or error?
                handleSuccess(); // Close for now
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsThinking(false);
        }
    };

    const confirmAction = () => {
        if (pendingAction) {
            onAIAction(pendingAction);
            setPendingAction(null);
            handleSuccess();
        }
    };

    const cancelAction = () => {
        setPendingAction(null);
        triggerClose();
    };

    React.useEffect(() => {
        function clickOutsideHandler(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && showForm && !pendingAction) {
                // Only close if NOT waiting for approval
                triggerClose()
            }
        }
        document.addEventListener("mousedown", clickOutsideHandler)
        return () => document.removeEventListener("mousedown", clickOutsideHandler)
    }, [showForm, triggerClose, pendingAction])


    const ctx = React.useMemo(
        () => ({ showForm, successFlag, isThinking, triggerOpen, triggerClose, handleAIRequest }),
        [showForm, successFlag, isThinking, triggerOpen, triggerClose]
    )


    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Approval Card - Floats ABOVE the panel */}
            <AnimatePresence>
                {pendingAction && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="mb-2 w-[340px] bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 overflow-hidden"
                    >

                        <div className="relative">
                            <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Proposed Action</h3>
                            <p className="text-white text-sm font-medium mb-4">
                                {pendingAction.summary || `Create ${pendingAction.payload?.tasks?.length || 1} new tasks?`}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={confirmAction}
                                    className="flex-1 py-2 bg-white text-black rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-white/10"
                                >
                                    <Play size={12} className="fill-current" /> Accept
                                </button>
                                <button
                                    onClick={cancelAction}
                                    className="flex-1 py-2 bg-white/5 text-white rounded-lg text-sm font-medium hover:bg-white/10 transition-colors border border-white/5"
                                >
                                    Deny
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            <motion.div
                ref={wrapperRef}
                data-panel
                // Hover Support
                onMouseEnter={triggerOpen}
                onMouseLeave={() => {
                    if (!textareaRef.current?.value && !isThinking && !pendingAction) {
                        // optional: auto close
                    }
                }}
                className={cx(
                    // transition-colors ONLY — framer-motion owns size/transform animation;
                    // a CSS transition-all here fights it and causes jank.
                    "relative flex flex-col items-center overflow-hidden transition-colors backdrop-blur-3xl",
                    showForm
                        ? "border border-white/15 bg-zinc-950/90 shadow-[0_8px_40px_-8px_rgba(38,37,30,0.45)]"
                        // Collapsed dock: solid ink pill so it pops on the cream canvas
                        : "border border-ink/20 bg-ink shadow-[0_6px_24px_-6px_rgba(38,37,30,0.5)] cursor-pointer"
                )}
                initial={false}
                animate={{
                    width: showForm ? FORM_WIDTH : "auto",
                    height: showForm ? FORM_HEIGHT : 44,
                    borderRadius: showForm ? 24 : 22, // Slightly smoother curve
                }}
                transition={{
                    type: "spring",
                    stiffness: 400, // Smoother spring
                    damping: 30,
                    mass: 0.8,
                }}
            >


                <FormContext.Provider value={ctx}>
                    <DockBar />
                    <InputForm ref={textareaRef} />
                </FormContext.Provider>
            </motion.div>
        </div>
    )
}

function DockBar() {
    const { showForm, triggerOpen, isThinking } = useFormContext()
    return (
        <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none relative z-10">
            <div className="flex items-center justify-center gap-2 px-3 max-sm:h-10 max-sm:px-2 cursor-pointer" onClick={triggerOpen}>
                <div className="flex w-fit items-center gap-2">
                    <AnimatePresence mode="wait">
                        {showForm ? (
                            <motion.div
                                key="blank"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0 }}
                                exit={{ opacity: 0 }}
                                className="h-5 w-5"
                            />
                        ) : (
                            <motion.div
                                key="orb"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={isThinking ? "animate-pulse" : ""}
                            >
                                {/* bright orb so it glows against the ink pill */}
                                <ColorOrb dimension="24px" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <Button
                    type="button"
                    className={cn("flex h-fit flex-1 justify-end rounded-full px-2 !py-0.5 transition-opacity font-semibold tracking-tight text-white hover:text-white hover:bg-transparent", showForm ? "opacity-0 pointer-events-none" : "opacity-100")}
                    variant="ghost"
                >
                    <span className="truncate">Ask AI</span>
                </Button>
            </div>
        </footer>
    )
}

const FORM_WIDTH = 360
const FORM_HEIGHT = 160 // Little bit more compact for sleekness, since bottom bar is removed

function InputForm({ ref }: { ref: React.Ref<HTMLTextAreaElement> }) {
    const { triggerClose, showForm, handleAIRequest, isThinking } = useFormContext()
    const btnRef = React.useRef<HTMLButtonElement>(null)
    const [value, setValue] = useState("")

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!value.trim()) return
        await handleAIRequest(value)
        setValue("")
    }

    function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Escape") triggerClose()
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            btnRef.current?.click()
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="absolute bottom-0 left-0 right-0 top-0 flex flex-col"
            style={{ pointerEvents: showForm ? "all" : "none" }}
        >
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-1 flex-col p-2 h-full relative"
                    >
                        {/* Header: Just Orb + Title? Or purely title? Minimalist. */}
                        <div className="flex items-center gap-3 px-3 py-2 select-none opacity-60">
                            {/* Small orb in header */}
                            <div className={isThinking ? "animate-spin duration-[3s]" : ""}>
                                <ColorOrb dimension="16px" tones={{ base: "oklch(22.64% 0 0)" }} />
                            </div>
                            <span className="text-[11px] font-semibold text-zinc-300 tracking-widest uppercase">
                                {isThinking ? "Thinking..." : "AI Input"}
                            </span>
                        </div>

                        <textarea
                            ref={ref}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Ask me anything..."
                            name="message"
                            className="w-full flex-1 resize-none bg-transparent px-3 py-1 outline-none text-white/90 placeholder-zinc-600 text-[15px] leading-relaxed custom-scrollbar opacity-0 animate-[fadeIn_0.3s_0.1s_forwards]"
                            style={{ animationFillMode: 'forwards' }}
                            required
                            onKeyDown={handleKeys}
                            spellCheck={false}
                            disabled={isThinking}
                        />

                        {/* Bottom Actions Row */}
                        <div className="mt-auto flex justify-end px-2 pb-1">
                            {/* THE BLUE BUTTON MOVES HERE (GREEN ZONE) */}
                            <button
                                type="submit"
                                ref={btnRef}
                                disabled={isThinking || !value.trim()}
                                className={cn(
                                    "flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200",
                                    value.trim()
                                        ? "bg-white text-black hover:scale-105 shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)]"
                                        : "bg-white/10 text-white/20 cursor-not-allowed"
                                )}
                            >
                                <ArrowUp size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
    )
}
