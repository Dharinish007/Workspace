import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HabitViewTemplate, Habit } from '../../types';
import { HabitTableView } from './HabitTableView';
import { HabitCardView } from './HabitCardView';
import { HabitHeatmapView } from './HabitHeatmapView';
import { HabitModal } from './HabitModal';
import { 
  Table, 
  LayoutGrid, 
  Flame, 
  Plus, 
  Calendar, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { motion } from 'framer-motion';

export const HabitModule: React.FC = () => {
  const { habits, deleteHabit } = useWorkspace();

  const [viewTemplate, setViewTemplate] = useState<HabitViewTemplate>('table');
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (timeframe === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (timeframe === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: 15 }}
              className="p-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400"
            >
              <Flame className="w-6 h-6" />
            </motion.div>
            <h1 className="text-3xl font-serif font-bold text-txt-primary tracking-tight">
              Habit Tracker
            </h1>
          </div>
          <p className="text-xs font-sans text-txt-muted mt-1">
            Build long-term consistency through daily execution and streaks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Template Switcher: Table | Card | Heatmap */}
          <div className="flex items-center bg-bg-card border border-border rounded-xl p-1 shadow-xs relative">
            {[
              { id: 'table' as HabitViewTemplate, label: 'Table', icon: Table },
              { id: 'card' as HabitViewTemplate, label: 'Cards', icon: LayoutGrid },
              { id: 'heatmap' as HabitViewTemplate, label: 'Heatmap', icon: Calendar },
            ].map(t => {
              const Icon = t.icon;
              const isSelected = viewTemplate === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setViewTemplate(t.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded-lg transition-colors cursor-pointer z-10 ${
                    isSelected ? 'text-white' : 'text-txt-secondary hover:text-txt-primary'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="habitTemplatePill"
                      className="absolute inset-0 bg-teal-600 rounded-lg -z-10 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Table timeframe switcher & navigation (when Table view) */}
          {viewTemplate === 'table' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-bg-card border border-border rounded-xl p-1 text-xs font-sans shadow-xs">
                <button
                  onClick={() => setTimeframe('week')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    timeframe === 'week'
                      ? 'bg-bg-subtle text-txt-primary'
                      : 'text-txt-muted hover:text-txt-primary'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setTimeframe('month')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    timeframe === 'month'
                      ? 'bg-bg-subtle text-txt-primary'
                      : 'text-txt-muted hover:text-txt-primary'
                  }`}
                >
                  Month
                </button>
              </div>

              <div className="flex items-center gap-1 bg-bg-card border border-border rounded-xl p-1 text-xs font-sans shadow-xs">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrev}
                  className="p-1 rounded hover:bg-bg-hover text-txt-secondary cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                <button
                  onClick={handleToday}
                  className="px-2 py-0.5 font-bold hover:bg-bg-hover rounded text-txt-primary cursor-pointer"
                >
                  Today
                </button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext}
                  className="p-1 rounded hover:bg-bg-hover text-txt-secondary cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}

          {/* Add Habit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            onClick={() => {
              setHabitToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-sans font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Habit</span>
          </motion.button>
        </div>
      </div>

      {/* Main View Content */}
      {viewTemplate === 'table' && (
        <HabitTableView
          habits={habits}
          timeframe={timeframe}
          currentDate={currentDate}
          onEditHabit={h => {
            setHabitToEdit(h);
            setIsModalOpen(true);
          }}
          onDeleteHabit={id => deleteHabit(id)}
        />
      )}

      {viewTemplate === 'card' && (
        <HabitCardView
          habits={habits}
          onEditHabit={h => {
            setHabitToEdit(h);
            setIsModalOpen(true);
          }}
          onDeleteHabit={id => deleteHabit(id)}
        />
      )}

      {viewTemplate === 'heatmap' && (
        <HabitHeatmapView habits={habits} />
      )}

      {/* Habit Create / Edit Modal */}
      <HabitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setHabitToEdit(null);
        }}
        habitToEdit={habitToEdit}
      />
    </div>
  );
};
