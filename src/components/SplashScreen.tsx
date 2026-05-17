import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchImages = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('splash_images')
        .limit(1)
        .single();
      if (mounted && data?.splash_images) {
        setImages(data.splash_images);
      }
    };
    fetchImages();

    const timer = setTimeout(() => {
      if (mounted) {
        setIsVisible(false);
        setTimeout(onComplete, 800); // Wait for fade out
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[100] bg-adja-dark flex items-center justify-center overflow-hidden"
        >
          {/* Background carousels */}
          {images.length > 0 && (
            <div className="absolute inset-0 opacity-20 flex justify-center scale-125 pointer-events-none gap-4 overflow-hidden">
              <motion.div
                animate={{ y: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="flex flex-col gap-4 h-[200%]"
              >
                {[...images, ...images, ...images].map((src, i) => (
                  <img key={`col1-${i}`} src={src} className="w-32 h-48 object-cover rounded-2xl shadow-xl" alt="" />
                ))}
              </motion.div>
              <motion.div
                animate={{ y: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
                className="flex flex-col gap-4 h-[200%] mt-20"
              >
                {[...images, ...images, ...images].reverse().map((src, i) => (
                  <img key={`col2-${i}`} src={src} className="w-40 h-56 object-cover rounded-2xl shadow-xl" alt="" />
                ))}
              </motion.div>
              <motion.div
                animate={{ y: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
                className="flex flex-col gap-4 h-[200%] mt-10"
              >
                {[...images, ...images, ...images].map((src, i) => (
                  <img key={`col3-${i}`} src={src} className="w-32 h-48 object-cover rounded-2xl shadow-xl" alt="" />
                ))}
              </motion.div>
            </div>
          )}

          {/* AdjaStream floating text */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.1 }}
            className="relative z-10 flex flex-col items-center justify-center p-12 bg-adja-dark/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/5"
          >
            <div className="w-20 h-20 bg-adja-yellow rounded-full flex items-center justify-center mb-6 shadow-lg shadow-adja-yellow/20">
              <svg className="w-10 h-10 text-adja-dark" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white">
              Adja<span className="text-adja-yellow">Stream</span>
            </h1>
            <p className="text-adja-cream/70 font-medium text-sm mt-3 tracking-widest uppercase">
              La voix de nos racines
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
