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
      
      const defaultImages = [
         "https://images.unsplash.com/photo-1516280440502-6c2e39db0809?q=80&w=200",
         "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f9af?q=80&w=200",
         "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200",
         "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=200",
         "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200"
      ];

      if (mounted) {
        if (data?.splash_images && data.splash_images.length > 0) {
          setImages(data.splash_images);
        } else {
          setImages(defaultImages);
        }
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
            className="relative z-10 flex flex-col items-center justify-center p-6 text-center drop-shadow-2xl"
          >
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
              Adja<span className="text-adja-yellow">Stream</span>
            </h1>
            <p className="text-white font-medium text-sm sm:text-base mt-2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              Promotion de la musique Locale en Adjagbe !
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
