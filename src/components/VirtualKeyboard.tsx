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
}

export const VirtualKeyboard: React.FC<KeyboardProps> = ({ activeKey, nextKey, pressedKey }) => {
  const normalizedActiveKey = activeKey?.toLowerCase();
  const normalizedNextKey = nextKey?.toLowerCase();

  const keyMatches = (value: string | undefined, keyInfo: KeyInfo) => {
    if (!value) return false;
    return value === keyInfo.key.toLowerCase() || value === keyInfo.shiftKey?.toLowerCase();
  };

  return (
    <div className="flex flex-col gap-1.5 p-6 bg-white dark:bg-stone-900 rounded-3xl border-2 border-bakery-100 dark:border-stone-800 shadow-xl overflow-hidden select-none w-full max-w-4xl transition-all duration-300">
      {RUSSIAN_LAYOUT.map((row, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex gap-1.5 justify-center" 
          style={{ marginLeft: `${rowIndex * 1.2}rem` }}
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
                  relative w-12 h-12 flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-75
                  ${isTarget ? 'z-10 font-black' : 'font-bold'}
                `}
                title={fingerStyle.label}
              >
                {/* Finger Indicator Dot */}
                {!isTarget && !isPressed && (
                  <div
                    className="absolute top-1 w-1.5 h-1.5 rounded-full opacity-70 transition-opacity"
                    style={{ backgroundColor: fingerStyle.base }}
                  />
                )}

                {keyInfo.shiftKey && (
                  <span className={`absolute top-0.5 right-1 text-[8px] font-black ${isTarget ? 'text-white/70' : 'opacity-50'}`}>
                    {keyInfo.shiftKey}
                  </span>
                ) }
                <span className="uppercase text-lg tracking-tighter">{keyInfo.key}</span>
              </motion.div>
            );
          })}
        </div>
      ))}
      
      {/* Spacebar */}
      <div className="flex justify-center mt-2 ml-16">
        <motion.div
           animate={{
            scale: pressedKey === ' ' ? 0.98 : 1,
            backgroundColor: pressedKey === ' ' || activeKey === ' ' ? FINGER_STYLES[5].strong : FINGER_STYLES[5].soft,
            borderColor: activeKey === ' ' ? FINGER_STYLES[5].strong : FINGER_STYLES[5].border,
            boxShadow: activeKey === ' ' ? `0 12px 26px ${FINGER_STYLES[5].shadow}` : '0 0 0 rgba(0, 0, 0, 0)',
            y: pressedKey === ' ' ? 2 : 0,
          }}
          className={`
            w-80 h-11 rounded-xl border-2 flex items-center justify-center relative transition-all
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
