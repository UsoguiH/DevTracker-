
import { useState, useEffect } from 'react';

/**
 * useCountUp Hook
 * 
 * Animates a number from 0 to `end` over `duration` milliseconds.
 * Uses an "easeOutExpo" easing function for that premium, Apple-like feel where
 * the number counts up quickly at first and then slows down smoothly at the end.
 * 
 * @param end The target number to count up to.
 * @param duration The duration of the animation in milliseconds (default: 2000ms).
 * @returns The current animated value.
 */
export const useCountUp = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrameId: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;

            // Calculate percentage of completion (0 to 1)
            const percentage = Math.min(progress / duration, 1);

            // Apply Easing: Ease Out Expo
            // Formula: 1 - Math.pow(2, -10 * percentage)
            // This starts fast and decelerates smoothly.
            const easeOutExpo = (x: number): number => {
                return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
            };

            const easedProgress = easeOutExpo(percentage);

            // Calculate current value
            const currentCount = Math.floor(easedProgress * end);

            setCount(currentCount);

            if (progress < duration) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setCount(end); // Ensure we end exactly on the target
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [end, duration]);

    return count;
};
