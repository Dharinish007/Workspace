import React, { useRef, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task } from '../../types';
import { 
  Star, 
  Calendar, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ArrowRightLeft,
  GripVertical,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatLocalDate } from '../../db/indexedDB';

interface TaskItemProps {
  task: Task;
  serialNumber: number;
  onEdit: (task: Task) => void;
  onMove: (task: Task) => void;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetTaskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  serialNumber,
  onEdit,
  onMove,
  isDraggable,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const { 
    toggleTaskCompleted, 
    updateTask, 
    deleteTask, 
    highlightedTaskId, 
    setHighlightedTaskId 
  } = useWorkspace();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const isHighlighted = highlightedTaskId === task.id;

  // Scroll into view if highlighted
  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => {
        setHighlightedTaskId(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, setHighlightedTaskId, task.id]);

  const todayStr = formatLocalDate(new Date());
  const isOverdue = !!task.dueDate && task.dueDate < todayStr && !task.completed;
  const isDueToday = !!task.dueDate && task.dueDate === todayStr && !task.completed;

  const toggleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { important: !task.important });
  };

  return (
    <motion.div
      ref={itemRef}
      draggable={isDraggable}
      onDragStart={e => onDragStart && onDragStart(e as any, task.id)}
      onDragOver={onDragOver}
      onDrop={e => onDrop && onDrop(e as any, task.id)}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className={`group relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 ${
        isHighlighted
          ? 'ring-2 ring-primary border-primary bg-primary-light/40 shadow-md'
          : task.completed
          ? 'bg-bg-subtle/50 border-border text-txt-muted'
          : 'bg-bg-card border-border hover:border-primary/40 hover:shadow-xs'
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        {/* Drag handle */}
        {isDraggable && (
          <div className="cursor-grab active:cursor-grabbing text-txt-muted opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Serial number */}
        <span className="text-xs font-mono font-medium text-txt-muted w-6 text-right flex-shrink-0 select-none">
          {serialNumber}.
        </span>

        {/* Tactile Checkbox with animated SVG checkmark */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          onClick={() => toggleTaskCompleted(task.id)}
          className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all duration-150 cursor-pointer flex-shrink-0 ${
            task.completed
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
              : 'border-border hover:border-primary bg-bg-card'
          }`}
          title={task.completed ? 'Mark incomplete' : 'Mark completed'}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark completed'}
        >
          {task.completed ? (
            <svg 
              className="w-4 h-4 stroke-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <motion.path
                d="M20 6L9 17L4 12"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 25 }}
              />
            </svg>
          ) : null}
        </motion.button>

        {/* Task Title */}
        <div className="flex-1 min-w-0 pr-2">
          <span
            className={`text-sm sm:text-base font-sans font-medium transition-colors block break-words ${
              task.completed 
                ? 'line-through text-txt-muted' 
                : 'text-txt-primary'
            }`}
            title={task.title}
          >
            {task.title}
          </span>
        </div>
      </div>

      {/* Right metadata and actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Due date badge */}
        {task.dueDate && (
          <div
            className={`flex items-center gap-1.5 text-xs font-sans px-2.5 py-1 rounded-md font-medium border ${
              isOverdue
                ? 'bg-red-500/10 border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 font-bold'
                : isDueToday
                ? 'bg-amber-500/10 border-amber-300 dark:border-amber-900 text-amber-800 dark:text-amber-400 font-bold'
                : 'bg-bg-subtle border-border text-txt-secondary'
            }`}
          >
            {isOverdue && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-txt-muted" />
            <span>
              {isDueToday ? 'Today' : task.dueDate}
            </span>
          </div>
        )}

        {/* Priority tag */}
        {task.priority === 'high' && (
          <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            High
          </span>
        )}
        {task.priority === 'medium' && (
          <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            Medium
          </span>
        )}
        {task.priority === 'low' && (
          <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
            Low
          </span>
        )}

        {/* Star button with 32px clickable target */}
        <button
          type="button"
          onClick={toggleStar}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-muted hover:text-amber-500 hover:bg-bg-subtle transition-colors cursor-pointer active:scale-95"
          title={task.important ? 'Unmark important' : 'Mark important'}
          aria-label={task.important ? 'Unmark important' : 'Mark important'}
        >
          <Star
            className={`w-4 h-4 ${
              task.important ? 'fill-amber-400 text-amber-400' : 'text-txt-muted'
            }`}
          />
        </button>

        {/* Action dropdown */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-bg-subtle transition-colors cursor-pointer"
            title="Task options"
            aria-label="Task options"
          >
            <MoreVertical className="w-4 h-4" />
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setMenuOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute right-0 top-full mt-1.5 w-44 bg-bg-card border border-border shadow-modal rounded-xl py-1.5 z-30 overflow-hidden font-sans"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(task);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-medium text-txt-secondary hover:text-txt-primary hover:bg-bg-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-txt-muted" />
                    <span>Edit task</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onMove(task);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-medium text-txt-secondary hover:text-txt-primary hover:bg-bg-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-txt-muted" />
                    <span>Move to page</span>
                  </button>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      deleteTask(task.id);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
