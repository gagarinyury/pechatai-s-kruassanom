/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { FINGER_STYLES, KeyInfo, RUSSIAN_LAYOUT } from '../constants';

interface KeyboardProps {
  activeKey?: string;
  nextKey?: string;
  pressedKey?: string;
  compact?: boolean;
}

export const VirtualKeyboard: React.FC<KeyboardProps> = ({ activeKey, nextKey, pressedKey, compact = false }) => {
  const normalizedActiveKey = activeKey?.toLowerCase();
  const normalizedNextKey = nextKey?.toLowerCase();

  const keyMatches = (value: string | undefined, keyInfo: KeyInfo) => {
    if (!value) return false;
    return value === keyInfo.key.toLowerCase() || value === keyInfo.shiftKey?.toLowerCase();
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-stone-900 rounded-3xl border-2 border-bakery-100 dark:border-stone-800 shadow-xl overflow-hidden select-none w-full transition-all duration-300 ${compact ? 'max-w-5xl gap-1 p-4' : 'max-w-4xl gap-1.5 p-6'}`}>
      {RUSSIAN_LAYOUT.map((row, rowIndex) => (
        <div 
          key={rowIndex} 
          className={`flex justify-center ${compact ? 'gap-1' : 'gap-1.5'}`}
          style={{ marginLeft: `${rowIndex * (compact ? 0.85 : 1.2)}rem` }}
        >
          {row.map((keyInfo) => {
            const fingerStyle = FINGER_STYLES[keyInfo.finger];
            const isTarget = keyMatches(normalizedActiveKey, keyInfo);
            const isNext = keyMatches(normalizedNextKey, keyInfo);
            const isPressed = keyMatches(pressedKey?.toLowerCase(), keyInfo);
            const isActive = isTarget || isPressed;
            
            return (
              <motion.div
                key={keyInfo.code}
                animate={{
                  scale: isPressed ? 0.92 : 1,
                  backgroundColor: isActive ? fingerStyle.strong : fingerStyle.soft,
                  borderColor: isTarget ? fingerStyle.strong : fingerStyle.border,
                  boxShadow: isTarget ? `0 12px 26px ${fingerStyle.shadow}` : (isNext ? `0 0 0 2px ${fingerStyle.border}` : '0 0 0 rgba(0, 0, 0, 0)'),
                  color: isActive ? '#ffffff' : fingerStyle.text,
                  y: isPressed ? 2 : 0,
                }}
                className={`
                  relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-75
                  ${compact ? 'w-10 h-10' : 'w-12 h-12'}
                  ${isTarget ? 'z-10 font-black' : 'font-bold'}
                `}
                title={fingerStyle.label}
              >
                {/* Finger Indicator Dot */}
                {!isTarget && !isPressed && (
                  <div
                    className={`absolute top-1 rounded-full opacity-70 transition-opacity ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`}
                    style={{ backgroundColor: fingerStyle.base }}
                  />
                )}

                {keyInfo.shiftKey && (
                  <span className={`absolute top-0.5 right-1 text-[8px] font-black ${isTarget ? 'text-white/70' : 'opacity-50'}`}>
                    {keyInfo.shiftKey}
                  </span>
                ) }
                <span className={`uppercase tracking-tighter ${compact ? 'text-base' : 'text-lg'}`}>{keyInfo.key}</span>
              </motion.div>
            );
          })}
        </div>
      ))}
      
      {/* Spacebar */}
      <div className={`flex justify-center ${compact ? 'mt-1 ml-12' : 'mt-2 ml-16'}`}>
        <motion.div
           animate={{
            scale: pressedKey === ' ' ? 0.98 : 1,
            backgroundColor: pressedKey === ' ' || activeKey === ' ' ? FINGER_STYLES[5].strong : FINGER_STYLES[5].soft,
            borderColor: activeKey === ' ' ? FINGER_STYLES[5].strong : FINGER_STYLES[5].border,
            boxShadow: activeKey === ' ' ? `0 12px 26px ${FINGER_STYLES[5].shadow}` : '0 0 0 rgba(0, 0, 0, 0)',
            y: pressedKey === ' ' ? 2 : 0,
          }}
          className={`
            rounded-xl border-2 flex items-center justify-center relative transition-all
            ${compact ? 'w-72 h-9' : 'w-80 h-11'}
          `}
          title={FINGER_STYLES[5].label}
        >
           {activeKey === ' ' && (
              <motion.div 
                layoutId="bakery-dot"
                className="absolute -bottom-6 w-2 h-2 rounded-full shadow-sm"
                style={{ backgroundColor: FINGER_STYLES[5].strong }}
              />
            )}
        </motion.div>
      </div>
    </div>
  );
};
