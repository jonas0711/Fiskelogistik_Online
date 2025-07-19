/**
 * Scroll To Top Komponent
 * Knap til at scrolle tilbage til toppen af siden
 * Forbedrer brugeroplevelsen på lange sider
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

export default function ScrollToTop() {
  console.log('⬆️ Initialiserer Scroll To Top...');
  
  // State til at vise/skjule knappen
  const [isVisible, setIsVisible] = useState(false);
  
  /**
   * Tjekker om brugeren har scrollet nok til at vise knappen
   */
  const toggleVisibility = () => {
    console.log('📏 Tjekker scroll position...');
    
    // Vis knappen hvis brugeren har scrollet mere end 300px
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };
  
  /**
   * Scroller tilbage til toppen
   */
  const scrollToTop = () => {
    console.log('⬆️ Scroller tilbage til toppen...');
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Smooth scroll animation
    });
  };
  
  /**
   * Lytter til scroll events
   */
  useEffect(() => {
    console.log('👂 Lytter til scroll events...');
    
    window.addEventListener('scroll', toggleVisibility);
    
    // Cleanup ved unmount
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);
  
  console.log(`${LOG_PREFIXES.render} Renderer Scroll To Top, synlig:`, isVisible);
  
  // Vis kun hvis knappen skal være synlig
  if (!isVisible) {
    return null;
  }
  
  return (
    <Button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
      size="sm"
    >
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 10l7-7m0 0l7 7m-7-7v18" 
        />
      </svg>
    </Button>
  );
} 