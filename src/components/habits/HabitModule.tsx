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

  const formattedPeriod = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <h1 className="text-2xl font-bold text-txt-primary tracking-tight">
              Habit Tracker
            </h1>
          </div>
          <p className="text-xs text-txt-muted mt-0.5">
            Build long-term consistency through daily execution and streaks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Template Switcher: Table | Card | Heatmap */}
          <div className="flex items-center bg-bg-card border border-border rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewTemplate('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewTemplate === 'table'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>

            <button
              onClick={() => setViewTemplate('card')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewTemplate === 'card'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>

            <button
              onClick={() => setViewTemplate('heatmap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewTemplate === 'heatmap'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Heatmap</span>
            </button>
          </div>

          {/* Table timeframe switcher & navigation (when Table view) */}
          {viewTemplate === 'table' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-bg-card border border-border rounded-xl p-1 text-xs shadow-xs">
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

              <div className="flex items-center gap-1 bg-bg-card border border-border rounded-xl p-1 text-xs shadow-xs">
                <button
                  onClick={handlePrev}
                  className="p-1 rounded hover:bg-bg-hover text-txt-secondary cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-2 py-0.5 font-bold hover:bg-bg-hover rounded text-txt-primary cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={handleNext}
                  className="p-1 rounded hover:bg-bg-hover text-txt-secondary cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Add Habit Button */}
          <button
            onClick={() => {
              setHabitToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Habit</span>
          </button>
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

