"use client";

/**
 * Pinch Zoom Container Component
 * 
 * Provides pinch-to-zoom functionality for charts and visualizations:
 * - Smooth pinch-to-zoom with momentum
 * - Pan and zoom with touch gestures
 * - Boundaries and limits
 * - Reset to fit functionality
 * - Touch-optimized performance
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTouchGestures } from './TouchGestureProvider';

interface PinchZoomContainerProps {
  children: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  disabled?: boolean;
  className?: string;
  onZoomChange?: (zoom: number) => void;
  resetTrigger?: number; // Change this to trigger reset
}

export const PinchZoomContainer: React.FC<PinchZoomContainerProps> = ({
  children,
  minZoom = 0.5,
  maxZoom = 3,
  initialZoom = 1,
  disabled = false,
  className = '',
  onZoomChange,
  resetTrigger = 0,
}) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);
  const animationFrame = useRef<number | null>(null);
  
  const { onPinch, triggerHaptic } = useTouchGestures();

  // Handle pinch-to-zoom
  useEffect(() => {
    if (disabled) return;

    const unsubscribe = onPinch((pinchData) => {
      if (!containerRef.current) return;

      const { scale, center } = pinchData;
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Calculate zoom center relative to container
      const centerX = center.x - containerRect.left;
      const centerY = center.y - containerRect.top;
      
      // Apply zoom with constraints
      const newZoom = Math.max(minZoom, Math.min(maxZoom, scale * initialZoom));
      
      if (newZoom !== zoom) {
        setZoom(newZoom);
        setIsZooming(true);
        
        // Update pan to keep zoom centered
        if (lastPinchCenter.current) {
          const zoomDelta = newZoom / zoom;
          const newPanX = centerX - (centerX - pan.x) * zoomDelta;
          const newPanY = centerY - (centerY - pan.y) * zoomDelta;
          
          setPan({ x: newPanX, y: newPanY });
        }
        
        lastPinchCenter.current = { x: centerX, y: centerY };
        onZoomChange?.(newZoom);
        
        // Provide haptic feedback at zoom boundaries
        if (newZoom === minZoom || newZoom === maxZoom) {
          triggerHaptic('light');
        }
      }
    });

    return unsubscribe;
  }, [disabled, zoom, pan, minZoom, maxZoom, initialZoom, onPinch, onZoomChange, triggerHaptic]);

  // Touch handlers for panning
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    lastPanPosition.current = { x: touch.clientX, y: touch.clientY };
    setIsPanning(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !isPanning || !lastPanPosition.current || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastPanPosition.current.x;
    const deltaY = touch.clientY - lastPanPosition.current.y;
    
    // Only pan if zoomed in
    if (zoom > 1) {
      const newPanX = pan.x + deltaX;
      const newPanY = pan.y + deltaY;
      
      // Apply pan boundaries
      const boundedPan = applyPanBoundaries(newPanX, newPanY);
      setPan(boundedPan);
      
      e.preventDefault();
    }
    
    lastPanPosition.current = { x: touch.clientX, y: touch.clientY };
  }, [disabled, isPanning, zoom, pan]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    setIsZooming(false);
    lastPanPosition.current = null;
    lastPinchCenter.current = null;
  }, []);

  // Apply pan boundaries to keep content visible
  const applyPanBoundaries = useCallback((panX: number, panY: number) => {
    if (!containerRef.current || !contentRef.current) return { x: panX, y: panY };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    
    const maxPanX = Math.max(0, (contentRect.width * zoom - containerRect.width) / 2);
    const maxPanY = Math.max(0, (contentRect.height * zoom - containerRect.height) / 2);
    
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, panX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, panY)),
    };
  }, [zoom]);

  // Reset zoom and pan
  const resetZoom = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
    setIsZooming(false);
    setIsPanning(false);
    onZoomChange?.(initialZoom);
    triggerHaptic('medium');
  }, [initialZoom, onZoomChange, triggerHaptic]);

  // Handle reset trigger
  useEffect(() => {
    if (resetTrigger > 0) {
      resetZoom();
    }
  }, [resetTrigger, resetZoom]);

  // Double tap to reset
  const handleDoubleClick = useCallback(() => {
    if (!disabled) {
      resetZoom();
    }
  }, [disabled, resetZoom]);

  // Smooth transitions
  const transformStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: 'center center',
    transition: (isZooming || isPanning) ? 'none' : 'transform 0.3s ease-out',
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full touch-manipulation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        {/* Content */}
        <div
          ref={contentRef}
          className="w-full h-full"
          style={transformStyle}
        >
          {children}
        </div>
        
        {/* Zoom Controls Overlay */}
        {!disabled && zoom !== initialZoom && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={resetZoom}
              className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2 
                       border border-gray-200 dark:border-gray-700
                       hover:bg-gray-50 dark:hover:bg-gray-700 
                       transition-colors touch-manipulation"
              aria-label="Reset zoom"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Zoom Indicator */}
        {!disabled && (isZooming || isPanning) && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
              {Math.round(zoom * 100)}%
            </div>
          </div>
        )}
        
        {/* Pan Indicators */}
        {!disabled && zoom > 1 && (
          <>
            {/* Top indicator */}
            <div 
              className={`absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full transition-opacity duration-200
                         ${Math.abs(pan.y) > 10 ? 'opacity-60' : 'opacity-20'}`}
            />
            
            {/* Bottom indicator */}
            <div 
              className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full transition-opacity duration-200
                         ${Math.abs(pan.y) > 10 ? 'opacity-60' : 'opacity-20'}`}
            />
            
            {/* Left indicator */}
            <div 
              className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-gray-300 dark:bg-gray-600 rounded-full transition-opacity duration-200
                         ${Math.abs(pan.x) > 10 ? 'opacity-60' : 'opacity-20'}`}
            />
            
            {/* Right indicator */}
            <div 
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-gray-300 dark:bg-gray-600 rounded-full transition-opacity duration-200
                         ${Math.abs(pan.x) > 10 ? 'opacity-60' : 'opacity-20'}`}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PinchZoomContainer;