'use client';

import React, { useEffect, useState } from 'react';

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  className?: string;
  label?: string;
  animated?: boolean;
}

export default function Sparkline({ 
  data, 
  color, 
  height = 60, 
  className = '', 
  label,
  animated = true 
}: SparklineProps) {
  const [animatedData, setAnimatedData] = useState<number[]>(data.map(() => 0));

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedData(data);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedData(data);
    }
  }, [data, animated]);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Generate SVG path
  const pathData = animatedData
    .map((value, index) => {
      const x = (index / (animatedData.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 80; // Leave 20% padding
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`${className}`}>
      {label && (
        <div className="text-slate-400 text-sm mb-2">{label}</div>
      )}
      <div className="relative" style={{ height }}>
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Area fill */}
          <path
            d={`${pathData} L 100 100 L 0 100 Z`}
            fill={`url(#${gradientId})`}
            className="transition-all duration-1000 ease-out"
          />
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-1000 ease-out filter drop-shadow-sm"
          />
          
          {/* Data points */}
          {animatedData.map((value, index) => {
            const x = (index / (animatedData.length - 1)) * 100;
            const y = 100 - ((value - min) / range) * 80;
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill={color}
                className="transition-all duration-1000 ease-out opacity-60 hover:opacity-100 hover:r-2"
              />
            );
          })}
        </svg>
        
        {/* Current value indicator */}
        <div className="absolute top-2 right-2">
          <span 
            className="text-sm font-semibold px-2 py-1 rounded-md"
            style={{ color }}
          >
            {Math.round(data[data.length - 1] || 0)}%
          </span>
        </div>
      </div>
    </div>
  );
} 