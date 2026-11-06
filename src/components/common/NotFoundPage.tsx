import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto my-12 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto shadow-xs">
        <AlertCircle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-serif text-txt-primary tracking-tight">
          404 — Page Not Found
        </h1>
        <p className="text-sm text-txt-secondary max-w-md mx-auto leading-relaxed">
          The requested route doesn't exist in your workspace. Use the sidebar navigation or jump to a section below.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard')}
          className="h-10 px-5 bg-primary text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-xs hover:bg-primary-hover transition-colors cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Go to Dashboard</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/tasks')}
          className="h-10 px-5 bg-bg-card hover:bg-bg-hover text-txt-secondary border border-border text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
        >
          <CheckSquare className="w-4 h-4" />
          <span>View Tasks & Pages</span>
        </motion.button>
      </div>
    </div>
  );
};

