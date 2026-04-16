import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Logo } from './Logo';

export const DeepSpaceLoader: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500; // 2.5 seconds
    const interval = 40; // update every 40ms
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[var(--z-system)] flex flex-col items-center justify-center overflow-hidden bg-black"
    >
      {/* Dynamic Background Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3] 
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-white/10 via-transparent to-transparent blur-[80px] rounded-full pointer-events-none" 
      />
      
      <div className="relative flex flex-col items-center">
        {/* Logo Container with enhanced animation */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="shadow-2xl mb-10 overflow-hidden shadow-indigo-600/40"
        >
          <Logo size={96} />
        </motion.div>

        {/* Text Area */}
        <div className="text-center space-y-4">
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl font-black italic uppercase tracking-tighter px-8"
            style={{ color: 'white' }}
          >
            WholeScale <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 pr-3">OS</span>
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-3 text-indigo-400/80 font-black uppercase tracking-[0.4em] text-[10px]">
              Initializing Foundation
            </div>
            <div className="text-2xl font-mono font-bold text-white/40 tabular-nums">
              {Math.min(100, Math.round(progress))}%
            </div>
          </motion.div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-64 h-1.5 bg-white/5 rounded-full mt-12 overflow-hidden relative border border-white/5">
          <motion.div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
      </div>

      {/* Decorative text */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ delay: 2, duration: 2 }}
        className="absolute bottom-12 text-[10px] uppercase tracking-[0.8em] font-bold text-indigo-400"
      >
        Universal Operating System for Real Estate
      </motion.div>
    </motion.div>
  );
};

