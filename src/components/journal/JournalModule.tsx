import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { JournalList } from './JournalList';
import { JournalEditor } from './JournalEditor';
import { JournalEntry } from '../../types';
import { generateUUID, nowISO, formatLocalDate } from '../../db/indexedDB';

export const JournalModule: React.FC = () => {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const { journalEntries, saveJournalEntry } = useWorkspace();
  const seededRef = useRef(false);

  // Seed sample initial journal entries if empty (matching the attached screenshot)
  useEffect(() => {
    if (seededRef.current || journalEntries.length > 0) return;
    seededRef.current = true;

    const seedEntries = async () => {
      const now = new Date();
      const formatOffset = (offsetDays: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() - offsetDays);
        return formatLocalDate(d);
      };

      const sampleData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          date: formatOffset(0),
          title: 'A productive day',
          body: 'Completed internship tasks and learnt a lot today. Looking forward to tomorrow\'s challenges and making more progress on my personal workspace goals!',
          mood: 'great',
          tags: ['work', 'learning'],
        },
        {
          date: formatOffset(1),
          title: 'Small progress, but happy',
          body: 'Fixed the extension bug and pushed the changes to the repository. Small consistent steps make a huge difference over time.',
          mood: 'good',
          tags: ['project'],
        },
        {
          date: formatOffset(2),
          title: 'Reflecting on my goals',
          body: 'Revisited my 3-month plan. Need to be more disciplined with my morning routines, habits, and daily deep work sessions.',
          mood: 'neutral',
          tags: ['goals', 'self'],
        },
        {
          date: formatOffset(3),
          title: 'A calm day',
          body: 'Took a break, watched a good video and felt better after an evening walk. Rest is just as essential as focused effort.',
          mood: 'good',
          tags: ['life', 'mood'],
        },
      ];

      for (const item of sampleData) {
        await saveJournalEntry({
          ...item,
          id: generateUUID(),
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
      }
    };

    seedEntries();
  }, [journalEntries.length, saveJournalEntry]);

  if (date) {
    return (
      <JournalEditor
        date={date}
        onBack={() => navigate('/journal')}
      />
    );
  }

  return (
    <JournalList
      onOpenDate={(selectedDate: string) => navigate(`/journal/${selectedDate}`)}
    />
  );
};

