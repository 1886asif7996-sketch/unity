"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MouseEvent } from "react";

interface MagicCardProps {
    balance: number;
    fine: number;
}

export default function MagicCard({ balance = 0, fine = 0 }: MagicCardProps) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    function onMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        x.set(clientX - left);
        y.set(clientY - top);
    }

    const rotateX = useTransform(mouseY, [0, 240], [5, -5]);
    const rotateY = useTransform(mouseX, [0, 400], [-5, 5]);

    return (
        <motion.div
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={onMouseMove}
            className="relative w-full h-[240px] rounded-3xl overflow-hidden glass-card p-8 text-black perspective-1000 group cursor-default transition-shadow hover:shadow-2xl hover:shadow-white/20"
        >
            {/* Background Pastel Blobs */}
            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[#bef264]/30 rounded-full blur-[60px]" /> {/* Mint */}
            <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-[#e9d5ff]/40 rounded-full blur-[60px]" /> {/* Lavender */}

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 z-10 pointer-events-none" />

            {/* Shimmer Effect */}
            <div className="absolute inset-0 z-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent translate-x-[-100%] animate-[shimmer_2.5s_infinite]" />

            {/* Card Chip */}
            <div className="relative z-20 flex justify-end mb-8">
                <div className="w-12 h-9 rounded-md bg-gradient-to-br from-gray-300 to-gray-400 border border-gray-400 flex items-center justify-center overflow-hidden relative shadow-inner">
                    <div className="absolute inset-0 border border-black/10 rounded-md" />
                    <svg className="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 10h16M4 14h16M4 18h16M10 4v16M14 4v16" />
                    </svg>
                </div>
            </div>

            {/* Balance Content */}
            <div className="relative z-20 mt-auto">
                <h3 className="text-gray-500 font-medium text-lg mb-1">Total balance</h3>
                <div className="text-5xl font-bold tracking-tight mb-8">
                    ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>

                <div className="flex justify-end items-center">
                    {fine > 0 && (
                        <div className="bg-red-50 px-4 py-1.5 rounded-full border border-red-100 animate-pulse">
                            <span className="text-error font-semibold text-sm">
                                Total fine: ${fine}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
