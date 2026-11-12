import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsContent } from './SettingsContent';
import { Sliders, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export const SettingsView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-txt-secondary hover:text-txt-primary hover:bg-bg-card border border-transparent hover:border-border transition-colors cursor-pointer"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <div className="p-2.5 rounded-xl bg-primary-light text-primary">
            <Sliders className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-txt-primary tracking-tight font-serif">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-txt-muted mt-0.5 font-sans">
              Preferences, appearance, module configurations, and local storage
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-bg-card border border-border shadow-card rounded-2xl p-4 sm:p-6 lg:p-8">
        <SettingsContent />
      </div>
    </div>
  );
};

