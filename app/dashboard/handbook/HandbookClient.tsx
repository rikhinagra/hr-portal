'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Check, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { HANDBOOK_CHAPTERS } from '@/lib/constants';
import type { Employee } from '@/types';

interface HandbookClientProps {
  employee: Employee;
  existingAck: { acknowledged_at: string } | null;
}

export default function HandbookClient({ employee, existingAck }: HandbookClientProps) {
  const [acknowledged, setAcknowledged] = useState(!!existingAck);
  const [ackDate, setAckDate] = useState(existingAck?.acknowledged_at ?? null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) setScrolledToBottom(true);
    }
  }, []);

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/handbook/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAcknowledged(true);
      setAckDate(data.acknowledged_at);
      setShowModal(false);
      toast.success('Handbook Acknowledged', {
        description: `Confirmation sent to HR. Thank you, ${employee.name.split(' ')[0]}!`,
      });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading text-2xl">Employee Handbook</h1>
          <p className="text-sm text-muted-foreground mt-1">Read all 17 chapters and acknowledge at the bottom</p>
        </div>
        {acknowledged && (
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#2e7d32' }}>
            <Check className="size-3.5" /> Acknowledged
          </span>
        )}
      </div>

      {/* Chapter Scroll Container */}
      <Card>
        <CardContent className="p-0">
          <div ref={contentRef} onScroll={handleScroll} className="max-h-[65vh] overflow-y-auto">
            {HANDBOOK_CHAPTERS.map((ch, i) => (
              <div key={ch.num} className={`px-4 py-5 sm:px-8 sm:py-7 ${i < HANDBOOK_CHAPTERS.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="text-xs tracking-widest uppercase mb-1.5 font-semibold" style={{ color: '#c8985e', fontFamily: 'var(--font-geist-mono), monospace' }}>
                  Chapter {ch.num}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  {ch.title}
                </h3>
                {ch.content.split('\n\n').map((p, j) => (
                  <p key={j} className="text-sm text-muted-foreground leading-relaxed mb-2.5">{p}</p>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgement Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all ${scrolledToBottom && !acknowledged ? 'border-[#c8985e]' : 'border-border'}`}
        style={{ background: scrolledToBottom && !acknowledged ? 'rgba(200,152,94,0.08)' : 'rgba(0,0,0,0.02)' }}>
        <div>
          {!scrolledToBottom && !acknowledged && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5"><ArrowDown className="size-3.5 flex-shrink-0" /> Scroll to the bottom of the handbook to enable acknowledgement</p>
          )}
          {scrolledToBottom && !acknowledged && (
            <p className="text-sm font-semibold" style={{ color: '#c8985e' }}>You&apos;ve read the full handbook. Please acknowledge below.</p>
          )}
          {acknowledged && ackDate && (
            <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#2e7d32' }}>
              <Check className="size-3.5 flex-shrink-0" /> Acknowledged on {new Date(ackDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. HR has been notified.
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!scrolledToBottom || acknowledged}
          className="flex-shrink-0 px-6 py-2.5 rounded-lg font-semibold text-sm"
          style={{
            background: scrolledToBottom && !acknowledged ? '#c8985e' : '#ccc',
            color: scrolledToBottom && !acknowledged ? '#0f1a2e' : '#888',
            cursor: scrolledToBottom && !acknowledged ? 'pointer' : 'not-allowed',
            opacity: acknowledged ? 0.6 : 1,
          }}>
          {acknowledged ? 'Acknowledged ✓' : 'I Acknowledge'}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl bg-card text-foreground border animate-slide-up">
            <h3 className="text-lg font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Confirm Acknowledgement
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              By confirming, you acknowledge that you have read and understood the complete SACHHSOFT Employee Handbook.
              A confirmation will be sent to HR.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-lg text-sm border border-border text-muted-foreground bg-transparent hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleAcknowledge} disabled={loading}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: loading ? '#ccc' : '#c8985e', color: '#0f1a2e', cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? 'Saving...' : 'Confirm & Notify HR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
