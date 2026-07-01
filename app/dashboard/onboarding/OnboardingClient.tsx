'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Hash, Mail, Send, MessageCircle, Laptop, BookOpen,
  ClipboardList, Monitor, Calendar, Handshake, Lock,
  Rocket, CheckCircle2, Loader2, ChevronDown, CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Employee } from '@/types';
import OnboardingLoading from './loading';

const ONBOARDING_STEPS: { label: string; Icon: React.ElementType; detail: string }[] = [
  { label: 'Generate Employee Code', Icon: Hash, detail: 'New code auto-assigned' },
  { label: 'Create company email & portal login', Icon: Mail, detail: 'Portal login access created' },
  { label: 'Send welcome email to personal address', Icon: Send, detail: 'Includes login details & portal link' },
  { label: 'Set up employee profile & leaves', Icon: ClipboardList, detail: '12 Earned & 7 Sick leaves credited' },
];

interface StepState {
  label: string;
  Icon: React.ElementType;
  detail: string;
  status: 'pending' | 'running' | 'done';
}

export default function OnboardingClient({ employee }: { employee: Employee }) {
  const [newHire, setNewHire] = useState({ name: '', personalEmail: '', designation: '', dept: 'Engineering', dob: '', employmentType: 'Full-Time' });
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [assignedCode, setAssignedCode] = useState('');

  const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';

  const maxDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  })();

  const startOnboarding = async () => {
    if (!newHire.name.trim() || !newHire.personalEmail.trim() || !newHire.designation.trim()) {
      toast.error('Missing Fields', { description: 'Please fill all required fields.' });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHire.name,
          email: newHire.personalEmail,
          designation: newHire.designation,
          department: newHire.dept,
          dob: newHire.dob || '2000-01-01',
          employmentType: newHire.employmentType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAssignedCode(data.employee_code);
      setSteps(ONBOARDING_STEPS.map(s => ({ ...s, status: 'pending' })));
      setSubmitting(false);
      setRunning(true);
      setCurrentStep(0);
    } catch (err: unknown) {
      setSubmitting(false);
      toast.error('Onboarding Failed', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    }
  };

  useEffect(() => {
    if (currentStep < 0 || currentStep >= ONBOARDING_STEPS.length) return;

    setSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: 'running' } : s));

    const timer = setTimeout(() => {
      setSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: 'done' } : s));
      if (currentStep < ONBOARDING_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        toast.success('Onboarding Complete!', {
          description: `${newHire.name} has been fully onboarded as ${assignedCode}. All automations triggered.`,
        });
        setCurrentStep(-1);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentStep]);

  if (submitting) return <OnboardingLoading />;

  if (!isAdminOrHr) {
    return (
      <div className="text-center py-16">
        <Lock className="size-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>Access Restricted</h2>
        <p className="text-muted-foreground mt-2">Onboarding management is available to HR and Admin users only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-heading text-2xl">Onboarding Automation</h1>
        <p className="text-sm text-muted-foreground mt-1">Automate new employee onboarding with one click</p>
      </div>

      {!running ? (
        <Card>
          <CardHeader className="pb-0">
            <h3 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>New Employee Details</h3>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 onboarding-grid">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Full Name *</label>
                <input value={newHire.name} onChange={e => setNewHire({ ...newHire, name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Personal Email *</label>
                <input type="email" value={newHire.personalEmail} onChange={e => setNewHire({ ...newHire, personalEmail: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Designation *</label>
                <input value={newHire.designation} onChange={e => setNewHire({ ...newHire, designation: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
              </div>
              <div className="relative">
                <label className="block text-xs text-muted-foreground mb-1.5">Department</label>
                <select value={newHire.dept} onChange={e => setNewHire({ ...newHire, dept: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                  <option>Engineering</option><option>Design</option><option>QA</option>
                  <option>Business Dev</option><option>HR</option><option>IT</option><option>LexgoSolution</option>
                </select>
                <ChevronDown className="absolute right-3 bottom-3 size-4 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative">
                <label className="block text-xs text-muted-foreground mb-1.5">Role Type</label>
                <select value={newHire.employmentType} onChange={e => setNewHire({ ...newHire, employmentType: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                  <option>Full-Time</option><option>Part-Time</option><option>Contract</option>
                </select>
                <ChevronDown className="absolute right-3 bottom-3 size-4 text-muted-foreground pointer-events-none" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Date of Birth (for login)</label>
                <div className="relative">
                  <input type="date" value={newHire.dob} max={maxDob} onChange={e => setNewHire({ ...newHire, dob: e.target.value })}
                    className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none"
                  />
                  {!newHire.dob && (
                    <span className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none bg-background pr-1">
                      DD/MM/YYYY
                    </span>
                  )}
                  <style>{`
                    input[type="date"]::-webkit-calendar-picker-indicator {
                      position: absolute; top: 0; right: 0; width: 44px; height: 100%; opacity: 0; cursor: pointer;
                    }
                  `}</style>
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="rounded-lg p-3 text-xs text-muted-foreground leading-relaxed" style={{ background: 'rgba(200,152,94,0.1)' }}>
              <span className="font-semibold" style={{ color: '#c8985e' }}>This will automatically trigger:</span>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  [Hash, 'Generate employee code'],
                  [Mail, 'Create portal login credentials'],
                  [ClipboardList, 'Set up profile & leaves'],
                  [Send, 'Send welcome email to personal address'],
                ].map(([Icon, label], i) => {
                  const I = Icon as React.ElementType;
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <I className="size-3 flex-shrink-0" style={{ color: '#c8985e' }} />
                      <span>{label as string}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={startOnboarding}
              className="flex items-center gap-2 px-7 py-3 rounded-lg font-semibold text-sm"
              style={{ background: '#c8985e', color: '#0f1a2e' }}>
              <Rocket className="size-4" />
              Start Onboarding
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Rocket className="size-6 flex-shrink-0" style={{ color: '#c8985e' }} />
              <div>
                <h3 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  Onboarding {newHire.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {assignedCode && `Employee Code: ${assignedCode} · `}{newHire.designation} · {newHire.dept}
                </p>
              </div>
            </div>

            <div className="flex flex-col">
              {steps.map((s, i) => {
                const StepIcon = s.Icon;
                return (
                  <div key={i} className={`flex items-center gap-4 py-3.5 ${i < steps.length - 1 ? 'border-b border-border' : ''}`}>
                    <div className="size-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: s.status === 'done' ? 'rgba(46,125,50,0.1)' : s.status === 'running' ? 'rgba(200,152,94,0.12)' : 'rgba(128,128,128,0.08)',
                      }}>
                      {s.status === 'done'
                        ? <CheckCircle2 className="size-5" style={{ color: '#2e7d32' }} />
                        : <StepIcon className="size-5" style={{ color: s.status === 'running' ? '#c8985e' : undefined }} />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: s.status === 'done' ? '#2e7d32' : undefined }}>
                        <span className={s.status === 'done' ? '' : 'text-foreground'}>{s.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{s.detail}</div>
                    </div>
                    {s.status === 'running' && (
                      <Loader2 className="size-4 flex-shrink-0 animate-spin" style={{ color: '#c8985e' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {currentStep === -1 && steps.length > 0 && steps.every(s => s.status === 'done') && (
              <button
                onClick={() => { setRunning(false); setSteps([]); setNewHire({ name: '', personalEmail: '', designation: '', dept: 'Engineering', dob: '', employmentType: 'Full-Time' }); setAssignedCode(''); }}
                className="mt-5 px-6 py-3 rounded-lg font-semibold text-sm text-white"
                style={{ background: '#0f1a2e' }}>
                Onboard Another Employee
              </button>
            )}
          </CardContent>
        </Card>
      )}

      <style>{`@media(max-width:600px){.onboarding-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
