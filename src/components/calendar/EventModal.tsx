import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CalendarEvent } from '../../types';
import { X, Calendar, Clock, Tag, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
  defaultDate?: string;
}

const EVENT_COLORS = [
  '#F97316', // Orange (Default)
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  defaultDate,
}) => {
  const { createEvent, updateEvent, deleteEvent } = useWorkspace();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('#F97316');
  const [category, setCategory] = useState('Event / Meeting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDate(eventToEdit.date);
      setStartTime(eventToEdit.startTime || '');
      setEndTime(eventToEdit.endTime || '');
      setColor(eventToEdit.color || '#F97316');
      setCategory(eventToEdit.category || 'Event / Meeting');
    } else {
      setTitle('');
      setDate(defaultDate || new Date().toISOString().slice(0, 10));
      setStartTime('');
      setEndTime('');
      setColor('#F97316');
      setCategory('Event / Meeting');
    }
    setError(null);
  }, [eventToEdit, defaultDate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Event title is required');
      return;
    }
    if (!date) {
      setError('Date is required');
      return;
    }

    try {
      if (eventToEdit) {
        await updateEvent(eventToEdit.id, {
          title: title.trim(),
          date,
          startTime: startTime || null,
          endTime: endTime || null,
          color,
          category,
        });
      } else {
        await createEvent({
          title: title.trim(),
          date,
          startTime: startTime || null,
          endTime: endTime || null,
          color,
          category,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit) return;
    try {
      await deleteEvent(eventToEdit.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-md overflow-hidden flex flex-col z-10 font-sans"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-serif font-bold text-txt-primary tracking-tight">
                {eventToEdit ? 'Edit Event' : 'Create Event'}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-subtle text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-2.5 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Team Meeting, Exam, Dentist..."
                  className="w-full px-3.5 py-2 text-sm bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date *</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-txt-secondary mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Start Time</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-txt-secondary mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>End Time</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Category</span>
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Event / Meeting, Call, Appointment"
                  className="w-full px-3.5 py-2 text-sm bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-2">
                  Color Tag
                </label>
                <div className="flex items-center gap-2.5">
                  {EVENT_COLORS.map(c => (
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full shadow-xs cursor-pointer transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                {eventToEdit ? (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </motion.button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:bg-bg-subtle rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {eventToEdit ? 'Save Changes' : 'Create Event'}
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
