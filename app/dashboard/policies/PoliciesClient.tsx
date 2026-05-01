'use client';

import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import type { Policy } from '@/types';

const categoryColors: Record<string, string> = {
  Onboarding: '#3a7bd5', Recruitment: '#2e7d32', Leave: '#e67e22',
  WFH: '#c8985e', Handbook: '#0f1a2e', Security: '#b33a3a', Conduct: '#b33a3a',
};

export default function PoliciesClient({ policies }: { policies: Policy[] }) {
  const handleClick = (policy: Policy) => {
    if (policy.file_url) {
      window.open(policy.file_url, '_blank');
    } else {
      toast.info('Document Coming Soon', { description: `${policy.name} will be available once the file is uploaded.` });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-heading text-2xl">Policy Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Access all company policies and documents</p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {policies.map(p => {
          const catColor = categoryColors[p.category] ?? '#0f1a2e';
          return (
            <Card key={p.id} onClick={() => handleClick(p)}
              className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#c8985e]">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center rounded-xl size-11"
                    style={{ background: 'rgba(200,152,94,0.12)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8985e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold mb-2"
                      style={{ background: `${catColor}18`, color: catColor }}>
                      {p.category}
                    </span>
                    <h4 className="text-sm font-semibold text-foreground leading-snug">{p.name}</h4>
                    {p.file_name && <p className="text-xs text-muted-foreground mt-1">{p.file_name}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
