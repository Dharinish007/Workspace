import { TimeSegment, TimerSession, ValidationResult, ValidationError } from '../types';

export function validateTimerSession(
  session: Partial<TimerSession>,
  existingSessions: TimerSession[] = [],
  now: number = Date.now(),
  clockSkewToleranceMs: number = 60000 // 1 minute tolerance for minor clock drift
): ValidationResult {
  const errors: ValidationError[] = [];

  // Rule 9: Label or linked task must exist
  const hasLabel = session.label && session.label.trim().length > 0;
  const hasTask = !!session.taskId;
  if (!hasLabel && !hasTask) {
    errors.push({
      field: 'label',
      message: 'A session label or linked task is required.',
    });
  }

  // Rule 10: Timestamps must be valid numbers
  if (session.startedAt == null || isNaN(session.startedAt) || session.startedAt <= 0) {
    errors.push({
      field: 'startedAt',
      message: 'Start time must be a valid timestamp.',
    });
  }

  if (session.endedAt == null || isNaN(session.endedAt) || session.endedAt <= 0) {
    errors.push({
      field: 'endedAt',
      message: 'End time must be a valid timestamp.',
    });
  }

  // Rule 1: End time must be after start time
  if (
    session.startedAt != null &&
    session.endedAt != null &&
    session.endedAt <= session.startedAt
  ) {
    errors.push({
      field: 'endedAt',
      message: 'End time must be after start time.',
    });
  }

  // Rule 2: At least one active segment must exist
  const segments = session.segments || [];
  if (segments.length === 0) {
    errors.push({
      field: 'segments',
      message: 'Session must contain at least one active segment.',
    });
  }

  // Validate individual segments
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Rule 10 inside segment
    if (seg.start == null || isNaN(seg.start) || seg.start <= 0) {
      errors.push({
        field: `segments[${i}].start`,
        message: `Segment ${i + 1} has an invalid start time.`,
      });
      continue;
    }

    // Rule 7: No open segment may remain on save
    if (seg.end == null) {
      errors.push({
        field: `segments[${i}].end`,
        message: `Segment ${i + 1} is still open. All segments must be closed before saving.`,
      });
      continue;
    }

    if (isNaN(seg.end)) {
      errors.push({
        field: `segments[${i}].end`,
        message: `Segment ${i + 1} has an invalid end time.`,
      });
      continue;
    }

    // Rule 3: Every completed segment must have a positive duration
    if (seg.end <= seg.start) {
      errors.push({
        field: `segments[${i}]`,
        message: `Segment ${i + 1} must have a positive duration (end time after start time).`,
      });
    }

    // Rule 5: Segments must fall within session time range
    if (session.startedAt != null && seg.start < session.startedAt) {
      errors.push({
        field: `segments[${i}].start`,
        message: `Segment ${i + 1} starts before the session start time.`,
      });
    }

    if (session.endedAt != null && seg.end > session.endedAt) {
      errors.push({
        field: `segments[${i}].end`,
        message: `Segment ${i + 1} ends after the session end time.`,
      });
    }

    // Rule 6: No segment may extend into the future
    if (seg.end > now + clockSkewToleranceMs) {
      errors.push({
        field: `segments[${i}].end`,
        message: `Segment ${i + 1} extends into the future.`,
      });
    }
  }

  // Rule 4: Segments must not overlap with each other
  for (let i = 0; i < segments.length; i++) {
    const s1 = segments[i];
    if (s1.start == null || s1.end == null) continue;

    for (let j = i + 1; j < segments.length; j++) {
      const s2 = segments[j];
      if (s2.start == null || s2.end == null) continue;

      // Overlap condition: max(s1.start, s2.start) < min(s1.end, s2.end)
      const overlapStart = Math.max(s1.start, s2.start);
      const overlapEnd = Math.min(s1.end, s2.end);
      if (overlapStart < overlapEnd) {
        errors.push({
          field: 'segments',
          message: `Segment ${i + 1} and Segment ${j + 1} overlap with each other.`,
        });
      }
    }
  }

  // Rule 8: No overlap with another saved session's active segments
  if (existingSessions && existingSessions.length > 0) {
    const otherSavedSessions = existingSessions.filter(
      s => (!session.id || s.id !== session.id) && s.status === 'saved'
    );

    for (const other of otherSavedSessions) {
      for (const otherSeg of other.segments) {
        if (otherSeg.start == null || otherSeg.end == null) continue;

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          if (seg.start == null || seg.end == null) continue;

          const overlapStart = Math.max(seg.start, otherSeg.start);
          const overlapEnd = Math.min(seg.end, otherSeg.end);

          if (overlapStart < overlapEnd) {
            errors.push({
              field: 'segments',
              message: `Segment ${i + 1} overlaps with another saved session ("${other.label || 'Focus'}").`,
            });
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
