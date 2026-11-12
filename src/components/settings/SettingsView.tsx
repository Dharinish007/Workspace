import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsContent } from './SettingsContent';
import { Sliders, ArrowLeft } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-bg-hover border border-transparent hover:border-border transition-colors cursor-pointer active:scale-[0.98]"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="p-2 rounded-lg bg-bg-subtle border border-border text-primary">
            <Sliders className="w-5 h-5" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-txt-primary tracking-tight font-sans">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-txt-muted mt-0.5 font-sans">
              Preferences, appearance, module configurations, and local storage
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-bg-card border border-border shadow-card rounded-card p-4 sm:p-6 lg:p-8">
        <SettingsContent />
      </div>
    </div>
  );
};

