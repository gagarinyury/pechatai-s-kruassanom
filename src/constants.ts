/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KeyInfo {
  key: string;
  code: string;
  row: number;
  finger: number; // 0-9 (from left pinky to right pinky)
  shiftKey?: string;
}

export interface FingerStyle {
  label: string;
  soft: string;
  base: string;
  strong: string;
  border: string;
  text: string;
  shadow: string;
}

export const RUSSIAN_LAYOUT: KeyInfo[][] = [
  [
    { key: 'ё', code: 'Backquote', row: 0, finger: 0 },
    { key: '1', shiftKey: '!', code: 'Digit1', row: 0, finger: 0 },
    { key: '2', shiftKey: '"', code: 'Digit2', row: 0, finger: 1 },
    { key: '3', shiftKey: '№', code: 'Digit3', row: 0, finger: 2 },
    { key: '4', shiftKey: ';', code: 'Digit4', row: 0, finger: 3 },
    { key: '5', shiftKey: '%', code: 'Digit5', row: 0, finger: 3 },
    { key: '6', shiftKey: ':', code: 'Digit6', row: 0, finger: 6 },
    { key: '7', shiftKey: '?', code: 'Digit7', row: 0, finger: 6 },
    { key: '8', shiftKey: '*', code: 'Digit8', row: 0, finger: 7 },
    { key: '9', shiftKey: '(', code: 'Digit9', row: 0, finger: 8 },
    { key: '0', shiftKey: ')', code: 'Digit0', row: 0, finger: 9 },
    { key: '-', shiftKey: '_', code: 'Minus', row: 0, finger: 9 },
    { key: '=', shiftKey: '+', code: 'Equal', row: 0, finger: 9 },
  ],
  [
    { key: 'й', code: 'KeyQ', row: 1, finger: 0 },
    { key: 'ц', code: 'KeyW', row: 1, finger: 1 },
    { key: 'у', code: 'KeyE', row: 1, finger: 2 },
    { key: 'к', code: 'KeyR', row: 1, finger: 3 },
    { key: 'е', code: 'KeyT', row: 1, finger: 3 },
    { key: 'н', code: 'KeyY', row: 1, finger: 6 },
    { key: 'г', code: 'KeyU', row: 1, finger: 6 },
    { key: 'ш', code: 'KeyI', row: 1, finger: 7 },
    { key: 'щ', code: 'KeyO', row: 1, finger: 8 },
    { key: 'з', code: 'KeyP', row: 1, finger: 9 },
    { key: 'х', code: 'BracketLeft', row: 1, finger: 9 },
    { key: 'ъ', code: 'BracketRight', row: 1, finger: 9 },
  ],
  [
    { key: 'ф', code: 'KeyA', row: 2, finger: 0 },
    { key: 'ы', code: 'KeyS', row: 2, finger: 1 },
    { key: 'в', code: 'KeyD', row: 2, finger: 2 },
    { key: 'а', code: 'KeyF', row: 2, finger: 3 },
    { key: 'п', code: 'KeyG', row: 2, finger: 3 },
    { key: 'р', code: 'KeyH', row: 2, finger: 6 },
    { key: 'о', code: 'KeyJ', row: 2, finger: 6 },
    { key: 'л', code: 'KeyK', row: 2, finger: 7 },
    { key: 'д', code: 'KeyL', row: 2, finger: 8 },
    { key: 'ж', code: 'Semicolon', row: 2, finger: 9 },
    { key: 'э', code: 'Quote', row: 2, finger: 9 },
  ],
  [
    { key: 'я', code: 'KeyZ', row: 3, finger: 0 },
    { key: 'ч', code: 'KeyX', row: 3, finger: 1 },
    { key: 'с', code: 'KeyC', row: 3, finger: 2 },
    { key: 'м', code: 'KeyV', row: 3, finger: 3 },
    { key: 'и', code: 'KeyB', row: 3, finger: 3 },
    { key: 'т', code: 'KeyN', row: 3, finger: 6 },
    { key: 'ь', code: 'KeyM', row: 3, finger: 6 },
    { key: 'б', code: 'Comma', row: 3, finger: 7 },
    { key: 'ю', code: 'Period', row: 3, finger: 8 },
    { key: '.', shiftKey: ',', code: 'Slash', row: 3, finger: 9 },
  ],
];

export const FINGER_STYLES: Record<number, FingerStyle> = {
  0: {
    label: 'Левый мизинец',
    soft: '#fff1f2',
    base: '#fb7185',
    strong: '#e11d48',
    border: '#fecdd3',
    text: '#881337',
    shadow: 'rgba(225, 29, 72, 0.2)',
  },
  1: {
    label: 'Левый безымянный',
    soft: '#fff7ed',
    base: '#fb923c',
    strong: '#ea580c',
    border: '#fed7aa',
    text: '#7c2d12',
    shadow: 'rgba(234, 88, 12, 0.2)',
  },
  2: {
    label: 'Левый средний',
    soft: '#fefce8',
    base: '#facc15',
    strong: '#ca8a04',
    border: '#fde68a',
    text: '#713f12',
    shadow: 'rgba(202, 138, 4, 0.22)',
  },
  3: {
    label: 'Левый указательный',
    soft: '#ecfdf5',
    base: '#34d399',
    strong: '#059669',
    border: '#a7f3d0',
    text: '#064e3b',
    shadow: 'rgba(5, 150, 105, 0.2)',
  },
  4: {
    label: 'Левый большой',
    soft: '#f8fafc',
    base: '#94a3b8',
    strong: '#475569',
    border: '#cbd5e1',
    text: '#1e293b',
    shadow: 'rgba(71, 85, 105, 0.2)',
  },
  5: {
    label: 'Правый большой',
    soft: '#f0f9ff',
    base: '#38bdf8',
    strong: '#0284c7',
    border: '#bae6fd',
    text: '#0c4a6e',
    shadow: 'rgba(2, 132, 199, 0.2)',
  },
  6: {
    label: 'Правый указательный',
    soft: '#f0fdfa',
    base: '#2dd4bf',
    strong: '#0f766e',
    border: '#99f6e4',
    text: '#134e4a',
    shadow: 'rgba(15, 118, 110, 0.2)',
  },
  7: {
    label: 'Правый средний',
    soft: '#eef2ff',
    base: '#818cf8',
    strong: '#4f46e5',
    border: '#c7d2fe',
    text: '#312e81',
    shadow: 'rgba(79, 70, 229, 0.2)',
  },
  8: {
    label: 'Правый безымянный',
    soft: '#f5f3ff',
    base: '#a78bfa',
    strong: '#7c3aed',
    border: '#ddd6fe',
    text: '#4c1d95',
    shadow: 'rgba(124, 58, 237, 0.2)',
  },
  9: {
    label: 'Правый мизинец',
    soft: '#fdf2f8',
    base: '#f472b6',
    strong: '#db2777',
    border: '#fbcfe8',
    text: '#831843',
    shadow: 'rgba(219, 39, 119, 0.2)',
  },
};
