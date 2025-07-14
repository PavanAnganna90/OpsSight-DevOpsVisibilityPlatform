/**
 * VirtualList Component
 * 
 * High-performance virtual scrolling list for large datasets
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useVirtualization } from '../../utils/performanceOptimizations';
import { cn } from '@/utils/cn';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  keyExtractor?: (item: T, index: number) => string | number;
}

export const VirtualList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  keyExtractor = (_, index) => index,
}: VirtualListProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use enhanced virtualization hook
  const {
    visibleItems,
    totalHeight,
    onScroll: handleVirtualScroll,
    containerStyle,
  } = useVirtualization(items, itemHeight, containerHeight);

  // Memoize the scroll handler for performance
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    handleVirtualScroll(e);
    onScroll?.(e.currentTarget.scrollTop);
  }, [handleVirtualScroll, onScroll]);

  // Memoize visible items with overscan
  const itemsToRender = useMemo(() => {
    const startIndex = Math.max(0, visibleItems[0]?.index - overscan);
    const endIndex = Math.min(items.length - 1, visibleItems[visibleItems.length - 1]?.index + overscan);
    
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i]) {
        result.push({
          item: items[i],
          index: i,
          offsetY: i * itemHeight,
        });
      }
    }
    return result;
  }, [visibleItems, items, overscan, itemHeight]);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={containerStyle}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {itemsToRender.map(({ item, index, offsetY }) => (
          <div
            key={keyExtractor(item, index)}
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
              height: itemHeight,
              overflow: 'hidden',
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualList;