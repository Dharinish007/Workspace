import React, { useRef, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, Page } from '../../types';
import { 
  CheckSquare, 
  Square, 
  Star, 
  Calendar, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ArrowRightLeft,
  GripVertical,
  AlertCircle
} from 'lucide-react';
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
    <div
      ref={itemRef}
      draggable={isDraggable}
      onDragStart={e => onDragStart && onDragStart(e, task.id)}
      onDragOver={onDragOver}
      onDrop={e => onDrop && onDrop(e, task.id)}
      className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
        isHighlighted
          ? 'ring-2 ring-primary border-primary bg-primary-light/30 shadow-md'
          : task.completed
          ? 'bg-bg-subtle/40 border-border text-txt-muted'
          : 'bg-bg-card border-border hover:border-border hover:shadow-xs'
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
        <span className="text-xs font-mono text-txt-muted w-6 text-right flex-shrink-0">
          {serialNumber}.
        </span>

        {/* Checkbox */}
        <button
          onClick={() => toggleTaskCompleted(task.id)}
          className="text-txt-muted hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
          title={task.completed ? 'Mark incomplete' : 'Mark completed'}
        >
          {task.completed ? (
            <CheckSquare className="w-5 h-5 text-green-500 fill-green-500/10" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>

        {/* Task Title */}
        <div className="flex-1 min-w-0 pr-2">
          <span
            className={`text-sm font-medium transition-all ${
              task.completed ? 'line-through text-txt-muted' : 'text-txt-primary'
            }`}
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
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
              isOverdue
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-semibold'
                : isDueToday
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
                : 'bg-bg-subtle text-txt-muted'
            }`}
          >
            {isOverdue && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>
              {isDueToday ? 'Today' : task.dueDate}
            </span>
          </div>
        )}

        {/* Priority tag */}
        {task.priority === 'high' && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            High
          </span>
        )}
        {task.priority === 'medium' && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            Medium
          </span>
        )}
        {task.priority === 'low' && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            Low
          </span>
        )}

        {/* Star */}
        <button
          onClick={toggleStar}
          className="p-1 rounded-md text-txt-muted hover:text-amber-400 transition-colors cursor-pointer"
          title={task.important ? 'Unmark important' : 'Mark important'}
        >
          <Star
            className={`w-4 h-4 ${
              task.important ? 'fill-amber-400 text-amber-400' : 'text-txt-muted hover:text-amber-400'
            }`}
          />
        </button>

        {/* Action dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-md text-txt-muted hover:text-txt-primary hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-1 w-36 bg-bg-card border border-border shadow-modal rounded-xl py-1 z-30 text-xs">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(task);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-txt-primary hover:bg-bg-hover text-left"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onMove(task);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-txt-primary hover:bg-bg-hover text-left"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Move to Page</span>
                </button>
                <hr className="my-1 border-border" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    deleteTask(task.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-left font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

