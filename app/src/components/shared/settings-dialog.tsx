'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AccountSettingsCards, SecuritySettingsCards } from '@neondatabase/auth/react';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  open: boolean;
  path: string;
  onClose: () => void;
}

const TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'security', label: 'Security' },
] as const;

export function SettingsDialog({ open, path, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState(path);

  // Sync active tab when dialog is opened with a different path
  const handleOpenChange = (o: boolean) => {
    if (o) setActiveTab(path);
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Account Settings</DialogTitle>
        <div className="flex border-b px-6 pt-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'mr-6 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto max-h-[70vh] p-6">
          {activeTab === 'settings' ? (
            <AccountSettingsCards />
          ) : (
            <SecuritySettingsCards />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
