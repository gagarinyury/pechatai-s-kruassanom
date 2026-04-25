/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { FINGER_STYLES } from '../constants';

interface HandsGuideProps {
  activeFinger?: number; // 0-9
  compact?: boolean;
}

export const HandsGuide: React.FC<HandsGuideProps> = ({ activeFinger, compact = false }) => {
  const getFingerFill = (finger: number) => {
    const style = FINGER_STYLES[finger];
    return activeFinger === finger ? style.strong : style.soft;
  };

  const getFingerStroke = (finger: number) => {
    const style = FINGER_STYLES[finger];
    return activeFinger === finger ? style.strong : style.border;
  };

  return (
    <div className={`flex justify-center items-end opacity-80 pointer-events-none ${compact ? 'gap-10 h-20' : 'gap-16 h-32'}`}>
      {/* Left Hand */}
      <svg width={compact ? 88 : 120} height={compact ? 74 : 100} viewBox="0 0 120 100" className="transition-all duration-300">
        {/* Pinky (0) */}
        <motion.rect animate={{ scaleY: activeFinger === 0 ? 1.2 : 1, fill: getFingerFill(0), stroke: getFingerStroke(0) }} x="10" y="40" width="12" height="40" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        {/* Ring (1) */}
        <motion.rect animate={{ scaleY: activeFinger === 1 ? 1.2 : 1, fill: getFingerFill(1), stroke: getFingerStroke(1) }} x="28" y="25" width="12" height="55" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        {/* Middle (2) */}
        <motion.rect animate={{ scaleY: activeFinger === 2 ? 1.2 : 1, fill: getFingerFill(2), stroke: getFingerStroke(2) }} x="46" y="15" width="12" height="65" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        {/* Index (3) */}
        <motion.rect animate={{ scaleY: activeFinger === 3 ? 1.2 : 1, fill: getFingerFill(3), stroke: getFingerStroke(3) }} x="64" y="20" width="12" height="60" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        {/* Thumb (4) */}
        <motion.rect animate={{ rotate: -30, scale: activeFinger === 4 ? 1.14 : 1, fill: getFingerFill(4), stroke: getFingerStroke(4) }} x="82" y="60" width="12" height="30" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        <rect x="10" y="80" width="70" height="15" rx="4" fill="#fff7ed" stroke="#fed7aa" strokeWidth="2" />
      </svg>

      {/* Right Hand */}
      <svg width={compact ? 88 : 120} height={compact ? 74 : 100} viewBox="0 0 120 100" className="transition-all duration-300">
        {/* Thumb (5) */}
        <motion.rect animate={{ rotate: 30, scale: activeFinger === 5 ? 1.14 : 1, fill: getFingerFill(5), stroke: getFingerStroke(5) }} x="26" y="60" width="12" height="30" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        {/* Index (6) */}
        <motion.rect animate={{ scaleY: activeFinger === 6 ? 1.2 : 1, fill: getFingerFill(6), stroke: getFingerStroke(6) }} x="44" y="20" width="12" height="60" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        {/* Middle (7) */}
        <motion.rect animate={{ scaleY: activeFinger === 7 ? 1.2 : 1, fill: getFingerFill(7), stroke: getFingerStroke(7) }} x="62" y="15" width="12" height="65" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        {/* Ring (8) */}
        <motion.rect animate={{ scaleY: activeFinger === 8 ? 1.2 : 1, fill: getFingerFill(8), stroke: getFingerStroke(8) }} x="80" y="25" width="12" height="55" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        {/* Pinky (9) */}
        <motion.rect animate={{ scaleY: activeFinger === 9 ? 1.2 : 1, fill: getFingerFill(9), stroke: getFingerStroke(9) }} x="98" y="40" width="12" height="40" rx="6" strokeWidth="2" style={{ transformOrigin: 'center bottom', transformBox: 'fill-box' }} />
        <rect x="40" y="80" width="70" height="15" rx="4" fill="#fff7ed" stroke="#fed7aa" strokeWidth="2" />
      </svg>
    </div>
  );
};
