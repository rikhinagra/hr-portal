'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Same width as Tailwind's "xl" breakpoint, where the timesheet form becomes a one-line-per-row table.
const WIDE_SCREEN = '(min-width: 1280px)';

interface FullTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  /** A link has no spaces, so it has to be allowed to break anywhere to wrap onto the next line */
  breakAnywhere?: boolean;
  /** Called when Enter is pressed (the text itself never gets a new line) */
  onEnter?: () => void;
}

/**
 * A one-line text box that never hides what was written.
 * - Wide screens (table layout): the box stays one line. When the text is longer than the box, hovering it shows a
 *   small card with the complete text.
 * - Small screens: there is no hover, so the box grows taller until all the text is visible.
 */
export default function FullTextField({
  value, onChange, ariaLabel, placeholder, maxLength, className = '', breakAnywhere = false, onEnter,
}: FullTextFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const tipId = useId();
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);

  // Small screens: grow to fit the text. Wide screens: leave the height to the table row.
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia(WIDE_SCREEN).matches) {
        el.style.height = '';
        return;
      }
      el.style.height = 'auto';
      // Nothing to measure while the box is hidden (e.g. its section is collapsed): keep the normal one-line height
      el.style.height = el.scrollHeight > 0 ? `${el.scrollHeight}px` : '';
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [value]);

  // The card is placed with fixed coordinates, so it is hidden as soon as the page moves under the mouse.
  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [tip]);

  const showTip = () => {
    const el = ref.current;
    if (!el || document.activeElement === el || !window.matchMedia(WIDE_SCREEN).matches) return;
    if (el.scrollWidth <= el.clientWidth + 1) return; // everything is already visible
    const rect = el.getBoundingClientRect();
    setTip({ left: Math.max(12, Math.min(rect.left, window.innerWidth - 432)), top: rect.bottom + 6 });
  };

  return (
    <>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        aria-label={ariaLabel}
        aria-describedby={tip ? tipId : undefined}
        placeholder={placeholder}
        maxLength={maxLength}
        // A pasted new line becomes a space, so an entry always stays on one line
        onChange={e => onChange(e.target.value.replace(/[\r\n]+/g, ' '))}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.(); } }}
        onMouseEnter={showTip}
        onMouseLeave={() => setTip(null)}
        onFocus={() => setTip(null)}
        className={`${className} block resize-none overflow-hidden whitespace-pre-wrap xl:h-full xl:whitespace-pre ${breakAnywhere ? 'max-xl:break-all' : ''}`}
      />
      {tip && typeof document !== 'undefined' && createPortal(
        <div
          id={tipId}
          role="tooltip"
          className={`pointer-events-none fixed z-[60] w-max max-w-[420px] whitespace-pre-wrap rounded-lg border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg ${breakAnywhere ? 'break-all' : '[overflow-wrap:anywhere]'}`}
          style={{ left: tip.left, top: tip.top }}
        >
          {value}
        </div>,
        document.body,
      )}
    </>
  );
}
