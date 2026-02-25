'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import './draw.css';

// Types
import {
  AsciiBlock,
  Shape,
  DrawMode,
  Turn,
  HumanStroke,
  HumanAsciiChar,
  DrawingElement,
  Point,
  CanvasBackground,
  Tool,
  UploadedImage,
  Comment as DrawComment,
} from './types';

// Constants
import {
  ASCII_CHARS,
  COLOR_PALETTES,
  DEFAULT_STROKE_SIZE,
  DEFAULT_GRID_SIZE,
  DEFAULT_DOT_SIZE,
  DEFAULT_PROMPT,
  AUTO_DRAW_DELAY,
  AUTO_DRAW_MIN_INTERVAL,
  DEFAULT_PAN_SENSITIVITY,
  DEFAULT_ZOOM_SENSITIVITY,
  DRAG_THRESHOLD,
  LOCALSTORAGE_DEBOUNCE_MS,
} from './constants';

// Storage key for localStorage persistence
const CANVAS_STORAGE_KEY = 'draw-canvas-state';

// Fallback loading messages (turn 1 only, before Claude has generated custom ones)
const FALLBACK_LOADING_MESSAGES = [
  'Contemplating ~ pixels . _~',
  'Calibrating imagination . o O @',
  'Negotiating with colors . . .',
  'Warming up creativity * * ~~-->',
  'Downloading inspiration _ / | \\ _',
];

// Toggle to disable custom cursors globally (set to false to disable)
const CUSTOM_CURSORS_ENABLED = true;

// Build a CSS cursor value that matches the custom cursor for each mode.
// Works around a Chrome compositor bug that ignores cursor:none in the top ~35px
// of the viewport — by providing a real cursor image, Chrome shows the correct
// cursor instead of the default arrow in that zone.
// Hotspot coords (where the functional click-point is within the cursor image):
const CSS_CURSOR_HOTSPOTS: Record<CursorMode, [number, number]> = {
  user: [3, 3],
  pointer: [10, 2],
  grab: [11, 5],
  grabbing: [11, 10],
  pencil: [3, 3],
  eraser: [3, 3],
  ascii: [8, 8],
  comment: [3, 21],
};

// SVG filter for drop shadow matching the original CSS: drop-shadow(0px 0.5px 2px rgba(0,0,0,0.25))
const SVG_SHADOW_FILTER = '<defs><filter id="ds" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="0.5" stdDeviation="1" flood-color="black" flood-opacity="0.25"/></filter></defs>';
// Padding added around each SVG to make room for the shadow (must match filter region)
const SHADOW_PAD = 4;

// Wraps SVG path content with shadow filter and expanded viewBox
function cursorSvg(w: number, h: number, paths: string): string {
  const nw = w + SHADOW_PAD * 2;
  const nh = h + SHADOW_PAD * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${nw}" height="${nh}" viewBox="${-SHADOW_PAD} ${-SHADOW_PAD} ${nw} ${nh}" fill="none">${SVG_SHADOW_FILTER}<g filter="url(#ds)">${paths}</g></svg>`;
}

// Raw path content for each cursor mode (no wrapping <svg>)
const CURSOR_PATHS: Record<Exclude<CursorMode, 'pencil'>, string> = {
  eraser: '<path fill="#fff" d="m21.093 16.463-3.882 3.88a2.25 2.25 0 0 1-3.182 0L2.905 9.22a2.25 2.25 0 0 1 0-3.182c.505-.504 1.49-1.461 2.208-2.155a3 3 0 0 1 2.043-.84l2.23-.028a3 3 0 0 1 1.968.702c.5.418 1.022.851.954.784-3.435-3.424 8.785 8.78 8.785 8.78a2.25 2.25 0 0 1 0 3.182"/><path fill="#febed4" d="m21.093 16.463-3.882 3.88a2.25 2.25 0 0 1-3.182 0L2.905 9.22a2.25 2.25 0 0 1 0-3.182c.505-.504 1.49-1.461 2.208-2.155a3 3 0 0 1 2.043-.84l2.23-.028a3 3 0 0 1 1.968.702c.5.418 1.022.851.954.784-3.435-3.424 8.785 8.78 8.785 8.78a2.25 2.25 0 0 1 0 3.182"/><path stroke="white" stroke-width="1.25" d="M15.62 21.503c.73 0 1.429-.29 1.944-.806l3.882-3.88a2.75 2.75 0 0 0 0-3.89l-.353.354.352-.354-.002-.002-.006-.007-.026-.026-.483-.483-1.338-1.336-3.824-3.82-3.069-3.066-.005-.008c-.013-.016-.026-.028-.03-.033l-.469-.467-.109-.108-.027-.027-.01-.01-.004-.003-.01-.01a1 1 0 0 0-.244-.093l-.114-.096a3.5 3.5 0 0 0-2.296-.818l-2.23.028a3.5 3.5 0 0 0-2.383.98c-.717.693-1.706 1.654-2.214 2.162a2.75 2.75 0 0 0 0 3.889l11.124 11.124a2.75 2.75 0 0 0 1.944.806Z"/><path fill="#000" d="m21.093 16.463-3.882 3.88a2.25 2.25 0 0 1-3.182 0L2.905 9.22a2.25 2.25 0 0 1 0-3.182c.505-.504 1.49-1.461 2.208-2.155a3 3 0 0 1 2.043-.84l2.23-.028a3 3 0 0 1 1.968.702c.5.418 1.022.851.954.784-3.435-3.424 8.785 8.78 8.785 8.78a2.25 2.25 0 0 1 0 3.182M10.773 5.084A2 2 0 0 0 9.36 4.5H7.394a2 2 0 0 0-1.414.586L3.967 7.099a.75.75 0 0 0 0 1.06l2.91 2.91 4.94-4.94zm9.258 9.259-7.153-7.155-4.94 4.94 7.155 7.152a.75.75 0 0 0 1.06 0l3.88-3.88a.75.75 0 0 0 0-1.06z"/>',
  user: '<path d="M18.0058 16.7114L17.0444 17.6728C16.9599 17.7575 16.8596 17.8248 16.7491 17.8706C16.6386 17.9165 16.5201 17.9401 16.4004 17.9401C16.2808 17.9401 16.1623 17.9165 16.0518 17.8706C15.9413 17.8248 15.8409 17.7575 15.7565 17.6728L11.4708 13.3871L10.0139 17.1871L10.0041 17.2121C9.91118 17.4285 9.75672 17.6127 9.55991 17.7419C9.3631 17.8711 9.13264 17.9395 8.89723 17.9387H8.83813C8.5927 17.9284 8.35634 17.8429 8.16108 17.6939C7.96582 17.5448 7.82107 17.3394 7.74644 17.1053L3.7865 4.97777C3.71705 4.76556 3.70776 4.53826 3.75965 4.32108C3.81154 4.10391 3.9226 3.90536 4.08048 3.74748C4.23837 3.58959 4.43692 3.47853 4.65409 3.42664C4.87127 3.37475 5.09857 3.38404 5.31078 3.4535L17.4383 7.41343C17.6701 7.49097 17.873 7.63676 18.0205 7.83168C18.1679 8.0266 18.253 8.26154 18.2646 8.50568C18.2761 8.74982 18.2136 8.99174 18.0852 9.19971C17.9568 9.40768 17.7686 9.57199 17.5452 9.67106L17.5201 9.68091L13.7201 11.1408L18.0058 15.4257C18.1762 15.5962 18.272 15.8275 18.272 16.0686C18.272 16.3097 18.1762 16.5409 18.0058 16.7114Z" fill="black"/><path d="M4.53809 2.94043C4.84494 2.86714 5.16596 2.88045 5.46582 2.97852L17.5938 6.93848L17.5967 6.93945C17.9241 7.04897 18.2107 7.25495 18.4189 7.53027C18.6272 7.8056 18.7474 8.13758 18.7637 8.48242C18.7799 8.827 18.6919 9.16834 18.5107 9.46191C18.3294 9.75559 18.0635 9.98797 17.748 10.1279L17.7383 10.1328L17.7285 10.1367L17.7031 10.1465L17.6992 10.1475L14.6172 11.3311L18.3594 15.0723C18.6235 15.3365 18.7724 15.6948 18.7725 16.0684C18.7725 16.4419 18.6235 16.8002 18.3594 17.0645L17.3975 18.0264C17.2667 18.1573 17.1113 18.2611 16.9404 18.332C16.7692 18.4031 16.5858 18.4404 16.4004 18.4404C16.215 18.4404 16.0316 18.4031 15.8604 18.332C15.6894 18.2611 15.5341 18.1573 15.4033 18.0264L11.6611 14.2842L10.4805 17.3662L10.4795 17.3701L10.4697 17.3955L10.4639 17.4092C10.3323 17.7156 10.1128 17.9771 9.83398 18.1602C9.5558 18.3427 9.23014 18.4383 8.89746 18.4375V18.4385H8.81738C8.46958 18.4239 8.13414 18.303 7.85742 18.0918C7.5817 17.8813 7.37758 17.5909 7.27148 17.2607L3.31152 5.13281C3.21346 4.83295 3.20015 4.51194 3.27344 4.20508C3.3468 3.89804 3.50334 3.61677 3.72656 3.39355C3.94978 3.17034 4.23105 3.0138 4.53809 2.94043Z" stroke="white" stroke-width="1.25"/>',
  pointer: '<path d="M16.3091 8.125C15.9448 8.1246 15.5862 8.21566 15.2662 8.38984C15.1705 8.09357 15.0127 7.82113 14.8032 7.59075C14.5938 7.36036 14.3376 7.17734 14.0518 7.05391C13.7659 6.93048 13.4571 6.86949 13.1458 6.87501C12.8345 6.88053 12.5279 6.95244 12.2467 7.08594V4.6875C12.2467 4.10734 12.0162 3.55094 11.6059 3.1407C11.1957 2.73047 10.6393 2.5 10.0592 2.5C9.47899 2.5 8.92259 2.73047 8.51235 3.1407C8.10212 3.55094 7.87165 4.10734 7.87165 4.6875V10.9375L7.57321 10.4586C7.42891 10.2101 7.23707 9.99238 7.00865 9.81798C6.78022 9.64358 6.51968 9.51588 6.2419 9.44218C5.6809 9.29332 5.08375 9.37342 4.58181 9.66484C4.07986 9.95627 3.71425 10.4352 3.56539 10.9962C3.41653 11.5572 3.49663 12.1543 3.78806 12.6562L4.1529 13.2992C6.84118 18.0383 7.95368 20 11.6217 20C13.4444 19.9979 15.1919 19.2729 16.4807 17.9841C17.7696 16.6952 18.4946 14.9477 18.4966 13.125V10.3125C18.4966 9.73234 18.2662 9.17594 17.8559 8.7657C17.4457 8.35547 16.8893 8.125 16.3091 8.125Z" fill="white"/><path d="M10.0596 2C10.7722 2.00011 11.4561 2.2832 11.96 2.78711C12.4638 3.29109 12.7471 3.97483 12.7471 4.6875V6.41113C12.8756 6.38992 13.0058 6.37733 13.1367 6.375C13.5192 6.36821 13.8988 6.4431 14.25 6.59473C14.6012 6.74637 14.9156 6.97184 15.1729 7.25488C15.3084 7.40403 15.4259 7.56763 15.5244 7.74219C15.7779 7.66469 16.0425 7.62472 16.3096 7.625L16.5752 7.6377C17.1903 7.69885 17.769 7.97119 18.21 8.41211C18.7138 8.91609 18.9971 9.59983 18.9971 10.3125V13.126C18.9947 15.081 18.2164 16.9555 16.834 18.3379C15.5378 19.6339 13.8093 20.398 11.9873 20.4902L11.6221 20.5C9.67216 20.5 8.34322 19.9676 7.16504 18.7783C6.03432 17.6369 5.0477 15.8904 3.71777 13.5459L3.35547 12.9072L3.2334 12.6709C2.97729 12.1081 2.92211 11.4711 3.08203 10.8682C3.2649 10.179 3.71443 9.59043 4.33105 9.23242C4.94763 8.87452 5.68103 8.77614 6.37012 8.95898C6.71136 9.04953 7.03189 9.20666 7.3125 9.4209C7.33308 9.43662 7.35198 9.45442 7.37207 9.4707V4.6875L7.38477 4.42188C7.44585 3.80664 7.71818 3.22811 8.15918 2.78711C8.66316 2.28324 9.3469 2 10.0596 2Z" stroke="white" stroke-width="1.25"/><path d="M16.3091 8.125C15.9448 8.1246 15.5862 8.21566 15.2662 8.38984C15.1705 8.09357 15.0127 7.82113 14.8032 7.59075C14.5938 7.36036 14.3376 7.17734 14.0518 7.05391C13.7659 6.93048 13.4571 6.86949 13.1458 6.87501C12.8345 6.88053 12.5279 6.95244 12.2467 7.08594V4.6875C12.2467 4.10734 12.0162 3.55094 11.6059 3.1407C11.1957 2.73047 10.6393 2.5 10.0592 2.5C9.47899 2.5 8.92259 2.73047 8.51235 3.1407C8.10212 3.55094 7.87165 4.10734 7.87165 4.6875V10.9375L7.57321 10.4586C7.42891 10.2101 7.23707 9.99238 7.00865 9.81798C6.78022 9.64358 6.51968 9.51588 6.2419 9.44218C5.6809 9.29332 5.08375 9.37342 4.58181 9.66484C4.07986 9.95627 3.71425 10.4352 3.56539 10.9962C3.41653 11.5572 3.49663 12.1543 3.78806 12.6562L4.1529 13.2992C6.84118 18.0383 7.95368 20 11.6217 20C13.4444 19.9979 15.1919 19.2729 16.4807 17.9841C17.7696 16.6952 18.4946 14.9477 18.4966 13.125V10.3125C18.4966 9.73234 18.2662 9.17594 17.8559 8.7657C17.4457 8.35547 16.8893 8.125 16.3091 8.125ZM17.2466 13.125C17.245 14.6163 16.6518 16.0461 15.5973 17.1006C14.5428 18.1552 13.113 18.7483 11.6217 18.75C8.68181 18.75 7.88415 17.3438 5.2404 12.6813L4.87399 12.0352V12.0312C4.74959 11.8161 4.71566 11.5605 4.77968 11.3204C4.8437 11.0803 5.00042 10.8754 5.2154 10.7508C5.3578 10.6683 5.51958 10.6252 5.68415 10.6258C5.84895 10.6255 6.0109 10.6687 6.15368 10.751C6.29647 10.8333 6.41503 10.9518 6.49743 11.0945C6.50061 11.1008 6.50427 11.1068 6.50837 11.1125L7.96696 13.4563C8.03895 13.5712 8.14637 13.6596 8.27301 13.7081C8.39965 13.7566 8.53863 13.7627 8.669 13.7253C8.79936 13.6879 8.91402 13.6091 8.99567 13.5008C9.07732 13.3925 9.12154 13.2606 9.12165 13.125V4.6875C9.12165 4.43886 9.22042 4.2004 9.39624 4.02459C9.57205 3.84877 9.81051 3.75 10.0592 3.75C10.3078 3.75 10.5462 3.84877 10.7221 4.02459C10.8979 4.2004 10.9967 4.43886 10.9967 4.6875V10C10.9967 10.1658 11.0625 10.3247 11.1797 10.4419C11.2969 10.5592 11.4559 10.625 11.6217 10.625C11.7874 10.625 11.9464 10.5592 12.0636 10.4419C12.1808 10.3247 12.2467 10.1658 12.2467 10V9.0625C12.2467 8.81386 12.3454 8.5754 12.5212 8.39959C12.6971 8.22377 12.9355 8.125 13.1842 8.125C13.4328 8.125 13.6712 8.22377 13.8471 8.39959C14.0229 8.5754 14.1216 8.81386 14.1216 9.0625V10.625C14.1216 10.7908 14.1875 10.9497 14.3047 11.0669C14.4219 11.1842 14.5809 11.25 14.7466 11.25C14.9124 11.25 15.0714 11.1842 15.1886 11.0669C15.3058 10.9497 15.3716 10.7908 15.3716 10.625V10.3125C15.3716 10.0639 15.4704 9.8254 15.6462 9.64959C15.8221 9.47377 16.0605 9.375 16.3091 9.375C16.5578 9.375 16.7962 9.47377 16.9721 9.64959C17.1479 9.8254 17.2466 10.0639 17.2466 10.3125V13.125Z" fill="black"/>',
  grab: '<path d="M15.8161 5.00083C15.4917 5.00038 15.1714 5.07273 14.8786 5.21255V4.68833C14.8788 4.16697 14.6928 3.66267 14.3541 3.26633C14.0154 2.86998 13.5462 2.60765 13.0312 2.5266C12.5162 2.44555 11.9891 2.55112 11.545 2.82428C11.101 3.09744 10.769 3.52023 10.6091 4.01646C10.276 3.83577 9.90163 3.74473 9.52274 3.75225C9.14384 3.75976 8.7734 3.86559 8.4477 4.05935C8.12201 4.25311 7.85225 4.52816 7.66484 4.85755C7.47743 5.18694 7.37881 5.55936 7.37864 5.93833V10.9383L7.0802 10.4594C6.79033 9.95919 6.3142 9.59405 5.7559 9.44382C5.19761 9.29359 4.60254 9.37049 4.10077 9.65772C3.59901 9.94494 3.23135 10.4191 3.07818 10.9766C2.925 11.5341 2.99876 12.1296 3.28332 12.6329C4.53332 15.2711 5.54348 17.1422 6.69895 18.3118C7.86614 19.4961 9.19114 20.0008 11.1286 20.0008C12.9514 19.9988 14.6988 19.2738 15.9877 17.9849C17.2766 16.696 18.0016 14.9486 18.0036 13.1258V7.18833C18.0036 6.60817 17.7732 6.05177 17.3629 5.64154C16.9527 5.2313 16.3963 5.00083 15.8161 5.00083Z" fill="white" stroke="white" stroke-width="2.5" stroke-linejoin="round"/><path d="M15.8161 5.00083C15.4917 5.00038 15.1714 5.07273 14.8786 5.21255V4.68833C14.8788 4.16697 14.6928 3.66267 14.3541 3.26633C14.0154 2.86998 13.5462 2.60765 13.0312 2.5266C12.5162 2.44555 11.9891 2.55112 11.545 2.82428C11.101 3.09744 10.769 3.52023 10.6091 4.01646C10.276 3.83577 9.90163 3.74473 9.52274 3.75225C9.14384 3.75976 8.7734 3.86559 8.4477 4.05935C8.12201 4.25311 7.85225 4.52816 7.66484 4.85755C7.47743 5.18694 7.37881 5.55936 7.37864 5.93833V10.9383L7.0802 10.4594C6.79033 9.95919 6.3142 9.59405 5.7559 9.44382C5.19761 9.29359 4.60254 9.37049 4.10077 9.65772C3.59901 9.94494 3.23135 10.4191 3.07818 10.9766C2.925 11.5341 2.99876 12.1296 3.28332 12.6329C4.53332 15.2711 5.54348 17.1422 6.69895 18.3118C7.86614 19.4961 9.19114 20.0008 11.1286 20.0008C12.9514 19.9988 14.6988 19.2738 15.9877 17.9849C17.2766 16.696 18.0016 14.9486 18.0036 13.1258V7.18833C18.0036 6.60817 17.7732 6.05177 17.3629 5.64154C16.9527 5.2313 16.3963 5.00083 15.8161 5.00083ZM16.7536 13.1258C16.752 14.6172 16.1588 16.0469 15.1043 17.1015C14.0498 18.156 12.62 18.7492 11.1286 18.7508C9.53645 18.7508 8.51067 18.3696 7.58723 17.4344C6.55364 16.3868 5.60207 14.6102 4.40207 12.0774C4.39504 12.0619 4.38722 12.0468 4.37864 12.0321C4.25432 11.8167 4.22065 11.5608 4.28504 11.3205C4.34943 11.0803 4.50661 10.8755 4.722 10.7512C4.93738 10.6269 5.19333 10.5932 5.43354 10.6576C5.67375 10.722 5.87853 10.8792 6.00285 11.0946C6.00604 11.1008 6.00969 11.1069 6.01379 11.1126L7.47239 13.4563C7.54404 13.5719 7.65145 13.661 7.77833 13.71C7.9052 13.7591 8.04461 13.7654 8.17539 13.728C8.30618 13.6906 8.42119 13.6116 8.50299 13.5029C8.58479 13.3942 8.6289 13.2619 8.62864 13.1258V5.93833C8.62864 5.68969 8.72741 5.45124 8.90322 5.27542C9.07904 5.09961 9.3175 5.00083 9.56614 5.00083C9.81478 5.00083 10.0532 5.09961 10.229 5.27542C10.4049 5.45124 10.5036 5.68969 10.5036 5.93833V10.6258C10.5036 10.7916 10.5695 10.9506 10.6867 11.0678C10.8039 11.185 10.9629 11.2508 11.1286 11.2508C11.2944 11.2508 11.4534 11.185 11.5706 11.0678C11.6878 10.9506 11.7536 10.7916 11.7536 10.6258V4.68833C11.7536 4.43969 11.8524 4.20124 12.0282 4.02542C12.204 3.84961 12.4425 3.75083 12.6911 3.75083C12.9398 3.75083 13.1782 3.84961 13.354 4.02542C13.5299 4.20124 13.6286 4.43969 13.6286 4.68833V10.6258C13.6286 10.7916 13.6945 10.9506 13.8117 11.0678C13.9289 11.185 14.0879 11.2508 14.2536 11.2508C14.4194 11.2508 14.5784 11.185 14.6956 11.0678C14.8128 10.9506 14.8786 10.7916 14.8786 10.6258V7.18833C14.8786 6.93969 14.9774 6.70124 15.1532 6.52542C15.329 6.34961 15.5675 6.25083 15.8161 6.25083C16.0648 6.25083 16.3032 6.34961 16.479 6.52542C16.6549 6.70124 16.7536 6.93969 16.7536 7.18833V13.1258Z" fill="black"/>',
  grabbing: '<path d="M15.6875 7.25008C15.3228 7.24955 14.9638 7.3409 14.6438 7.5157C14.5281 7.15744 14.3219 6.83509 14.0452 6.57984C13.7685 6.32458 13.4306 6.14506 13.0642 6.05864C12.6978 5.97223 12.3153 5.98183 11.9536 6.08654C11.592 6.19124 11.2636 6.3875 11 6.65633C10.6959 6.34592 10.3062 6.13313 9.88059 6.0451C9.45502 5.95708 9.01288 5.9978 8.61056 6.16209C8.20823 6.32637 7.86395 6.60676 7.62163 6.96751C7.37931 7.32825 7.24994 7.753 7.25 8.18758V9.75008H6.3125C5.73234 9.75008 5.17594 9.98054 4.7657 10.3908C4.35547 10.801 4.125 11.3574 4.125 11.9376V12.8751C4.125 14.6984 4.84933 16.4471 6.13864 17.7364C7.42795 19.0257 9.17664 19.7501 11 19.7501C12.8234 19.7501 14.572 19.0257 15.8614 17.7364C17.1507 16.4471 17.875 14.6984 17.875 12.8751V9.43758C17.875 8.85741 17.6445 8.30102 17.2343 7.89078C16.8241 7.48054 16.2677 7.25008 15.6875 7.25008Z" fill="white"/><path d="M8.42188 5.69897C8.91593 5.49732 9.45886 5.44741 9.98145 5.55542C10.3498 5.6316 10.6958 5.78506 10.999 6.00171C11.2456 5.82539 11.5211 5.69115 11.8145 5.6062C12.2586 5.47759 12.7286 5.46591 13.1787 5.57202C13.6288 5.67818 14.0438 5.89909 14.3838 6.21265C14.5906 6.40343 14.7652 6.62474 14.9023 6.86792C15.1559 6.79027 15.4203 6.74944 15.6875 6.74976C16.4002 6.74976 17.0839 7.03296 17.5879 7.53687C18.0918 8.04079 18.3749 8.7246 18.375 9.43726V12.8748C18.375 14.8307 17.5978 16.7065 16.2148 18.0896C14.8318 19.4727 12.956 20.2498 11 20.2498C9.04403 20.2498 7.16824 19.4727 5.78516 18.0896C4.40218 16.7065 3.625 14.8307 3.625 12.8748V11.9373C3.62508 11.2246 3.90818 10.5408 4.41211 10.0369C4.9161 9.53296 5.59981 9.24976 6.3125 9.24976H6.75V8.18726C6.75 7.65349 6.9094 7.13133 7.20703 6.68823C7.50472 6.24529 7.92779 5.90073 8.42188 5.69897Z" stroke="white" stroke-width="1.25"/><path d="M15.6875 7.25008C15.3228 7.24955 14.9638 7.3409 14.6438 7.5157C14.5281 7.15744 14.3219 6.83509 14.0452 6.57984C13.7685 6.32458 13.4306 6.14506 13.0642 6.05864C12.6978 5.97223 12.3153 5.98183 11.9536 6.08654C11.592 6.19124 11.2636 6.3875 11 6.65633C10.6959 6.34592 10.3062 6.13313 9.88059 6.0451C9.45502 5.95708 9.01288 5.9978 8.61056 6.16209C8.20823 6.32637 7.86395 6.60676 7.62163 6.96751C7.37931 7.32825 7.24994 7.753 7.25 8.18758V9.75008H6.3125C5.73234 9.75008 5.17594 9.98054 4.7657 10.3908C4.35547 10.801 4.125 11.3574 4.125 11.9376V12.8751C4.125 14.6984 4.84933 16.4471 6.13864 17.7364C7.42795 19.0257 9.17664 19.7501 11 19.7501C12.8234 19.7501 14.572 19.0257 15.8614 17.7364C17.1507 16.4471 17.875 14.6984 17.875 12.8751V9.43758C17.875 8.85741 17.6445 8.30102 17.2343 7.89078C16.8241 7.48054 16.2677 7.25008 15.6875 7.25008ZM16.625 12.8751C16.625 14.3669 16.0324 15.7977 14.9775 16.8526C13.9226 17.9074 12.4918 18.5001 11 18.5001C9.50816 18.5001 8.07742 17.9074 7.02252 16.8526C5.96763 15.7977 5.375 14.3669 5.375 12.8751V11.9376C5.375 11.6889 5.47377 11.4505 5.64959 11.2747C5.8254 11.0988 6.06386 11.0001 6.3125 11.0001H7.25V12.8751C7.25 13.0408 7.31585 13.1998 7.43306 13.317C7.55027 13.4342 7.70924 13.5001 7.875 13.5001C8.04076 13.5001 8.19973 13.4342 8.31694 13.317C8.43415 13.1998 8.5 13.0408 8.5 12.8751V8.18758C8.5 7.93894 8.59877 7.70048 8.77459 7.52466C8.9504 7.34885 9.18886 7.25008 9.4375 7.25008C9.68614 7.25008 9.9246 7.34885 10.1004 7.52466C10.2762 7.70048 10.375 7.93894 10.375 8.18758V10.3751C10.375 10.5408 10.4408 10.6998 10.5581 10.817C10.6753 10.9342 10.8342 11.0001 11 11.0001C11.1658 11.0001 11.3247 10.9342 11.4419 10.817C11.5592 10.6998 11.625 10.5408 11.625 10.3751V8.18758C11.625 7.93894 11.7238 7.70048 11.8996 7.52466C12.0754 7.34885 12.3139 7.25008 12.5625 7.25008C12.8111 7.25008 13.0496 7.34885 13.2254 7.52466C13.4012 7.70048 13.5 7.93894 13.5 8.18758V10.3751C13.5 10.5408 13.5658 10.6998 13.6831 10.817C13.8003 10.9342 13.9592 11.0001 14.125 11.0001C14.2908 11.0001 14.4497 10.9342 14.5669 10.817C14.6842 10.6998 14.75 10.5408 14.75 10.3751V9.43758C14.75 9.18894 14.8488 8.95048 15.0246 8.77466C15.2004 8.59885 15.4389 8.50008 15.6875 8.50008C15.9361 8.50008 16.1746 8.59885 16.3504 8.77466C16.5262 8.95048 16.625 9.18894 16.625 9.43758V12.8751Z" fill="black"/>',
  ascii: '<path d="M25.9873 18.5616C26.128 18.7022 26.207 18.893 26.207 19.0919C26.207 19.2908 26.128 19.4816 25.9873 19.6222L24.9267 20.6829C24.515 21.0945 24.0132 21.4047 23.4609 21.5888C22.9086 21.7729 22.321 21.8259 21.7447 21.7435C21.827 22.3199 21.774 22.9074 21.5899 23.4597C21.4058 24.012 21.0957 24.5139 20.684 24.9255L19.6234 25.9862C19.4827 26.1268 19.292 26.2058 19.093 26.2058C18.8941 26.2058 18.7034 26.1268 18.5627 25.9862C18.4221 25.8455 18.343 25.6548 18.343 25.4558C18.343 25.2569 18.4221 25.0662 18.5627 24.9255L19.6234 23.8649C20.0453 23.4429 20.2824 22.8706 20.2824 22.2739C20.2824 21.6771 20.0453 21.1048 19.6234 20.6829L16.9717 18.0312L15.9111 19.0919C15.7704 19.2325 15.5796 19.3116 15.3807 19.3116C15.1818 19.3116 14.9911 19.2325 14.8504 19.0919C14.7098 18.9512 14.6307 18.7605 14.6307 18.5616C14.6307 18.3626 14.7098 18.1719 14.8504 18.0312L15.9111 16.9706L13.2594 14.3189C12.8375 13.897 12.2652 13.6599 11.6684 13.6599C11.0717 13.6599 10.4994 13.897 10.0774 14.3189L9.01677 15.3796C8.87612 15.5202 8.68535 15.5992 8.48644 15.5992C8.28753 15.5992 8.09676 15.5202 7.95611 15.3796C7.81546 15.2389 7.73644 15.0482 7.73644 14.8492C7.73644 14.6503 7.81546 14.4596 7.95611 14.3189L9.01677 13.2583C9.42843 12.8466 9.93027 12.5364 10.4826 12.3523C11.0349 12.1682 11.6224 12.1153 12.1988 12.1976C12.1164 11.6213 12.1694 11.0337 12.3535 10.4814C12.5376 9.92911 12.8478 9.42727 13.2594 9.01561L14.3201 7.95495C14.4607 7.8143 14.6515 7.73528 14.8504 7.73528C15.0493 7.73528 15.2401 7.8143 15.3807 7.95495C15.5214 8.0956 15.6004 8.28637 15.6004 8.48528C15.6004 8.68419 15.5214 8.87496 15.3807 9.01561L14.3201 10.0763C13.8981 10.4982 13.6611 11.0705 13.6611 11.6673C13.6611 12.264 13.8981 12.8363 14.3201 13.2583L16.9717 15.9099L18.0324 14.8492C18.173 14.7086 18.3638 14.6296 18.5627 14.6296C18.7616 14.6296 18.9524 14.7086 19.093 14.8492C19.2337 14.9899 19.3127 15.1807 19.3127 15.3796C19.3127 15.5785 19.2337 15.7693 19.093 15.9099L18.0324 16.9706L20.684 19.6222C21.106 20.0442 21.6783 20.2812 22.275 20.2812C22.8718 20.2812 23.4441 20.0442 23.866 19.6222L24.9267 18.5616C25.0673 18.4209 25.2581 18.3419 25.457 18.3419C25.6559 18.3419 25.8467 18.4209 25.9873 18.5616Z" fill="black"/><path d="M8.66322 12.9047L8.84276 12.7348C9.27259 12.3523 9.77647 12.0604 10.324 11.8779C10.7566 11.7337 11.2088 11.6617 11.6622 11.661C11.6629 11.2076 11.7348 10.7554 11.879 10.3228C12.0877 9.69702 12.4394 9.1285 12.9059 8.66206L13.9665 7.6014C14.2009 7.36698 14.5189 7.23542 14.8504 7.23542C15.1819 7.23542 15.4999 7.36698 15.7343 7.6014C15.9687 7.83582 16.1003 8.15376 16.1003 8.48528C16.1003 8.8168 15.9687 9.13475 15.7343 9.36917L14.6736 10.4298C14.3454 10.758 14.1612 11.2031 14.1612 11.6673C14.1612 12.1314 14.3454 12.5765 14.6736 12.9047L16.9717 15.2028L17.6788 14.4957C17.9132 14.2613 18.2312 14.1297 18.5627 14.1297C18.8942 14.1297 19.2122 14.2613 19.4466 14.4957C19.681 14.7301 19.8126 15.0481 19.8126 15.3796C19.8126 15.7111 19.681 16.029 19.4466 16.2635L18.7395 16.9706L21.0376 19.2687L21.166 19.3847C21.4774 19.6399 21.8689 19.781 22.275 19.781C22.7392 19.781 23.1843 19.5968 23.5125 19.2687L24.5731 18.208C24.8075 17.9736 25.1255 17.842 25.457 17.842C25.7885 17.842 26.1065 17.9736 26.3409 18.208C26.5753 18.4424 26.7069 18.7604 26.7069 19.0919C26.7069 19.4234 26.5753 19.7413 26.3409 19.9758L25.2802 21.0364C24.8138 21.5029 24.2453 21.8546 23.6195 22.0633C23.1867 22.2075 22.7342 22.2788 22.2805 22.2794C22.28 22.733 22.2087 23.1855 22.0644 23.6183C21.8557 24.2441 21.504 24.8126 21.0376 25.2791L19.9769 26.3397C19.7425 26.5741 19.4246 26.7057 19.093 26.7057C18.7615 26.7057 18.4436 26.5741 18.2092 26.3397C17.9747 26.1053 17.8432 25.7874 17.8432 25.4558C17.8432 25.1243 17.9747 24.8064 18.2092 24.572L19.2698 23.5113L19.3858 23.3829C19.641 23.0714 19.7822 22.68 19.7822 22.2739C19.7822 21.8097 19.598 21.3646 19.2698 21.0364L16.9717 18.7383L16.2646 19.4454C16.0302 19.6799 15.7123 19.8114 15.3807 19.8114C15.0492 19.8114 14.7313 19.6799 14.4968 19.4454C14.2624 19.211 14.1309 18.8931 14.1309 18.5616C14.1309 18.23 14.2624 17.9121 14.4968 17.6777L15.204 16.9706L12.9059 14.6725C12.5777 14.3443 12.1326 14.1601 11.6684 14.1601C11.2043 14.1601 10.7592 14.3443 10.431 14.6725L9.37032 15.7331C9.1359 15.9675 8.81796 16.0991 8.48644 16.0991C8.15492 16.0991 7.83698 15.9675 7.60256 15.7331C7.36814 15.4987 7.23657 15.1808 7.23657 14.8492C7.23657 14.5177 7.36814 14.1998 7.60256 13.9654L8.66322 12.9047Z" stroke="white" stroke-width="1.25"/>',
  comment: '<path d="M21 11C21 15.9706 16.9706 20 12 20H7C4.79086 20 3 18.2091 3 16V11C3 6.02944 7.02944 2 12 2V2C16.9706 2 21 6.02944 21 11V11Z" fill="black"/><path d="M7 20.5C4.51472 20.5 2.5 18.4853 2.5 16V11C2.5 5.7533 6.7533 1.5 12 1.5C17.2467 1.5 21.5 5.7533 21.5 11C21.5 16.2467 17.2467 20.5 12 20.5H7Z" stroke="white" stroke-width="1.25"/>',
};

// Original SVG dimensions per cursor mode
const CURSOR_DIMS: Record<CursorMode, [number, number]> = {
  user: [22, 22], pointer: [22, 24], grab: [23, 24], grabbing: [22, 24],
  pencil: [24, 24], eraser: [24, 24], ascii: [34, 34], comment: [24, 24],
};

function buildCssCursorValue(mode: CursorMode, strokeColor: string): string {
  const [w, h] = CURSOR_DIMS[mode];
  let paths: string;

  if (mode === 'pencil') {
    paths = `<path d="M19.7845 15.6948L15.9448 19.5353C15.8171 19.663 15.6655 19.7643 15.4987 19.8335C15.3318 19.9026 15.153 19.9382 14.9724 19.9382C14.7918 19.9382 14.613 19.9026 14.4461 19.8335C14.2793 19.7643 14.1277 19.663 14 19.5353L3.40305 8.93751C3.27482 8.81029 3.17315 8.65885 3.10396 8.49199C3.03476 8.32513 2.99943 8.14619 3.00001 7.96555V4.12501C3.00001 3.76034 3.14487 3.4106 3.40274 3.15274C3.6606 2.89487 4.01033 2.75001 4.37501 2.75001H8.21555C8.39619 2.74943 8.57513 2.78477 8.74199 2.85396C8.90885 2.92315 9.06029 3.02482 9.18751 3.15305L19.7845 13.75C19.9122 13.8777 20.0135 14.0293 20.0826 14.1961C20.1517 14.363 20.1873 14.5418 20.1873 14.7224C20.1873 14.903 20.1517 15.0818 20.0826 15.2487C20.0135 15.4155 19.9122 15.5671 19.7845 15.6948Z" fill="${strokeColor}"/><path d="M8.21582 2.25V2.25098C8.46209 2.25044 8.7061 2.29824 8.93359 2.39258C9.16101 2.48692 9.36745 2.62519 9.54102 2.7998L20.1377 13.3965C20.3119 13.5706 20.4507 13.7774 20.5449 14.0049C20.6391 14.2323 20.6875 14.4765 20.6875 14.7227C20.6875 14.9688 20.6391 15.213 20.5449 15.4404C20.4507 15.6679 20.3118 15.8748 20.1377 16.0488L16.2988 19.8887C16.1248 20.0627 15.9177 20.2007 15.6904 20.2949C15.463 20.3891 15.2188 20.4384 14.9727 20.4385C14.7264 20.4385 14.4824 20.3892 14.2549 20.2949C14.0274 20.2007 13.8206 20.0628 13.6465 19.8887L3.0498 9.29102V9.29004C2.87542 9.11658 2.73683 8.9108 2.64258 8.68359C2.548 8.45553 2.49921 8.21077 2.5 7.96387V4.125C2.5 3.62772 2.6972 3.15046 3.04883 2.79883C3.40046 2.4472 3.87772 2.25 4.375 2.25H8.21582Z" stroke="white" stroke-width="1.25"/><path d="M19.7845 15.6947L15.9448 19.5353C15.8171 19.663 15.6655 19.7643 15.4987 19.8334C15.3318 19.9025 15.153 19.9381 14.9724 19.9381C14.7918 19.9381 14.613 19.9025 14.4461 19.8334C14.2793 19.7643 14.1277 19.663 14 19.5353L3.40305 8.93746C3.27482 8.81024 3.17315 8.6588 3.10396 8.49194C3.03476 8.32509 2.99943 8.14614 3.00001 7.96551V4.12496C3.00001 3.76029 3.14487 3.41055 3.40274 3.15269C3.6606 2.89482 4.01033 2.74996 4.37501 2.74996H8.21555C8.39619 2.74938 8.57513 2.78472 8.74199 2.85391C8.90885 2.9231 9.06029 3.02477 9.18751 3.15301L19.7845 13.75C19.9122 13.8776 20.0135 14.0292 20.0826 14.1961C20.1517 14.3629 20.1873 14.5417 20.1873 14.7223C20.1873 14.9029 20.1517 15.0818 20.0826 15.2486C20.0135 15.4154 19.9122 15.567 19.7845 15.6947ZM4.65946 8.24996L11.9375 15.528L13.3718 14.0937L6.09376 6.81652L4.65946 8.24996ZM4.37501 6.59051L6.84055 4.12496H4.37501V6.59051ZM8.50001 4.40941L7.06571 5.84371L14.3438 13.1218L15.7781 11.6875L8.50001 4.40941ZM16.75 12.6594L12.9095 16.5L14.972 18.5625L18.8125 14.7228L16.75 12.6594Z" fill="black"/>`;
  } else {
    paths = CURSOR_PATHS[mode];
  }

  const svg = cursorSvg(w, h, paths);
  const [hx, hy] = CSS_CURSOR_HOTSPOTS[mode];
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx + SHADOW_PAD} ${hy + SHADOW_PAD}, none`;
}

// Hooks
import { useZoomPan } from './hooks/useZoomPan';
import { useComments } from './hooks/useComments';
import { useClaudeAnimation } from './hooks/useClaudeAnimation';
import { useIsMobile } from './hooks/useIsMobile';

// Utils
import { simplifyPath } from './utils/simplifyPath';

// Components
import { DrawToolbar, AnimationType } from './components/DrawToolbar';
import { HeaderActions } from './components/HeaderActions';
import { DrawIconButton } from './components/DrawIconButton';
import { CustomCursor, CursorMode } from './components/CustomCursor';
import { ClaudePencilCursor } from './components/icons/claude-pencil-cursor';
import { ClaudeEraserCursor } from './components/icons/claude-eraser-cursor';
import { ClaudeAsciiCursor } from './components/icons/claude-ascii-cursor';
import { CommentSystem } from './components/CommentSystem';
import { CommentInput } from './components/CommentInput';
import { MobileToolbar, MobileToolbarMode } from './components/MobileToolbar';
import { MobileCommentInput } from './components/MobileCommentInput';
import { MobileCommentMorph } from './components/MobileCommentMorph';
import { ClaudeIcon } from './components/ClaudeIcon';

// Auth components
import { ApiKeyModal, DrawingsPanel } from './components/auth';
import { useUser, useDrawings, useUserSettings } from '@/lib/supabase/hooks';

// BaseUI provider (single instance for all tooltips)
import { BaseUIProvider } from '../components/StyletronProvider';

export default function DrawPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDrawnPoint = useRef<Point | null>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const turbulenceBtnRef = useRef<SVGFETurbulenceElement>(null);

  // Safari detection (client-side only to avoid hydration mismatch)
  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  // Add class to <html> for cursor hiding — avoids expensive :has() re-evaluation
  useEffect(() => {
    document.documentElement.classList.add('draw-active');
    return () => document.documentElement.classList.remove('draw-active');
  }, []);


  // Auth state
  const { user } = useUser();
  const { saveDrawing: saveToCloud } = useDrawings();
  const { settings: userSettings } = useUserSettings();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDrawingsPanel, setShowDrawingsPanel] = useState(false);
  const [currentDrawingId, setCurrentDrawingId] = useState<string | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(FALLBACK_LOADING_MESSAGES[0]);
  const [claudePreview, setClaudePreview] = useState<string[] | null>(null); // whimsical loading messages from Claude's last turn
  const [asciiBlocks, setAsciiBlocks] = useState<AsciiBlock[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [humanStrokes, setHumanStrokes] = useState<HumanStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<HumanStroke | null>(null);
  const [humanAsciiChars, setHumanAsciiChars] = useState<HumanAsciiChar[]>([]);
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const elementIdCounter = useRef(0);

  // Diff tracking for element-based API (saves tokens on non-sync turns)
  const [lastTurnElements, setLastTurnElements] = useState<DrawingElement[]>([]);

  // Image state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageDragOffset = useRef<Point | null>(null);
  const imageIdCounter = useRef(0);
  const lastClaudeCursorColor = useRef('#000');

  // Undo/redo state
  type DrawingSnapshot = {
    drawingElements: DrawingElement[];
    humanStrokes: HumanStroke[];
    humanAsciiChars: HumanAsciiChar[];
  };
  const [undoStack, setUndoStack] = useState<DrawingSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingSnapshot[]>([]);

  // History and state
  const [history, setHistory] = useState<Turn[]>([]);
  const [humanHasDrawn, setHumanHasDrawn] = useState(false);
  const [humanHasCommented, setHumanHasCommented] = useState(false);
  const [wish, setWish] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);

  // Tool state
  const [tool, setTool] = useState<Tool>('draw');
  const [asciiStroke, setAsciiStroke] = useState(false);
  const [strokeSize, setStrokeSize] = useState(DEFAULT_STROKE_SIZE);
  const [strokeColor, setStrokeColor] = useState<string>(COLOR_PALETTES[4][0]);
  const [paletteIndex, setPaletteIndex] = useState(4);

  // Wrap setStrokeColor: switch to pen if currently erasing
  const handleSetStrokeColor = useCallback((color: string) => {
    setStrokeColor(color);
    setTool(prev => prev === 'erase' ? 'draw' : prev);
  }, []);

  // Mobile state
  const { isMobile } = useIsMobile();
  const [mobileToolbarMode, setMobileToolbarMode] = useState<MobileToolbarMode>('tools');
  const [mobileCommentSheetOpen, setMobileCommentSheetOpen] = useState(false);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [sayEnabled, setSayEnabled] = useState(true);
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(768);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [drawMode, setDrawMode] = useState<DrawMode>('all');

  // Auto temperature: 1.0 for first 3 turns, then 0.7
  const getEffectiveTemperature = (turnCount: number): number => {
    return turnCount <= 3 ? 1.0 : 0.7;
  };

  // Thinking panel state
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [showThinkingPanel, setShowThinkingPanel] = useState(true);

  // Claude narration state
  type InteractionStyle = 'collaborative' | 'playful' | 'neutral';
  const [claudeReasoning, setClaudeReasoning] = useState('');
  const [claudeDrawing, setClaudeDrawing] = useState(''); // 3-6 word summary of what Claude is adding
  const [claudeDrawingAsciiColor, setClaudeDrawingAsciiColor] = useState<string | null>(null);
  const [interactionStyle, setInteractionStyle] = useState<InteractionStyle>('neutral');

  // Typewriter effect for header text
  const [displayedHeaderText, setDisplayedHeaderText] = useState("Let's draw together?");
  const headerTextTargetRef = useRef("Let's draw together?");
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  // Typewriter effect for cursor label (loading messages on opus cursor)
  const [displayedCursorLabel, setDisplayedCursorLabel] = useState('');
  const cursorLabelTargetRef = useRef('');
  const cursorLabelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cursorLabelFrameRef = useRef<number | null>(null);

  // Token tracking state
  type TokenUsage = { input_tokens: number; output_tokens: number };
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const [sessionUsage, setSessionUsage] = useState<TokenUsage>({ input_tokens: 0, output_tokens: 0 });

  // Hybrid SVG mode state - reduces token costs by sending images only periodically
  type SyncContext = { observation: string; intention: string; turn: number };
  const [hybridModeEnabled, setHybridModeEnabled] = useState(true); // Enable by default for cost savings
  const [syncInterval, setSyncInterval] = useState(5); // Send image every N turns
  const [lastSyncTurn, setLastSyncTurn] = useState(0);
  const [lastSyncContext, setLastSyncContext] = useState<SyncContext | null>(null);
  const [simplifyEpsilon, setSimplifyEpsilon] = useState(2); // Path simplification tolerance

  // Visual effects state
  const [distortionAmount, setDistortionAmount] = useState(2); // 0-30 range for displacement scale
  const [wiggleSpeed, setWiggleSpeed] = useState(270); // ms between frames (lower = faster)
  const [bounceIntensity, setBounceIntensity] = useState(1.0); // 0-2 range for animation bounce
  // Palette animation settings (fixed values)
  const animationType: AnimationType = 'spring';
  const slideDuration = 700; // ms
  const slideStagger = 30; // ms between each color
  const slideBounce = true; // enable bounce effect

  // Canvas options
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground>('grid');
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [panSensitivity] = useState(DEFAULT_PAN_SENSITIVITY);
  const [zoomSensitivity] = useState(DEFAULT_ZOOM_SENSITIVITY);

  // Cursor tracking — ref-based to avoid re-rendering entire component on every mouse move
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [isHoveringCommentInput, setIsHoveringCommentInput] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isOnCanvas, setIsOnCanvas] = useState(false);

  // Test mode for cursor animation debugging
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1.5); // 0.5x to 3x speed multiplier

  // UI visibility toggles (hidden by default)
  const [showSelectTool, setShowSelectTool] = useState(false);
  const [showReactButton, setShowReactButton] = useState(false);
  const [showDownloadButton, setShowDownloadButton] = useState(false);

  // Prompt is now mood-aware by default (BASE_PROMPT in route.ts)

  // Refs
  const lastPoint = useRef<Point | null>(null);
  const lastAsciiPoint = useRef<Point | null>(null);
  const lastAsciiStrokeRef = useRef(false); // Remember last brush type for comment mode revert

  // Wrapper for setAsciiStroke that also updates the ref (avoids useEffect anti-pattern)
  const handleSetAsciiStroke = useCallback((value: boolean) => {
    setAsciiStroke(value);
    // Only remember when in draw mode (tool check happens at call site)
    lastAsciiStrokeRef.current = value;
  }, []);
  const autoDrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoDrawTimeRef = useRef<number>(0);
  const handleYourTurnRef = useRef<() => void>(() => {});
  const commentDragStart = useRef<Point | null>(null); // Track drag start for comment mode
  const [spaceHeld, setSpaceHeld] = useState(false); // Hold space to pan (Figma-style)



  // Capture the full canvas (background + all drawings) as an image
  // Optimized: scales down large images and uses JPEG for smaller payload
  const captureFullCanvas = useCallback(async (): Promise<string> => {
    const container = containerRef.current;
    if (!container) return '';

    // Find the SVG element
    const svg = container.querySelector('svg');
    if (!svg) return '';

    // Get dimensions and calculate scale (max 1200px on longest side)
    const rect = container.getBoundingClientRect();
    const origWidth = rect.width;
    const origHeight = rect.height;
    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(origWidth, origHeight));
    const width = Math.round(origWidth * scale);
    const height = Math.round(origHeight * scale);

    // Create temp canvas at scaled size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    // Scale context for drawing
    ctx.scale(scale, scale);

    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, origWidth, origHeight);

    // Draw grid/dots pattern if enabled (at original scale, will be scaled by context)
    if (canvasBackground === 'grid') {
      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 1;
      for (let x = 0; x <= origWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, origHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= origHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(origWidth, y);
        ctx.stroke();
      }
    } else if (canvasBackground === 'dots') {
      ctx.fillStyle = '#e5e5e5';
      for (let x = 0; x <= origWidth; x += gridSize) {
        for (let y = 0; y <= origHeight; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Serialize SVG and draw to canvas
    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('width', String(origWidth));
    svgClone.setAttribute('height', String(origHeight));

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(svgUrl);
        // Use JPEG at 0.7 quality for smaller payload (saves ~60% vs PNG)
        resolve(tempCanvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        resolve('');
      };
      img.src = svgUrl;
    });
  }, [canvasBackground, gridSize]);


  // Use custom hooks
  const {
    zoom,
    pan,
    isPanning,
    isTouchGesture,
    startPan,
    doPan,
    stopPan,
    handleTouchStart: handleZoomPanTouchStart,
    handleTouchMove: handleZoomPanTouchMove,
    handleTouchEnd: handleZoomPanTouchEnd,
    handleDoubleClick,
    screenToCanvas,
    canvasToScreen,
  } = useZoomPan({ containerRef, canvasRef, panSensitivity, zoomSensitivity });

  const {
    claudeCursorPos,
    claudeIsDrawing,
    animatingShape,
    animatingAscii,
    enqueueShape,
    enqueueAscii,
    processClaudeAnimationQueue,
    finishClaudeAnimation,
    runTestShapes,
  } = useClaudeAnimation({ animationSpeed, setDrawingElements, setAsciiBlocks, elementIdCounter });

  const {
    comments,
    setComments,
    openCommentIndex,
    setOpenCommentIndex,
    hoveredCommentIndex,
    setHoveredCommentIndex,
    replyingToIndex,
    setReplyingToIndex,
    replyText,
    setReplyText,
    commentInput,
    setCommentInput,
    commentText,
    setCommentText,
    addComment,
    deleteComment,
    addReplyToComment,
    handleCommentCancel,
    saveComment,
    dismissComment,
  } = useComments({ canvasRef, lastDrawnPoint });

  // Reset hover state when comment input closes (form unmounts before onMouseLeave fires)
  useEffect(() => {
    if (!commentInput) setIsHoveringCommentInput(false);
  }, [commentInput]);

  // Compute cursor mode from state — priority order determines which cursor shows
  const cursorMode: CursorMode = (() => {
    if (isTouch) return 'user'; // fallback, cursor hidden on touch anyway
    if (isPanning) return 'grabbing';
    if (spaceHeld) return 'grab';
    if (hoveredCommentIndex !== null || isHoveringCommentInput) return 'user';
    if (isOnCanvas && tool !== 'select') {
      if (tool === 'comment') return 'comment';
      if (tool === 'erase') return 'eraser';
      if (tool === 'draw') return asciiStroke ? 'ascii' : 'pencil';
    }
    if (isHoveringInteractive) return 'pointer';
    return 'user';
  })();

  // Set a matching CSS cursor image on <html> so Chrome's top-of-window bug zone
  // shows the correct cursor instead of the default arrow.
  // The div-based CustomCursor still handles smooth positioning everywhere else.
  useEffect(() => {
    if (!CUSTOM_CURSORS_ENABLED) return;
    const value = buildCssCursorValue(cursorMode, strokeColor);
    document.documentElement.style.setProperty('--draw-cursor', value);
    return () => { document.documentElement.style.removeProperty('--draw-cursor'); };
  }, [cursorMode, strokeColor]);

  // Save current state to undo stack
  const saveToUndoStack = useCallback(() => {
    setUndoStack(prev => [...prev, {
      drawingElements: [...drawingElements],
      humanStrokes: [...humanStrokes],
      humanAsciiChars: [...humanAsciiChars],
    }]);
    setRedoStack([]); // Clear redo stack on new action
  }, [drawingElements, humanStrokes, humanAsciiChars]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    // Save current state to redo stack
    setRedoStack(prev => [...prev, {
      drawingElements: [...drawingElements],
      humanStrokes: [...humanStrokes],
      humanAsciiChars: [...humanAsciiChars],
    }]);

    // Restore previous state
    const previousState = undoStack[undoStack.length - 1];
    setDrawingElements(previousState.drawingElements);
    setHumanStrokes(previousState.humanStrokes);
    setHumanAsciiChars(previousState.humanAsciiChars);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, drawingElements, humanStrokes, humanAsciiChars]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    // Save current state to undo stack
    setUndoStack(prev => [...prev, {
      drawingElements: [...drawingElements],
      humanStrokes: [...humanStrokes],
      humanAsciiChars: [...humanAsciiChars],
    }]);

    // Restore next state
    const nextState = redoStack[redoStack.length - 1];
    setDrawingElements(nextState.drawingElements);
    setHumanStrokes(nextState.humanStrokes);
    setHumanAsciiChars(nextState.humanAsciiChars);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, drawingElements, humanStrokes, humanAsciiChars]);

  // Keyboard shortcuts
  const STROKE_SIZES = [2, 6, 12] as const;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip shortcuts when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      // Ignore key repeats (e.g. holding space)
      if (e.repeat) return;

      const mod = e.metaKey || e.ctrlKey;

      // Undo/Redo: Cmd+Z / Cmd+Shift+Z / Cmd+Y
      if (mod && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
        return;
      }
      if (mod && e.key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Skip remaining shortcuts if modifier held (avoid conflicts)
      if (mod) return;

      // Hold space to pan (Figma-style)
      if (e.key === ' ') {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }

      const key = e.key.toLowerCase();
      switch (key) {
        // Tools: D=draw, A=ascii, E=eraser, C=comment
        case 'd':
          setTool('draw');
          setAsciiStroke(false);
          break;
        case 'a':
          setTool('draw');
          setAsciiStroke(true);
          break;
        case 'e':
          setTool('erase');
          break;
        case 'c':
          setTool('comment');
          break;

        // Stroke size: [ = smaller, ] = bigger
        case '[': {
          const idx = STROKE_SIZES.indexOf(strokeSize as 2 | 6 | 12);
          if (idx > 0) setStrokeSize(STROKE_SIZES[idx - 1]);
          break;
        }
        case ']': {
          const idx = STROKE_SIZES.indexOf(strokeSize as 2 | 6 | 12);
          if (idx < STROKE_SIZES.length - 1) setStrokeSize(STROKE_SIZES[idx + 1]);
          break;
        }

        // Palette: X = cycle to next palette
        case 'x':
          setPaletteIndex((paletteIndex + 1) % COLOR_PALETTES.length);
          setStrokeColor(COLOR_PALETTES[(paletteIndex + 1) % COLOR_PALETTES.length][0]);
          break;

        // Color: 1-4 = pick color from current palette
        case '1': case '2': case '3': case '4': {
          const colorIdx = parseInt(key) - 1;
          setStrokeColor(COLOR_PALETTES[paletteIndex][colorIdx]);
          break;
        }

        // Reset zoom/pan: 0
        case '0':
          handleDoubleClick();
          break;

        default:
          break;
      }

      // Enter: Claude's turn (not lowercased — e.key is 'Enter')
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading) handleYourTurnRef.current();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpaceHeld(false);
        stopPan();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, strokeSize, paletteIndex, isLoading, handleDoubleClick, stopPan]);

  // Cycle through loading messages (Claude-generated from last turn, or fallbacks)
  useEffect(() => {
    const custom = claudePreview && claudePreview.length > 0 ? claudePreview : [];
    // Mix in fallbacks if we have few custom messages to avoid repetition
    const pool = custom.length === 0
      ? FALLBACK_LOADING_MESSAGES
      : custom.length <= 4
        ? [...custom, ...FALLBACK_LOADING_MESSAGES]
        : custom;
    const pickRandom = () => pool[Math.floor(Math.random() * pool.length)];
    if (!isLoading) {
      setLoadingMessage(pickRandom());
      return;
    }
    setLoadingMessage(pickRandom());
    const interval = setInterval(() => {
      setLoadingMessage(pickRandom());
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading, claudePreview]);

  // Typewriter effect for header text
  const typewriterFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Determine target text
    const targetText = isLoading
      ? (claudeDrawing || loadingMessage)
      : (claudeDrawing || "Let's draw together?");

    // If target hasn't changed, do nothing
    if (targetText === headerTextTargetRef.current) return;

    // Cancel any in-flight animation
    if (typewriterFrameRef.current) cancelAnimationFrame(typewriterFrameRef.current);
    if (typewriterRef.current) clearTimeout(typewriterRef.current);

    headerTextTargetRef.current = targetText;

    // Clear old text immediately
    setDisplayedHeaderText('');

    // Defer typewriter start so the clear actually paints first
    typewriterFrameRef.current = requestAnimationFrame(() => {
      const words = targetText.split(' ');
      let currentWordIndex = 1;

      // Show first word
      setDisplayedHeaderText(words[0] || '');

      if (words.length > 1) {
        const showNextWord = () => {
          currentWordIndex++;
          setDisplayedHeaderText(words.slice(0, currentWordIndex).join(' '));

          if (currentWordIndex < words.length) {
            const delay = 50 + Math.random() * 100;
            typewriterRef.current = setTimeout(showNextWord, delay);
          }
        };

        const delay = 50 + Math.random() * 100;
        typewriterRef.current = setTimeout(showNextWord, delay);
      }
    });
  }, [isLoading, claudeDrawing, loadingMessage]);

  // Cursor label: only Claude-generated custom messages (no fallback presets)
  // Cycles through claudePreview with typewriter effect, stays "opus" if no custom messages
  const cursorLabelIndexRef = useRef(0);
  const cursorLabelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Typewriter a single message into displayedCursorLabel
  const typewriteCursorLabel = useCallback((text: string) => {
    if (cursorLabelTimerRef.current) clearTimeout(cursorLabelTimerRef.current);
    if (cursorLabelFrameRef.current) cancelAnimationFrame(cursorLabelFrameRef.current);
    cursorLabelTargetRef.current = text;
    setDisplayedCursorLabel('');

    cursorLabelFrameRef.current = requestAnimationFrame(() => {
      const words = text.split(' ');
      let currentWordIndex = 1;
      setDisplayedCursorLabel(words[0] || '');

      if (words.length > 1) {
        const showNextWord = () => {
          currentWordIndex++;
          setDisplayedCursorLabel(words.slice(0, currentWordIndex).join(' '));
          if (currentWordIndex < words.length) {
            cursorLabelTimerRef.current = setTimeout(showNextWord, 40 + Math.random() * 80);
          }
        };
        cursorLabelTimerRef.current = setTimeout(showNextWord, 40 + Math.random() * 80);
      }
    });
  }, []);

  useEffect(() => {
    const cleanup = () => {
      if (cursorLabelTimerRef.current) clearTimeout(cursorLabelTimerRef.current);
      if (cursorLabelFrameRef.current) cancelAnimationFrame(cursorLabelFrameRef.current);
      if (cursorLabelIntervalRef.current) clearInterval(cursorLabelIntervalRef.current);
    };

    const hasCustom = claudePreview && claudePreview.length > 0;
    // Show label while loading OR while cursor is still animating on screen
    const cursorActive = isLoading || !!claudeCursorPos;

    if (!cursorActive || !hasCustom) {
      cleanup();
      setDisplayedCursorLabel('');
      cursorLabelTargetRef.current = '';
      cursorLabelIndexRef.current = 0;
      return;
    }

    // Start with first custom message
    cursorLabelIndexRef.current = 0;
    typewriteCursorLabel(claudePreview[0]);

    // Cycle through custom messages every 2s
    cursorLabelIntervalRef.current = setInterval(() => {
      cursorLabelIndexRef.current = (cursorLabelIndexRef.current + 1) % claudePreview!.length;
      typewriteCursorLabel(claudePreview![cursorLabelIndexRef.current]);
    }, 2000);

    return cleanup;
  }, [isLoading, claudePreview, claudeCursorPos, typewriteCursorLabel]);

  // Redraw ASCII blocks and shapes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    shapes.forEach((shape) => {
      if (shape.type === 'erase' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
        ctx.clearRect(shape.x, shape.y, shape.width, shape.height);
      }
    });

    // Human ASCII chars and Claude's blocks are now rendered as SVG <text> elements
  }, [shapes]);

  // Set up canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [asciiBlocks, shapes, redraw]);

  // Track tab visibility to pause wiggle when not visible
  const [isTabVisible, setIsTabVisible] = useState(true);
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Wiggle animation - uses direct DOM manipulation to avoid React re-renders
  // Safari: no wiggle animation (just static distortion for performance)
  // Chrome: full wiggle animation
  useEffect(() => {
    if (isSafari || distortionAmount === 0 || !isTabVisible) return;

    let seed = 1;
    const interval = setInterval(() => {
      seed = (seed % 100) + 1;
      turbulenceRef.current?.setAttribute('seed', String(seed));
      turbulenceBtnRef.current?.setAttribute('seed', String(seed));
    }, wiggleSpeed);
    return () => clearInterval(interval);
  }, [distortionAmount, wiggleSpeed, isTabVisible, isSafari]);

  // Set random initial brush color on mount (client-side only to avoid hydration mismatch)
  useEffect(() => {
    const randomPaletteIndex = Math.floor(Math.random() * COLOR_PALETTES.length);
    const palette = COLOR_PALETTES[randomPaletteIndex];
    setPaletteIndex(randomPaletteIndex);
    setStrokeColor(palette[Math.floor(Math.random() * palette.length)]);
  }, []);

  // Load saved canvas state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CANVAS_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.drawingElements) setDrawingElements(state.drawingElements);
        if (state.humanStrokes) setHumanStrokes(state.humanStrokes);
        if (state.humanAsciiChars) setHumanAsciiChars(state.humanAsciiChars);
        if (state.asciiBlocks) setAsciiBlocks(state.asciiBlocks);
        if (state.shapes) setShapes(state.shapes);
        if (state.images) setImages(state.images);
        // Restore ID counters to avoid duplicates
        if (state.elementIdCounter) elementIdCounter.current = state.elementIdCounter;
        if (state.imageIdCounter) imageIdCounter.current = state.imageIdCounter;
      }
    } catch (e) {
      console.error('Failed to load canvas state:', e);
    }
  }, []);

  // Save canvas state to localStorage when it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const baseState = {
        drawingElements,
        humanStrokes,
        humanAsciiChars,
        asciiBlocks,
        shapes,
        elementIdCounter: elementIdCounter.current,
        imageIdCounter: imageIdCounter.current,
      };

      // Try to save with images first
      try {
        const stateWithImages = { ...baseState, images };
        localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(stateWithImages));
      } catch (e) {
        // If quota exceeded, try saving without images (they're large base64 strings)
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded, saving without images');
          try {
            localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(baseState));
          } catch (e2) {
            console.error('Failed to save canvas state even without images:', e2);
          }
        } else {
          console.error('Failed to save canvas state:', e);
        }
      }
    }, LOCALSTORAGE_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [drawingElements, humanStrokes, humanAsciiChars, asciiBlocks, shapes, images]);

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return screenToCanvas(e.touches[0].clientX, e.touches[0].clientY);
    }
    return screenToCanvas(e.clientX, e.clientY);
  }, [screenToCanvas]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Save state for undo before starting a new stroke
    saveToUndoStack();

    setIsDrawing(true);
    setHumanHasDrawn(true);
    const point = getPoint(e);
    lastPoint.current = point;
    lastAsciiPoint.current = point;

    if (tool === 'erase' || tool === 'draw') {
      // Always track the path (needed for API to know where user drew)
      setCurrentStroke({
        d: `M ${point.x} ${point.y}`,
        color: tool === 'erase' ? '#000000' : strokeColor,
        strokeWidth: tool === 'erase' ? strokeSize * 5 : strokeSize,
        isAsciiBacking: asciiStroke, // Mark ASCII backing strokes so we don't render them
        isEraser: tool === 'erase',
      });
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPoint.current) return;

    const point = getPoint(e);
    if (!point) return;

    if (tool === 'erase' || tool === 'draw') {
      // Always update the path (needed for API)
      setCurrentStroke(prev => prev ? {
        ...prev,
        d: `${prev.d} L ${point.x} ${point.y}`,
      } : null);
    }

    // Place ASCII chars if in ASCII mode
    if (asciiStroke) {
      const charSpacing = Math.max(8, strokeSize * 4);
      const lastAscii = lastAsciiPoint.current!;
      const dx = point.x - lastAscii.x;
      const dy = point.y - lastAscii.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= charSpacing) {
        const fontSize = Math.max(10, strokeSize * 5);
        const char = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
        setHumanAsciiChars(prev => [...prev, {
          char,
          x: point.x - strokeSize,
          y: point.y + strokeSize,
          color: strokeColor,
          fontSize,
        }]);
        lastAsciiPoint.current = { x: point.x, y: point.y };
      }
    }

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    if (lastPoint.current) {
      lastDrawnPoint.current = { ...lastPoint.current };
    }
    if (currentStroke && !currentStroke.d.includes('L')) {
      // Single click with no movement - add a tiny segment to make a dot
      currentStroke.d += ` L ${lastPoint.current!.x + 0.1} ${lastPoint.current!.y + 0.1}`;
    }
    if (currentStroke && currentStroke.d.includes('L')) {
      setHumanStrokes(prev => [...prev, currentStroke]);
      const id = `human-${elementIdCounter.current++}`;
      setDrawingElements(prev => [...prev, {
        id,
        source: 'human',
        type: 'stroke',
        data: currentStroke,
      }]);
    }
    setCurrentStroke(null);
    setIsDrawing(false);
    lastPoint.current = null;
    if (autoDrawEnabled && humanHasDrawn) {
      triggerAutoDraw();
    }
  };

  // Compute diff for element-based API (diff-only format)
  type TrackedElement = {
    id: string;
    source: 'human' | 'claude';
    type: 'stroke' | 'shape' | 'block';
    d?: string;
    shapeType?: string;
    color?: string;
    fill?: string;
    strokeWidth?: number;
    cx?: number;
    cy?: number;
    r?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    block?: string;
    turnCreated: number;
  };

  type ElementDiff = {
    created: TrackedElement[];
    modified: { id: string; changes: Partial<TrackedElement> }[];
    deleted: string[];
  };

  const computeDiff = useCallback((currentTurn: number): { elements: TrackedElement[]; diff: ElementDiff } => {
    const lastIds = new Set(lastTurnElements.map(e => e.id));

    // Convert DrawingElements to TrackedElements with simplified paths
    const elements: TrackedElement[] = drawingElements
      .filter(e => e.source === 'human' && e.type === 'stroke')
      .map(e => {
        const stroke = e.data as HumanStroke;
        return {
          id: e.id,
          source: 'human' as const,
          type: 'stroke' as const,
          d: simplifyPath(stroke.d, simplifyEpsilon), // Simplify for token efficiency
          color: stroke.color,
          strokeWidth: stroke.strokeWidth,
          turnCreated: currentTurn,
        };
      });

    // Find newly created elements (in current but not in last turn)
    const created = elements.filter(e => !lastIds.has(e.id));

    // Find deleted elements (in last turn but not in current)
    const currentIds = new Set(elements.map(e => e.id));
    const deleted = lastTurnElements
      .filter(e => e.source === 'human' && !currentIds.has(e.id))
      .map(e => e.id);

    return {
      elements,
      diff: { created, modified: [], deleted },
    };
  }, [drawingElements, lastTurnElements, simplifyEpsilon]);

  // Helper: returns true if we should handle drawing events
  // Either we're in a drawing tool mode OR we're actively mid-stroke
  const shouldHandleDrawing = useCallback(() => {
    return (tool !== 'comment' && tool !== 'select') || isDrawing;
  }, [tool, isDrawing]);

  const handleYourTurn = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsLoading(true);
    if (thinkingEnabled) {
      setThinkingText('');
    }
    // Clear previous narration
    setClaudeReasoning('');
    setClaudeDrawing('');
    setClaudeDrawingAsciiColor(null);

    const newHistory = [...history];
    if (humanHasDrawn || humanHasCommented) {
      newHistory.push({ who: 'human' });
    }

    // Calculate current turn number for hybrid mode
    const currentTurnNumber = newHistory.filter(t => t.who === 'claude').length + 1;

    // Determine if this is a sync turn (send image) for hybrid mode
    // Sync on: turn 1, or every syncInterval turns after last sync
    const isSyncTurn = currentTurnNumber === 1 || (currentTurnNumber - lastSyncTurn) >= syncInterval;
    if (isSyncTurn && hybridModeEnabled) {
      setLastSyncTurn(currentTurnNumber);
    }

    const streamedBlocks: AsciiBlock[] = [];
    const streamedShapes: Shape[] = [];
    let claudeCommented = false;
    // Track streaming comment target
    let streamingCommentIndex: number | null = null;
    let streamingReplyTarget: number | null = null; // Index of comment being replied to


    try {
      // Capture the full canvas with all drawings (human + Claude)
      const image = await captureFullCanvas();
      if (!image) {
        throw new Error('Failed to capture canvas');
      }
      // Use user's tool selection to determine Claude's draw mode
      // When user uses pen, Claude gets all tools (shapes + ASCII)
      const effectiveDrawMode = asciiStroke ? 'ascii' : 'all';
      const container = containerRef.current;
      const containerRect = container?.getBoundingClientRect();

      let response: Response;

      if (hybridModeEnabled) {
        // HYBRID MODE: Use merged /api/draw with element tracking
        // Compute diff to only send new strokes (saves ~18% tokens on non-sync turns)
        const { elements, diff } = computeDiff(currentTurnNumber);

        // Save current elements for next turn's diff computation
        setLastTurnElements(drawingElements.filter(e => e.source === 'human'));

        response = await fetch('/api/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Element tracking params
            elements,
            diff: diff.created.length > 0 || diff.deleted.length > 0 ? diff : undefined,
            format: 'diff-only',
            // Image only on sync turns
            image: isSyncTurn ? image : undefined,
            // Standard draw params
            canvasWidth: containerRect?.width || canvas.width,
            canvasHeight: containerRect?.height || canvas.height,
            history: newHistory,
            comments: comments.length > 0 ? comments : undefined,
            sayEnabled,
            temperature: getEffectiveTemperature(newHistory.length),
            turnCount: currentTurnNumber,
            maxTokens,
            prompt: prompt !== DEFAULT_PROMPT ? prompt : undefined,
            streaming: true,
            drawMode: effectiveDrawMode,
            thinkingEnabled,
            thinkingBudget: 10000,
            model: 'opus',
            paletteColors: COLOR_PALETTES[paletteIndex],
            paletteIndex,
            totalPalettes: COLOR_PALETTES.length,
            userApiKey: userSettings?.anthropic_api_key || undefined,
          }),
        });
      } else {
        // ORIGINAL MODE: Send image every turn
        response = await fetch('/api/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            canvasWidth: containerRect?.width || canvas.width,
            canvasHeight: containerRect?.height || canvas.height,
            history: newHistory,
            comments: comments.length > 0 ? comments : undefined,
            sayEnabled,
            temperature: getEffectiveTemperature(newHistory.length),
            turnCount: newHistory.length,
            maxTokens,
            prompt: prompt !== DEFAULT_PROMPT ? prompt : undefined,
            streaming: true,
            drawMode: effectiveDrawMode,
            thinkingEnabled,
            thinkingBudget: 10000,
            model: 'opus',
            paletteColors: COLOR_PALETTES[paletteIndex],
            paletteIndex,
            totalPalettes: COLOR_PALETTES.length,
            userApiKey: userSettings?.anthropic_api_key || undefined,
          }),
        });
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Draw API error (${response.status}):`, errorBody);
        throw new Error(`Failed to get response (${response.status}): ${errorBody}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'thinking') {
                setThinkingText((prev) => prev + event.data);
              } else if (event.type === 'narration') {
                // Streaming text narration from Claude (observation, intention, interactionStyle as prose)
                // This is displayed in real-time, structured fields are parsed at the end
                setClaudeReasoning((prev) => (prev || '') + event.data);
              } else if (event.type === 'block') {
                // Queue ASCII block for cursor animation
                streamedBlocks.push(event.data);
                enqueueAscii(event.data as AsciiBlock);
                processClaudeAnimationQueue();
              } else if (event.type === 'shape') {
                // Don't add to shapes immediately - let animation reveal it
                streamedShapes.push(event.data);
                // Queue shape for cursor animation with progressive reveal
                // Shape will be added to drawingElements after animation completes
                enqueueShape(event.data as Shape);
                processClaudeAnimationQueue();
              } else if (event.type === 'say') {
                // Full comment from tool call
                if (event.data.replyTo) {
                  // Reply to existing comment
                  const commentIndex = event.data.replyTo - 1;
                  if (commentIndex >= 0 && commentIndex < comments.length) {
                    addReplyToComment(commentIndex, event.data.text, 'claude');
                    claudeCommented = true;
                  }
                } else if (event.data.sayX !== undefined && event.data.sayY !== undefined) {
                  // New comment at position
                  addComment(event.data.text, 'claude', event.data.sayX, event.data.sayY);
                  claudeCommented = true;
                }
              } else if (event.type === 'sayStart') {
                // Streaming: create comment with empty text and track index
                setComments((prev) => {
                  streamingCommentIndex = prev.length;
                  streamingReplyTarget = null;
                  return [...prev, { text: '', x: event.data.sayX, y: event.data.sayY, from: 'claude' as const }];
                });
                // Auto-open the new comment
                setOpenCommentIndex(comments.length);
                claudeCommented = true;
              } else if (event.type === 'replyStart') {
                // Streaming: create empty reply
                const commentIndex = event.data.replyTo - 1;
                if (commentIndex >= 0) {
                  setComments((prev) => {
                    if (commentIndex >= prev.length) return prev;
                    streamingReplyTarget = commentIndex;
                    streamingCommentIndex = null;
                    const updated = [...prev];
                    updated[commentIndex] = {
                      ...updated[commentIndex],
                      replies: [...(updated[commentIndex].replies || []), { text: '', from: 'claude' as const }]
                    };
                    return updated;
                  });
                  claudeCommented = true;
                }
              } else if (event.type === 'sayChunk') {
                // Streaming: append text to the tracked target
                setComments((prev) => {
                  const updated = [...prev];
                  if (streamingReplyTarget !== null && streamingReplyTarget < updated.length) {
                    // Appending to a reply
                    const comment = updated[streamingReplyTarget];
                    if (comment.replies && comment.replies.length > 0) {
                      const lastReply = comment.replies[comment.replies.length - 1];
                      updated[streamingReplyTarget] = {
                        ...comment,
                        replies: [
                          ...comment.replies.slice(0, -1),
                          { ...lastReply, text: lastReply.text + event.data.text }
                        ]
                      };
                    }
                  } else if (streamingCommentIndex !== null && streamingCommentIndex < updated.length) {
                    // Appending to a new comment
                    updated[streamingCommentIndex] = {
                      ...updated[streamingCommentIndex],
                      text: updated[streamingCommentIndex].text + event.data.text
                    };
                  }
                  return updated;
                });
              } else if (event.type === 'reply') {
                // Legacy: full reply at once
                const commentIndex = event.data.replyTo - 1;
                if (commentIndex >= 0 && commentIndex < comments.length) {
                  addReplyToComment(commentIndex, event.data.text, 'claude');
                  claudeCommented = true;
                }
              } else if (event.type === 'dismiss') {
                // Claude dismissed a comment (1-indexed)
                const commentIndex = event.data.index - 1;
                if (commentIndex >= 0) {
                  dismissComment(commentIndex);
                }
              } else if (event.type === 'wish') {
                setWish(event.data);
                console.log('claude wishes:', event.data);
              } else if (event.type === 'setPalette') {
                // Claude wants to change the palette - trigger animation
                const newIndex = event.data;
                if (typeof newIndex === 'number' && newIndex >= 0 && newIndex < COLOR_PALETTES.length) {
                  setPaletteIndex(newIndex);
                  setStrokeColor(COLOR_PALETTES[newIndex][0]);
                }
              } else if (event.type === 'reasoning') {
                // Claude's thinking process (without API thinking)
                setClaudeReasoning(event.data);
              } else if (event.type === 'drawing') {
                // 3-6 word summary of what Claude is adding
                console.log('[DEBUG] drawing event received:', event.data);
                setClaudeDrawing(event.data);
              } else if (event.type === 'drawingAsciiColor') {
                console.log('[DEBUG] asciiColor event received:', event.data);
                setClaudeDrawingAsciiColor(event.data);
              } else if (event.type === 'interactionStyle') {
                // Detected interaction style (collaborative, playful, neutral)
                setInteractionStyle(event.data);
              } else if (event.type === 'preview') {
                // Next-turn loading message teaser from Claude
                setClaudePreview(event.data);
              } else if (event.type === 'usage') {
                // Track token usage (sent as separate event from API)
                setLastUsage({ input_tokens: event.input_tokens, output_tokens: event.output_tokens });
                setSessionUsage(prev => ({
                  input_tokens: prev.input_tokens + (event.input_tokens || 0),
                  output_tokens: prev.output_tokens + (event.output_tokens || 0),
                }));
              } else if (event.type === 'done') {
                // Done event - usage already handled above
                let description = '';
                if (streamedBlocks.length > 0) {
                  description += streamedBlocks.map((b) => b.block).join('\n---\n');
                }
                if (streamedShapes.length > 0) {
                  const shapeDesc = streamedShapes.map((s) => `${s.type}`).join(', ');
                  description += (description ? '\n' : '') + `[shapes: ${shapeDesc}]`;
                }
                if (claudeCommented) {
                  description += (description ? '\n' : '') + '[commented]';
                }
                // Record turn if Claude did anything (drew or commented)
                if (description) {
                  newHistory.push({
                    who: 'claude',
                    description,
                    // Include actual shapes/blocks for continuity (used in interaction style detection)
                    shapes: streamedShapes.length > 0 ? [...streamedShapes] : undefined,
                    blocks: streamedBlocks.length > 0 ? [...streamedBlocks] : undefined,
                  });
                  setHistory(newHistory);
                  setHumanHasDrawn(false);
                  setHumanHasCommented(false);
                }


                // Stream complete - hide cursor after animations finish
                finishClaudeAnimation();
              } else if (event.type === 'error') {
                console.error('Stream error:', event.message);
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError);
            }
          }
        }
      }

      setPendingMessages([]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  handleYourTurnRef.current = handleYourTurn;

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAsciiBlocks([]);
    setShapes([]);
    setHumanStrokes([]);
    setHumanAsciiChars([]);
    setCurrentStroke(null);
    setComments([]);
    setHistory([]);
    setHumanHasDrawn(false);
    setWish(null);
    setDrawingElements([]);
    setThinkingText('');
    setClaudePreview(null);
    setImages([]);
    setSelectedImageId(null);
    lastDrawnPoint.current = null;
    // Clear localStorage
    localStorage.removeItem(CANVAS_STORAGE_KEY);
    localStorage.removeItem('draw-comments');
    // Reset ID counters
    elementIdCounter.current = 0;
    imageIdCounter.current = 0;
    // Reset hybrid mode state
    setLastSyncTurn(0);
    setLastSyncContext(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // Save drawing to cloud
  const handleSaveToCloud = async (name: string, existingId?: string) => {
    const thumbnail = await captureFullCanvas();
    const data = {
      drawingElements,
      comments,
      history,
      paletteIndex,
      strokeColor,
    };
    await saveToCloud(name, data, thumbnail || undefined, existingId);
    if (existingId) {
      setCurrentDrawingId(existingId);
    }
  };

  // Load drawing from cloud
  const handleLoadFromCloud = (data: Record<string, unknown>) => {
    if (data.drawingElements) {
      setDrawingElements(data.drawingElements as DrawingElement[]);
    }
    if (data.comments) {
      setComments(data.comments as typeof comments);
    }
    if (data.history) {
      setHistory(data.history as Turn[]);
    }
    if (typeof data.paletteIndex === 'number') {
      setPaletteIndex(data.paletteIndex);
    }
    if (typeof data.strokeColor === 'string') {
      setStrokeColor(data.strokeColor);
    }
    // Clear other state
    setHumanStrokes([]);
    setHumanAsciiChars([]);
    setAsciiBlocks([]);
    setShapes([]);
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // If there's an open comment, just close it and don't do anything else
    if (openCommentIndex !== null) {
      setOpenCommentIndex(null);
      setReplyingToIndex(null);
      return;
    }

    // If there's a comment input open, just close it and don't do anything else
    if (commentInput !== null) {
      setCommentInput(null);
      setCommentText('');
      return;
    }

    // If hovering a comment, clear hover and don't do anything else
    if (hoveredCommentIndex !== null) {
      setHoveredCommentIndex(null);
      return;
    }

    // Only create new comment input if in comment mode
    if (tool !== 'comment') return;
    const point = getPoint(e);
    if (!point) return;
    setCommentInput({ x: point.x, y: point.y });
    setCommentText('');
  }, [openCommentIndex, commentInput, hoveredCommentIndex, tool, getPoint]);

  const triggerAutoDraw = useCallback(() => {
    if (autoDrawTimeoutRef.current) {
      clearTimeout(autoDrawTimeoutRef.current);
    }
    // Check minimum interval since last auto-draw
    const timeSinceLastAutoDraw = Date.now() - lastAutoDrawTimeRef.current;
    if (timeSinceLastAutoDraw < AUTO_DRAW_MIN_INTERVAL) {
      return; // Too soon, don't trigger
    }
    autoDrawTimeoutRef.current = setTimeout(() => {
      lastAutoDrawTimeRef.current = Date.now();
      handleYourTurnRef.current();
    }, AUTO_DRAW_DELAY);
  }, []);

  // Lightweight comment-only API call — no canvas capture by default.
  // If Claude signals needsCanvas, a second call is made with the image + draw tool.
  // Accepts optional updatedComments to avoid stale closure (React state not yet updated)
  const handleCommentResponse = useCallback(async (updatedComments?: DrawComment[]) => {
    const commentsToSend = updatedComments || comments;
    let streamingTarget: number | null = null;
    let needsCanvas = false;

    try {
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentOnly: true,
          canvasWidth: containerRef.current?.getBoundingClientRect().width || 800,
          canvasHeight: containerRef.current?.getBoundingClientRect().height || 600,
          history: history.length > 0 ? history : undefined,
          comments: commentsToSend.length > 0 ? commentsToSend : undefined,
          streaming: true,
          model: 'opus',
          userApiKey: userSettings?.anthropic_api_key || undefined,
        }),
      });

      if (!response.ok) return;
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'replyStart') {
              let targetIdx: number | undefined;
              if (event.data.replyTo) {
                targetIdx = event.data.replyTo - 1;
              } else if (event.data.replyToLast) {
                targetIdx = commentsToSend.map((c, i) => ({ c, i })).filter(({ c }) => c.from === 'human').pop()?.i;
              }
              if (targetIdx !== undefined && targetIdx >= 0) {
                streamingTarget = targetIdx;
                setComments((prev) => {
                  if (targetIdx >= prev.length) return prev;
                  const updated = [...prev];
                  updated[targetIdx] = {
                    ...updated[targetIdx],
                    replies: [...(updated[targetIdx].replies || []), { text: '', from: 'claude' as const }],
                    status: 'temp',
                    tempStartedAt: Date.now(),
                  };
                  return updated;
                });
                setOpenCommentIndex(targetIdx);
              }
            } else if (event.type === 'sayChunk' && streamingTarget !== null) {
              const target = streamingTarget;
              setComments((prev) => {
                if (target >= prev.length) return prev;
                const comment = prev[target];
                if (!comment.replies || comment.replies.length === 0) return prev;
                const lastReply = comment.replies[comment.replies.length - 1];
                const updated = [...prev];
                updated[target] = {
                  ...comment,
                  replies: [
                    ...comment.replies.slice(0, -1),
                    { ...lastReply, text: lastReply.text + event.data.text },
                  ],
                };
                return updated;
              });
            } else if (event.type === 'say') {
              if (event.data.replyTo) {
                const commentIndex = event.data.replyTo - 1;
                if (commentIndex >= 0) {
                  addReplyToComment(commentIndex, event.data.text, 'claude');
                  setOpenCommentIndex(commentIndex);
                }
              } else if (event.data.replyToLast) {
                const lastHumanIdx = commentsToSend.map((c, i) => ({ c, i })).filter(({ c }) => c.from === 'human').pop()?.i;
                if (lastHumanIdx !== undefined) {
                  addReplyToComment(lastHumanIdx, event.data.text, 'claude');
                  setOpenCommentIndex(lastHumanIdx);
                }
              } else if (event.data.sayX !== undefined && event.data.sayY !== undefined) {
                addComment(event.data.text, 'claude', event.data.sayX, event.data.sayY);
              }
            } else if (event.type === 'dismiss') {
              const commentIndex = event.data.index - 1;
              if (commentIndex >= 0) {
                dismissComment(commentIndex);
              }
            } else if (event.type === 'needsCanvas') {
              needsCanvas = true;
            }
          } catch { /* skip parse errors */ }
        }
      }

      // Second call: Claude requested the canvas — capture image and call with draw tool
      if (needsCanvas) {
        handleCommentDrawResponse(commentsToSend);
      }
    } catch (error) {
      console.error('Comment response error:', error);
    }
  }, [history, comments, userSettings, addComment, addReplyToComment, setOpenCommentIndex, setComments, dismissComment]);

  // Second-stage call: comment triggered drawing — captures canvas and sends with draw tool
  const handleCommentDrawResponse = useCallback(async (commentsToSend: DrawComment[]) => {
    const streamedShapes: Shape[] = [];
    const streamedBlocks: AsciiBlock[] = [];

    const image = await captureFullCanvas();
    if (!image) return;

    const container = containerRef.current;
    const containerRect = container?.getBoundingClientRect();
    setIsLoading(true);

    try {
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentOnly: true,
          image,
          canvasWidth: containerRect?.width || 800,
          canvasHeight: containerRect?.height || 600,
          history: history.length > 0 ? history : undefined,
          comments: commentsToSend.length > 0 ? commentsToSend : undefined,
          sayEnabled: true,
          streaming: true,
          model: 'opus',
          paletteColors: COLOR_PALETTES[paletteIndex],
          paletteIndex,
          totalPalettes: COLOR_PALETTES.length,
          turnCount: history.filter(t => t.who === 'claude').length + 1,
          userApiKey: userSettings?.anthropic_api_key || undefined,
        }),
      });

      if (!response.ok) { setIsLoading(false); return; }
      const reader = response.body?.getReader();
      if (!reader) { setIsLoading(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'shape') {
              streamedShapes.push(event.data);
              enqueueShape(event.data as Shape);
              processClaudeAnimationQueue();
            } else if (event.type === 'block') {
              streamedBlocks.push(event.data);
              enqueueAscii(event.data as AsciiBlock);
              processClaudeAnimationQueue();
            } else if (event.type === 'say' && event.data.text) {
              if (event.data.replyTo) {
                addReplyToComment(event.data.replyTo - 1, event.data.text, 'claude');
              } else if (event.data.sayX !== undefined) {
                addComment(event.data.text, 'claude', event.data.sayX, event.data.sayY);
              }
            } else if (event.type === 'dismiss') {
              const commentIndex = event.data.index - 1;
              if (commentIndex >= 0) dismissComment(commentIndex);
            } else if (event.type === 'drawing') {
              setClaudeDrawing(event.data);
            } else if (event.type === 'done') {
              if (streamedShapes.length > 0 || streamedBlocks.length > 0) {
                setHistory(prev => [...prev, {
                  who: 'claude' as const,
                  description: '[comment-triggered drawing]',
                  shapes: streamedShapes.length > 0 ? [...streamedShapes] : undefined,
                  blocks: streamedBlocks.length > 0 ? [...streamedBlocks] : undefined,
                }]);
                finishClaudeAnimation();
              }
              setIsLoading(false);
            }
          } catch { /* skip parse errors */ }
        }
      }
    } catch (error) {
      console.error('Comment draw response error:', error);
      setIsLoading(false);
    }
  }, [history, userSettings, captureFullCanvas, paletteIndex, addComment, addReplyToComment, dismissComment, enqueueShape, enqueueAscii, processClaudeAnimationQueue, finishClaudeAnimation, setClaudeDrawing, setIsLoading, setHistory]);

  const handleCommentSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !commentInput) return;
    const newComment: DrawComment = { text: commentText.trim(), x: commentInput.x, y: commentInput.y, from: 'human' };
    addComment(newComment.text, 'human', newComment.x, newComment.y);
    // Don't clear commentInput/commentText here — let CommentInput animate out first,
    // then onCancel (handleCommentCancel) will clean up
    setHumanHasCommented(true);
    handleCommentResponse([...comments, newComment]);
  }, [commentText, commentInput, addComment, handleCommentResponse, comments]);

  // Image upload handler
  const handleImageUpload = useCallback((file: File, dropPoint?: Point) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const id = `img-${imageIdCounter.current++}`;
        // Scale image to fit reasonably on canvas (max 400px wide/tall)
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width *= scale;
          height *= scale;
        }
        // Position at drop point or center of canvas
        const canvas = canvasRef.current;
        const x = dropPoint?.x ?? (canvas ? canvas.width / 2 - width / 2 : 100);
        const y = dropPoint?.y ?? (canvas ? canvas.height / 2 - height / 2 : 100);
        setImages(prev => [...prev, { id, src, x, y, width, height }]);
        setSelectedImageId(id);
        setTool('select');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag-drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (imageFile) {
      const dropPoint = screenToCanvas(e.clientX, e.clientY);
      handleImageUpload(imageFile, dropPoint);
    }
  }, [handleImageUpload, screenToCanvas]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleImageUpload(file);
            e.preventDefault();
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleImageUpload]);

  // Image selection and dragging
  const handleImageMouseDown = useCallback((e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    setSelectedImageId(imageId);
    setIsDraggingImage(true);
    const point = screenToCanvas(e.clientX, e.clientY);
    const image = images.find(img => img.id === imageId);
    if (image) {
      imageDragOffset.current = { x: point.x - image.x, y: point.y - image.y };
    }
  }, [tool, images, screenToCanvas]);

  const handleImageDrag = useCallback((e: React.MouseEvent) => {
    if (!isDraggingImage || !selectedImageId || !imageDragOffset.current) return;
    const point = screenToCanvas(e.clientX, e.clientY);
    const offset = imageDragOffset.current; // Capture before state update
    setImages(prev => prev.map(img =>
      img.id === selectedImageId
        ? { ...img, x: point.x - offset.x, y: point.y - offset.y }
        : img
    ));
  }, [isDraggingImage, selectedImageId, screenToCanvas]);

  const handleImageMouseUp = useCallback(() => {
    setIsDraggingImage(false);
    imageDragOffset.current = null;
  }, []);

  // Pre-compute eraser mask levels for order-respecting erasure
  // Each non-eraser element is only erased by erasers that come AFTER it in temporal order
  const eraserStrokesForMask: { id: string; data: HumanStroke }[] = [];
  const elementMaskLevel = new Map<string, number>();
  for (const el of drawingElements) {
    if (el.type === 'stroke' && (el.data as HumanStroke).isEraser) {
      eraserStrokesForMask.push({ id: el.id, data: el.data as HumanStroke });
    } else {
      elementMaskLevel.set(el.id, eraserStrokesForMask.length);
    }
  }
  const totalErasers = eraserStrokesForMask.length;
  const hasActiveEraser = !!currentStroke?.isEraser;
  const needsEraserMasks = totalErasers > 0 || hasActiveEraser;

  return (
    <BaseUIProvider>
    <div
      className={`draw-page ${isPanning ? 'is-panning' : ''}`}
      onMouseMove={(e) => {
        if (CUSTOM_CURSORS_ENABLED) {
          // Position cursor via DOM ref — avoids re-rendering entire component
          const el = cursorRef.current;
          if (el) {
            el.style.left = e.clientX + 'px';
            el.style.top = e.clientY + 'px';
            el.style.display = '';
          }
          // Detect if hovering an interactive element (button, link, label, [role=button])
          const target = e.target as HTMLElement;
          const interactive = target.closest('button, a, label, [role="button"], .cursor-pointer, input[type="range"]');
          setIsHoveringInteractive(interactive !== null);
        }
      }}
      onMouseLeave={() => {
        if (CUSTOM_CURSORS_ENABLED) {
          const el = cursorRef.current;
          if (el) el.style.display = 'none';
        }
      }}
    >
      {/* Header bar */}
      <header className="draw-header">
        <div className="draw-header-left">
          <ClaudeIcon
            size={32}
            isLoading={isLoading}
            onClick={handleYourTurn}
            disabled={isLoading}
          />
          <span className={`draw-header-text${isLoading && !claudeDrawing ? ' draw-header-text--loading' : ''}`}>
            {(() => {
              const text = displayedHeaderText.replace(/[a-zA-Z]/, c => c.toUpperCase());
              // Only apply ASCII color styling for drawing info, not loading or default
              if (!claudeDrawing) return text;
              // Use Claude's chosen color, or fall back to first palette color
              const asciiColor = claudeDrawingAsciiColor || COLOR_PALETTES[paletteIndex][0];
              // Split into runs of ASCII art vs normal text
              return text.split(/([a-zA-Z][a-zA-Z']*(?:\s+[a-zA-Z][a-zA-Z']*)*)/).map((part, i) =>
                /^[a-zA-Z]/.test(part)
                  ? <span key={i}>{part}</span>
                  : <span key={i} className="draw-header-ascii" style={{ color: asciiColor }}>{part}</span>
              );
            })()}
          </span>
        </div>
        <div className="draw-header-right">
          {/* User icon */}
          <DrawIconButton
            icon="user-icon"
            onClick={() => {}}
            tooltip="User"
            tooltipPlacement="bottom"
            size="sm"
          />
          <HeaderActions onClear={handleClear} onSave={handleSave} />
        </div>
      </header>

      {/* SVG filter definitions - Safari uses lower complexity for better perf */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          {/* Main filter - used for canvas/strokes (and everything on Chrome) */}
          <filter id="wobbleFilter" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence
              ref={turbulenceRef}
              type="turbulence"
              baseFrequency={isSafari ? "0.02" : "0.03"}
              numOctaves={isSafari ? 1 : 2}
              seed="1"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={isSafari ? distortionAmount * 3.5 : distortionAmount}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          {/* Safari stroke filter - has dilate to prevent white edge bleeding */}
          {isSafari && (
            <filter id="wobbleFilterStroke" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
              <feTurbulence
                type="turbulence"
                baseFrequency="0.02"
                numOctaves={1}
                seed="1"
                result="noise"
              />
              <feMorphology in="SourceGraphic" operator="dilate" radius="1" result="dilated" />
              <feDisplacementMap
                in="dilated"
                in2="noise"
                scale={distortionAmount * 3.5}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          )}
          {/* Grid-only filter for Safari - lower distortion, no dilate (would hide thin lines) */}
          <filter id="wobbleFilterGrid" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves={1}
              seed="1"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={distortionAmount}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          {/* Button filter - uses Chrome-like settings on all browsers so Safari
              buttons don't get the aggressive 3.5x canvas scale */}
          <filter id="wobbleFilterBtn" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence
              ref={turbulenceBtnRef}
              type="turbulence"
              baseFrequency="0.03"
              numOctaves={2}
              seed="1"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={distortionAmount}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Main content area */}
      <div className="draw-main">
        {/* Canvas container */}
        <div
          ref={containerRef}
          className="draw-canvas-container"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onMouseDown={(e) => {
            // Don't start drawing if there's an open comment or comment input
            if (openCommentIndex !== null || commentInput !== null) {
              return;
            }
            if (e.button === 1 || spaceHeld) {
              startPan(e);
            } else if (tool === 'select') {
              // Deselect image if clicking on empty space (image clicks are handled separately)
              setSelectedImageId(null);
            } else if (tool === 'comment') {
              // Track drag start position - only switch to draw if user actually drags
              commentDragStart.current = { x: e.clientX, y: e.clientY };
            } else {
              startDrawing(e);
            }
          }}
          onMouseEnter={() => { setIsOnCanvas(true); }}
          onMouseMove={(e) => {
            setIsTouch(false); // Switch back to mouse mode
            if (isPanning) {
              doPan(e);
            } else if (isDraggingImage) {
              handleImageDrag(e);
            } else if (tool === 'comment' && commentDragStart.current && !isDrawing) {
              // Check if user has dragged enough to switch to draw mode
              const dx = e.clientX - commentDragStart.current.x;
              const dy = e.clientY - commentDragStart.current.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance > DRAG_THRESHOLD) {
                // Switch to draw mode and start drawing
                setTool('draw');
                setAsciiStroke(lastAsciiStrokeRef.current);
                commentDragStart.current = null;
                startDrawing(e);
              }
            } else if (shouldHandleDrawing()) {
              draw(e);
            }
          }}
          onMouseUp={() => {
            commentDragStart.current = null;
            handleImageMouseUp();
            if (isPanning) {
              stopPan();
            } else if (shouldHandleDrawing()) {
              stopDrawing();
            }
          }}
          onMouseLeave={() => {
            setIsOnCanvas(false);
            commentDragStart.current = null;
            handleImageMouseUp();
            if (isPanning) {
              stopPan();
            } else if (shouldHandleDrawing()) {
              stopDrawing();
            }
          }}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onTouchStart={(e) => {
            setIsTouch(true); // Switch to touch mode - hide custom cursor
            // Always check for multi-touch first
            handleZoomPanTouchStart(e);
            // Single finger: draw (unless in comment/select mode or gesture in progress)
            if (e.touches.length === 1 && tool !== 'comment' && tool !== 'select' && !isTouchGesture) {
              startDrawing(e);
            }
          }}
          onTouchMove={(e) => {
            // Always update gesture tracking
            handleZoomPanTouchMove(e);
            // Single finger drawing (only if not in gesture mode and not select tool)
            if (e.touches.length === 1 && tool !== 'comment' && tool !== 'select' && !isTouchGesture) {
              draw(e);
            }
          }}
          onTouchEnd={(e) => {
            handleZoomPanTouchEnd(e);
            if (tool === 'comment') {
              // Comment mode: place comment on tap
              if (e.changedTouches.length === 1 && !isTouchGesture) {
                const touch = e.changedTouches[0];
                const point = screenToCanvas(touch.clientX, touch.clientY);
                setCommentInput({ x: point.x, y: point.y });
                setCommentText('');
              }
            } else if (tool !== 'select' && !isTouchGesture) {
              stopDrawing();
            }
          }}
        >
          {/* Transform wrapper for zoom/pan */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              willChange: isPanning || isTouchGesture ? 'transform' : 'auto',
              contain: 'layout style paint',
            }}
          >
            {/* Chrome: Single container with wiggle animation */}
            {/* Safari: Separate containers - grid with low distortion, strokes with high distortion */}

            {/* Background/Grid layer - Safari gets separate lower-distortion filter */}
            <div
              className="absolute inset-0"
              style={{
                ...(distortionAmount > 0 && !isPanning && !isTouchGesture ? {
                  filter: isSafari ? 'url(#wobbleFilterGrid)' : 'url(#wobbleFilter)',
                  willChange: 'filter',
                  transform: 'translateZ(0)',
                } : {}),
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: 'white',
                  boxShadow: 'inset 0 0 0 1px #E5E5E5',
                  ...(canvasBackground === 'grid' ? {
                    backgroundImage: `
                      linear-gradient(to right, #e5e5e5 1px, transparent 1px),
                      linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                  } : canvasBackground === 'dots' ? {
                    backgroundImage: 'radial-gradient(circle, #e5e5e5 1.5px, transparent 1.5px)',
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                  } : {}),
                }}
              />
            </div>

            {/* Canvas + Strokes layer - Chrome uses container filter, Safari uses per-element filters */}
            <div
              className="absolute inset-0"
              style={{
                ...(distortionAmount > 0 && !isPanning && !isTouchGesture && !isSafari ? {
                  filter: 'url(#wobbleFilter)',
                  willChange: 'filter',
                  transform: 'translateZ(0)',
                } : {}),
              }}
            >
              {/* Canvas layer */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 touch-none w-full h-full"
              />

              {/* SVG layer for drawings */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: '100%',
                  height: '100%',
                }}
              >
              {/* Eraser masks: level-based so each element is only erased by later erasers */}
              {needsEraserMasks && (
                <defs>
                  {Array.from({ length: (hasActiveEraser ? totalErasers + 1 : totalErasers) }, (_, level) => (
                    <mask key={level} id={`eraser-mask-${level}`} maskUnits="userSpaceOnUse" x="-10000" y="-10000" width="20000" height="20000">
                      <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
                      {eraserStrokesForMask.slice(level).map(({ id, data: s }) => (
                        <path key={id} d={s.d} stroke="black" strokeWidth={s.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      ))}
                      {hasActiveEraser && (
                        <path d={currentStroke!.d} stroke="black" strokeWidth={currentStroke!.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </mask>
                  ))}
                </defs>
              )}
              {/* Sort: back-layer shapes first, then rest in order */}
              {[...drawingElements].sort((a, b) => {
                const aBack = a.type === 'shape' && (a.data as Shape).layer === 'back' ? 0 : 1;
                const bBack = b.type === 'shape' && (b.data as Shape).layer === 'back' ? 0 : 1;
                return aBack - bBack;
              }).map((element) => {
                // Compute per-element eraser mask based on temporal order
                const level = elementMaskLevel.get(element.id) ?? totalErasers;
                const maxLevel = totalErasers + (hasActiveEraser ? 1 : 0);
                const eraserMask = needsEraserMasks && level < maxLevel
                  ? `url(#eraser-mask-${level})` : undefined;

                if (element.type === 'stroke') {
                  const stroke = element.data as HumanStroke;
                  // Don't render ASCII backing strokes or eraser strokes (erasers are in the mask)
                  if (stroke.isAsciiBacking || stroke.isEraser) return null;
                  return (
                    <path
                      key={element.id}
                      className="draw-stroke"
                      d={stroke.d}
                      stroke={stroke.color}
                      strokeWidth={stroke.strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      mask={eraserMask}
                      filter={isSafari && distortionAmount > 0 ? 'url(#wobbleFilterStroke)' : undefined}
                    />
                  );
                }
                const shape = element.data as Shape;
                const safariStrokeFilter = isSafari && distortionAmount > 0 ? 'url(#wobbleFilterStroke)' : undefined;
                if (shape.type === 'path' && shape.d) {
                  return (
                    <path
                      key={element.id}
                      className="draw-stroke"
                      d={shape.d}
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
                  return (
                    <circle
                      key={element.id}
                      className="draw-stroke"
                      cx={shape.cx}
                      cy={shape.cy}
                      r={shape.r}
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                if (shape.type === 'ellipse' && shape.cx !== undefined && shape.cy !== undefined && shape.rx !== undefined && shape.ry !== undefined) {
                  return (
                    <ellipse
                      key={element.id}
                      className="draw-stroke"
                      cx={shape.cx}
                      cy={shape.cy}
                      rx={shape.rx}
                      ry={shape.ry}
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                if (shape.type === 'rect' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
                  return (
                    <rect
                      key={element.id}
                      className="draw-stroke"
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                if (shape.type === 'line' && shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
                  return (
                    <line
                      key={element.id}
                      className="draw-stroke"
                      x1={shape.x1}
                      y1={shape.y1}
                      x2={shape.x2}
                      y2={shape.y2}
                      stroke={shape.color || shape.fill || '#000000'}
                      strokeWidth={shape.strokeWidth || 2}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                if (shape.type === 'polygon' && shape.points && shape.points.length >= 3) {
                  const pointsStr = shape.points.map(p => `${p[0]},${p[1]}`).join(' ');
                  return (
                    <polygon
                      key={element.id}
                      className="draw-stroke"
                      points={pointsStr}
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                if (shape.type === 'curve' && shape.points && shape.points.length >= 2) {
                  let d = `M ${shape.points[0][0]} ${shape.points[0][1]}`;
                  if (shape.points.length === 3) {
                    d += ` Q ${shape.points[1][0]} ${shape.points[1][1]} ${shape.points[2][0]} ${shape.points[2][1]}`;
                  } else if (shape.points.length === 4) {
                    d += ` C ${shape.points[1][0]} ${shape.points[1][1]} ${shape.points[2][0]} ${shape.points[2][1]} ${shape.points[3][0]} ${shape.points[3][1]}`;
                  } else {
                    for (let j = 1; j < shape.points.length; j++) {
                      d += ` L ${shape.points[j][0]} ${shape.points[j][1]}`;
                    }
                  }
                  return (
                    <path
                      key={element.id}
                      className="draw-stroke"
                      d={d}
                      stroke={shape.color || (shape.fill ? 'none' : '#000000')}
                      strokeWidth={shape.color || !shape.fill ? (shape.strokeWidth || 2) : 0}
                      fill={shape.fill === 'transparent' ? 'none' : (shape.fill || 'none')}
                      strokeLinecap={shape.strokeLinecap || 'round'}
                      strokeLinejoin={shape.strokeLinejoin || 'round'}
                      opacity={shape.opacity}
                      transform={shape.transform}
                      mask={eraserMask}
                      filter={safariStrokeFilter}
                    />
                  );
                }
                return null;
              })}
              {/* Currently animating Claude shape with progressive reveal */}
              {animatingShape && (() => {
                const { shape, progress } = animatingShape;
                // Use pathLength="1" to normalize, then dashoffset from 1→0 reveals stroke
                // Use fill color for animation stroke when no explicit stroke color
                const animStroke = shape.color || shape.fill || '#000000';
                const commonProps = {
                  stroke: animStroke,
                  strokeWidth: shape.strokeWidth || 2,
                  fill: 'none', // Don't fill during animation
                  strokeLinecap: 'round' as const,
                  strokeLinejoin: 'round' as const,
                  pathLength: 1,
                  strokeDasharray: 1,
                  strokeDashoffset: 1 - progress, // 1 = hidden, 0 = fully revealed
                  filter: isSafari && distortionAmount > 0 ? 'url(#wobbleFilterStroke)' : undefined,
                };

                if (shape.type === 'path' && shape.d) {
                  return <path key="animating" d={shape.d} {...commonProps} />;
                }
                if (shape.type === 'erase' && shape.d) {
                  // Erase strokes - show as semi-transparent during animation
                  return <path key="animating" d={shape.d} {...commonProps} stroke="rgba(255,200,200,0.5)" />;
                }
                if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
                  return <circle key="animating" cx={shape.cx} cy={shape.cy} r={shape.r} {...commonProps} />;
                }
                if (shape.type === 'rect' && shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
                  return <rect key="animating" x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...commonProps} />;
                }
                if (shape.type === 'line' && shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
                  return <line key="animating" x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...commonProps} />;
                }
                if (shape.type === 'curve' && shape.points && shape.points.length >= 2) {
                  let d = `M ${shape.points[0][0]} ${shape.points[0][1]}`;
                  if (shape.points.length === 3) {
                    d += ` Q ${shape.points[1][0]} ${shape.points[1][1]} ${shape.points[2][0]} ${shape.points[2][1]}`;
                  } else if (shape.points.length === 4) {
                    d += ` C ${shape.points[1][0]} ${shape.points[1][1]} ${shape.points[2][0]} ${shape.points[2][1]} ${shape.points[3][0]} ${shape.points[3][1]}`;
                  } else {
                    for (let j = 1; j < shape.points.length; j++) {
                      d += ` L ${shape.points[j][0]} ${shape.points[j][1]}`;
                    }
                  }
                  return <path key="animating" d={d} {...commonProps} />;
                }
                return null;
              })()}
              {currentStroke && !currentStroke.isAsciiBacking && !currentStroke.isEraser && (
                <path
                  d={currentStroke.d}
                  stroke={currentStroke.color}
                  strokeWidth={currentStroke.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={isSafari && distortionAmount > 0 ? 'url(#wobbleFilterStroke)' : undefined}
                />
              )}
              {/* Human ASCII chars as SVG text elements */}
              {humanAsciiChars.map((charData, i) => (
                <text
                  key={`human-ascii-${i}`}
                  x={charData.x}
                  y={charData.y}
                  fill={charData.color}
                  fontFamily="monospace"
                  fontSize={charData.fontSize}
                  className="draw-stroke"
                  mask={needsEraserMasks ? 'url(#eraser-mask-0)' : undefined}
                  filter={isSafari && distortionAmount > 0 ? 'url(#wobbleFilter)' : undefined}
                >
                  {charData.char}
                </text>
              ))}
              {/* Claude's ASCII blocks as SVG text elements */}
              {asciiBlocks.map((block, i) => (
                <text
                  key={`block-${i}`}
                  x={block.x}
                  y={block.y}
                  fill={block.color || '#3b82f6'}
                  fontFamily="monospace"
                  fontSize={16}
                  className="draw-stroke"
                  mask={needsEraserMasks ? 'url(#eraser-mask-0)' : undefined}
                  filter={isSafari && distortionAmount > 0 ? 'url(#wobbleFilter)' : undefined}
                >
                  {block.block.split('\n').map((line, lineIdx) => (
                    <tspan
                      key={lineIdx}
                      x={block.x}
                      dy={lineIdx === 0 ? 0 : 18}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              ))}
            </svg>
            </div>
            {/* End canvas/strokes container */}

            {/* Images layer - on top, no distortion filter */}
            {images.map((img) => (
              <div
                key={img.id}
                className={`absolute ${tool !== 'select' ? 'pointer-events-none' : ''} ${selectedImageId === img.id ? 'ring-2 ring-blue-500' : ''}`}
                style={{
                  left: img.x,
                  top: img.y,
                  width: img.width,
                  height: img.height,
                  zIndex: 10,
                }}
                onMouseDown={(e) => handleImageMouseDown(e, img.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt=""
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
              </div>
            ))}

            {/* Claude's cursor - rendered inside transform wrapper at canvas coordinates */}
            {/* Uses inline SVG components with "opus" label, same style as user cursors */}
            {CUSTOM_CURSORS_ENABLED && claudeCursorPos && (
              <div
                className="absolute pointer-events-none"
                style={{
                  // Position at canvas coordinates
                  // All Claude cursors have hotspot at (3, 3)
                  left: claudeCursorPos.x - 3,
                  top: claudeCursorPos.y - 3,
                  zIndex: 50,
                  // Counter-scale to keep cursor at consistent size regardless of zoom
                  transform: `scale(${1 / zoom})`,
                  transformOrigin: '3px 3px',
                  filter: 'drop-shadow(0px 0.5px 2px rgba(0, 0, 0, 0.25))',
                }}
              >
                {animatingAscii ? (
                  <ClaudeAsciiCursor labelText={displayedCursorLabel || undefined} />
                ) : animatingShape?.shape.type === 'erase' ? (
                  <ClaudeEraserCursor labelText={displayedCursorLabel || undefined} />
                ) : (
                  <ClaudePencilCursor labelText={displayedCursorLabel || undefined} color={(() => {
                    const c = animatingShape?.shape.color || animatingShape?.shape.fill;
                    if (c) lastClaudeCursorColor.current = c;
                    return lastClaudeCursorColor.current;
                  })()} />
                )}
              </div>
            )}
          </div>

          {/* Custom cursor removed from here — now rendered at page level */}


          {/* Comment system */}
          {!isMobile && (
            <CommentSystem
              comments={comments}
              strokeColor={strokeColor}
              openCommentIndex={openCommentIndex}
              setOpenCommentIndex={setOpenCommentIndex}
              hoveredCommentIndex={hoveredCommentIndex}
              setHoveredCommentIndex={setHoveredCommentIndex}
              replyingToIndex={replyingToIndex}
              setReplyingToIndex={setReplyingToIndex}
              replyText={replyText}
              setReplyText={setReplyText}
              deleteComment={deleteComment}
              addReplyToComment={addReplyToComment}
              canvasToScreen={canvasToScreen}
              hasCommentInput={commentInput !== null}
              onCloseCommentInput={() => {
                setCommentInput(null);
                setCommentText('');
              }}
              onUserReply={(_index, _text) => {
                setHumanHasCommented(true);
                // Trigger comment-only response (no drawing)
                handleCommentResponse();
              }}
              saveComment={saveComment}
              dismissComment={dismissComment}
              isDrawing={isDrawing}
            />
          )}

          {/* Comment input - desktop */}
          {!isMobile && commentInput && (
            <CommentInput
              position={commentInput}
              screenPosition={canvasToScreen(commentInput.x, commentInput.y)}
              commentText={commentText}
              setCommentText={setCommentText}
              strokeColor={strokeColor}
              onSubmit={handleCommentSubmit}
              onCancel={handleCommentCancel}
              onMouseEnterBubble={() => setIsHoveringCommentInput(true)}
              onMouseLeaveBubble={() => setIsHoveringCommentInput(false)}
            />
          )}
        </div>

        {/* Thinking Panel */}
        {thinkingEnabled && showThinkingPanel && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
              <span className="text-sm font-medium text-gray-700">Claude&apos;s Thoughts</span>
              <button
                onClick={() => setShowThinkingPanel(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {thinkingText ? (
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
                  {thinkingText}
                </pre>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Claude&apos;s reasoning will appear here when drawing.
                </p>
              )}
            </div>
          </div>
        )}

      </div>


      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-16 flex flex-col gap-2 justify-end right-3 bg-black/80 backdrop-blur-xl rounded-xl p-2 text-sm z-10 w-64 border border-white/10">
          {/* Draw Mode - tab bar */}
          <div className="flex text-xs bg-white/5 rounded-lg p-1 mb-1">
            {(['all', 'shapes', 'ascii'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDrawMode(mode)}
                className={`flex-1 py-1 rounded-md transition-all ${
                  drawMode === mode
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {mode === 'all' ? 'All' : mode === 'shapes' ? 'Shapes' : 'ASCII'}
              </button>
            ))}
          </div>

          {/* Canvas Background - tab bar */}
          <div className="flex text-xs bg-white/5 rounded-lg p-1 mb-1">
            {(['none', 'grid', 'dots'] as const).map((bg) => (
              <button
                key={bg}
                onClick={() => {
                  setCanvasBackground(bg);
                  if (bg === 'grid') setGridSize(DEFAULT_GRID_SIZE);
                  else if (bg === 'dots') setGridSize(DEFAULT_DOT_SIZE);
                }}
                className={`flex-1 py-1 rounded-md transition-all ${
                  canvasBackground === bg
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {bg === 'none' ? 'None' : bg === 'grid' ? 'Grid' : 'Dots'}
              </button>
            ))}
          </div>
          {canvasBackground !== 'none' && (
            <input
              type="range"
              min="8"
              max="64"
              step="4"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full mb-3 draw-settings-slider"
            />
          )}

          {/* Architecture info */}
          <div className="mb-3 p-2 bg-white/5 rounded-lg text-xs text-white/60">
            <div className="font-medium text-white/80 mb-1">Prompting</div>
            <div className="space-y-0.5">
              {hybridModeEnabled ? (
                <>
                  <div><span className="text-green-400">Hybrid</span> mode active</div>
                  <div>→ Image sync every {syncInterval} turns</div>
                  <div>→ SVG paths between syncs</div>
                  <div>→ Context preserved across turns</div>
                </>
              ) : (
                <>
                  <div><span className="text-purple-400">Opus</span> sees canvas image directly</div>
                  <div>→ Reads mood (calm, chaotic, playful...)</div>
                  <div>→ Matches energy in response</div>
                  <div>→ Switches palettes for right colors</div>
                </>
              )}
            </div>
          </div>

          {/* Checkboxes - main settings */}
          <div className="flex items-center gap-4 mb-1 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={sayEnabled}
                onChange={(e) => setSayEnabled(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>Comments</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={autoDrawEnabled}
                onChange={(e) => setAutoDrawEnabled(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>Auto</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={thinkingEnabled}
                onChange={(e) => {
                  setThinkingEnabled(e.target.checked);
                  if (e.target.checked) setShowThinkingPanel(true);
                }}
                className="draw-settings-checkbox"
              />
              <span>Thinking</span>
            </label>
          </div>

          {/* UI visibility toggles */}
          <div className="flex items-center gap-4 mb-1 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={showSelectTool}
                onChange={(e) => setShowSelectTool(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>Select</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={showReactButton}
                onChange={(e) => setShowReactButton(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>React</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={showDownloadButton}
                onChange={(e) => setShowDownloadButton(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span>Download</span>
            </label>
          </div>

          {/* Hybrid Mode Settings - Token Cost Optimization */}
          <div className="border-t border-white/10 pt-2 mt-1">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white text-xs">
                <input
                  type="checkbox"
                  checked={hybridModeEnabled}
                  onChange={(e) => setHybridModeEnabled(e.target.checked)}
                  className="draw-settings-checkbox"
                />
                <span>Hybrid Mode</span>
              </label>
              <span className="text-[10px] text-green-400/70">~55% token savings</span>
            </div>
            {hybridModeEnabled && (
              <>
                <div className="text-[10px] text-white/40 mb-2">
                  Sends images every {syncInterval} turns, SVG paths between syncs
                </div>
                <div>
                  <div className="flex justify-between text-xs text-white/50">
                    <span>Sync interval</span>
                    <span>every {syncInterval} turns</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                    className="w-full draw-settings-slider"
                  />
                </div>
                {lastSyncContext && (
                  <div className="mt-2 p-1.5 bg-blue-500/10 rounded text-[10px] text-blue-300/70">
                    Context from turn {lastSyncContext.turn}: &ldquo;{lastSyncContext.observation?.slice(0, 40)}...&rdquo;
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sliders */}
          <div className="space-y-2 mb-1">
            <div>
              <div className="flex justify-between text-xs text-white/50">
                <span>Distortion</span>
                <span>{distortionAmount}</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="2"
                value={distortionAmount}
                onChange={(e) => setDistortionAmount(parseInt(e.target.value))}
                className="w-full draw-settings-slider"
              />
            </div>
            {distortionAmount > 0 && (
              <div>
                <div className="flex justify-between text-xs text-white/50">
                  <span>Wiggle</span>
                  <span>{wiggleSpeed}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={wiggleSpeed}
                  onChange={(e) => setWiggleSpeed(parseInt(e.target.value))}
                  className="w-full draw-settings-slider"
                />
              </div>
            )}
            <div>
              <div className="flex justify-between text-xs text-white/50">
                <span>Temperature</span>
                <span>{temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full draw-settings-slider"
                disabled={thinkingEnabled}
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-white/50">
                <span>Max tokens</span>
                <span>{maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="4096"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full draw-settings-slider"
              />
            </div>
          </div>

          {/* Token Usage */}
          <div className="border-t border-white/10 pt-2 mt-1">
            <div className="text-xs text-white/50 mb-1">Token Usage</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-white/40 text-[10px]">Last request</div>
                {lastUsage ? (
                  <>
                    <div className="text-white/70">↓ {lastUsage.input_tokens.toLocaleString()}</div>
                    <div className="text-white/70">↑ {lastUsage.output_tokens.toLocaleString()}</div>
                  </>
                ) : (
                  <div className="text-white/30">—</div>
                )}
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-white/40 text-[10px]">Session total</div>
                <div className="text-white/70">↓ {sessionUsage.input_tokens.toLocaleString()}</div>
                <div className="text-white/70">↑ {sessionUsage.output_tokens.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Cursor Test Controls */}
          <div className="border-t border-white/10 pt-2 mt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">Cursor Animation Test</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
                <input
                  type="checkbox"
                  checked={testModeEnabled}
                  onChange={(e) => setTestModeEnabled(e.target.checked)}
                  className="draw-settings-checkbox"
                />
                <span className="text-xs">Enabled</span>
              </label>
            </div>
            {testModeEnabled && (
              <>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-white/50">
                    <span>Speed</span>
                    <span>{animationSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.25"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    className="w-full draw-settings-slider"
                  />
                </div>
                <button
                  onClick={runTestShapes}
                  disabled={claudeIsDrawing}
                  className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all ${
                    claudeIsDrawing
                      ? 'bg-white/10 text-white/30'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {claudeIsDrawing ? 'Drawing...' : 'Run Test Shapes'}
                </button>
              </>
            )}
          </div>

          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="System prompt..."
            className="w-full h-20 px-2 py-1.5 bg-white/10 rounded-lg text-xs text-white/90 placeholder-white/30 resize-none focus:outline-none focus:border-white/30"
          />

          {/* Copy settings button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                const settings = {
                  drawMode,
                  canvasBackground,
                  gridSize,
                  sayEnabled,
                  autoDrawEnabled,
                  thinkingEnabled,
                  distortionAmount,
                  wiggleSpeed,
                  bounceIntensity,
                  temperature,
                  maxTokens,
                  panSensitivity,
                  zoomSensitivity,
                  prompt,
                };
                navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
              }}
              className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-all"
              title="Copy settings as JSON"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
                <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      {isMobile ? (
        <MobileToolbar
          tool={tool}
          setTool={setTool}
          asciiStroke={asciiStroke}
          setAsciiStroke={handleSetAsciiStroke}
          strokeColor={strokeColor}
          setStrokeColor={handleSetStrokeColor}
          strokeSize={strokeSize}
          setStrokeSize={setStrokeSize}
          paletteIndex={paletteIndex}
          setPaletteIndex={setPaletteIndex}
          mode={mobileToolbarMode}
          setMode={setMobileToolbarMode}
        />
      ) : (
        <DrawToolbar
          tool={tool}
          setTool={setTool}
          asciiStroke={asciiStroke}
          setAsciiStroke={handleSetAsciiStroke}
          strokeColor={strokeColor}
          setStrokeColor={handleSetStrokeColor}
          strokeSize={strokeSize}
          setStrokeSize={setStrokeSize}
          paletteIndex={paletteIndex}
          setPaletteIndex={setPaletteIndex}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          isLoading={isLoading}
          onYourTurn={handleYourTurn}
          onClear={handleClear}
          onSave={handleSave}
          animationType={animationType}
          slideDuration={slideDuration}
          slideStagger={slideStagger}
          slideBounce={slideBounce}
          showSelectTool={showSelectTool}
          showReactButton={showReactButton}
          showDownloadButton={showDownloadButton}
        />
      )}

      {/* Settings button - bottom right (hidden on mobile) */}
      {!isMobile && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`absolute bottom-4 right-4 z-30 draw-header-icon-btn ${showSettings ? 'draw-header-icon-btn--active' : ''}`}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      )}

      {/* Mobile comment system */}
      {isMobile && (
        <>
          <MobileCommentMorph
            isOpen={mobileCommentSheetOpen}
            onToggle={() => setMobileCommentSheetOpen(true)}
            onClose={() => setMobileCommentSheetOpen(false)}
            comments={comments}
            replyingToIndex={replyingToIndex}
            setReplyingToIndex={setReplyingToIndex}
            replyText={replyText}
            setReplyText={setReplyText}
            addReplyToComment={addReplyToComment}
            deleteComment={deleteComment}
            onUserReply={(_index: number, _text: string) => {
              setHumanHasCommented(true);
              // Trigger comment-only response (no drawing)
              handleCommentResponse();
            }}
          />
          {commentInput && (
            <MobileCommentInput
              commentText={commentText}
              setCommentText={setCommentText}
              onSubmit={handleCommentSubmit}
              onCancel={handleCommentCancel}
            />
          )}
        </>
      )}

      {/* Auth modals */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />
      <DrawingsPanel
        isOpen={showDrawingsPanel}
        onClose={() => setShowDrawingsPanel(false)}
        onLoad={handleLoadFromCloud}
        onSave={handleSaveToCloud}
        currentDrawingId={currentDrawingId}
      />

      {/* Custom cursor is now handled entirely via CSS cursor: url() images
          set on --draw-cursor (see buildCssCursorValue + useEffect above).
          The div-based CustomCursor is no longer rendered to avoid double-cursor lag. */}
    </div>
    </BaseUIProvider>
  );
}
