export const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', hint: 'Learning the basics, eager to build' },
  { value: 'INTERMEDIATE', label: 'Intermediate', hint: 'Comfortable shipping features' },
  { value: 'ADVANCED', label: 'Advanced', hint: 'Can lead and mentor others' },
];

export const PROJECT_TYPES = [
  { value: 'HACKATHON', label: 'Hackathon' },
  { value: 'STARTUP', label: 'Startup' },
  { value: 'OPEN_SOURCE', label: 'Open source' },
  { value: 'COURSE_PROJECT', label: 'Course project' },
];

export const levelLabel = (v) => LEVELS.find((l) => l.value === v)?.label ?? v;
export const typeLabel = (v) => PROJECT_TYPES.find((t) => t.value === v)?.label ?? v;
