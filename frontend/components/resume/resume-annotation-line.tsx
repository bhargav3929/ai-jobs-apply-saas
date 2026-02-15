"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AnnotationLineProps {
    fromRef: HTMLDivElement | null;
    toRef: HTMLDivElement | null;
    containerRef: HTMLDivElement | null;
    visible: boolean;
}

export default function ResumeAnnotationLine({ fromRef, toRef, containerRef, visible }: AnnotationLineProps) {
    const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

    useEffect(() => {
        if (!fromRef || !toRef || !containerRef || !visible) {
            setCoords(null);
            return;
        }

        const updateCoords = () => {
            const containerRect = containerRef.getBoundingClientRect();
            const fromRect = fromRef.getBoundingClientRect();
            const toRect = toRef.getBoundingClientRect();

            setCoords({
                x1: fromRect.right - containerRect.left,
                y1: fromRect.top + fromRect.height / 2 - containerRect.top,
                x2: toRect.left - containerRect.left,
                y2: toRect.top + toRect.height / 2 - containerRect.top,
            });
        };

        updateCoords();

        const observer = new ResizeObserver(updateCoords);
        observer.observe(containerRef);

        window.addEventListener("scroll", updateCoords, true);
        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", updateCoords, true);
        };
    }, [fromRef, toRef, containerRef, visible]);

    if (!coords || !visible) return null;

    const midX = (coords.x1 + coords.x2) / 2;
    const path = `M ${coords.x1} ${coords.y1} Q ${midX} ${coords.y1} ${midX} ${(coords.y1 + coords.y2) / 2} Q ${midX} ${coords.y2} ${coords.x2} ${coords.y2}`;

    return (
        <svg className="absolute inset-0 pointer-events-none z-10 hidden md:block" style={{ overflow: "visible" }}>
            <motion.path
                d={path}
                fill="none"
                stroke="var(--color-brand-primary)"
                strokeWidth={1.5}
                strokeOpacity={0.25}
                strokeDasharray="4 3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* End dot */}
            <motion.circle
                cx={coords.x2}
                cy={coords.y2}
                r={3}
                fill="var(--color-brand-primary)"
                fillOpacity={0.4}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 15 }}
            />
        </svg>
    );
}
