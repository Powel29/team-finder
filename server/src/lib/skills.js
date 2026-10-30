const ALIASES = {
  js: 'javascript',
  ts: 'typescript',
  reactjs: 'react',
  'react.js': 'react',
  node: 'node.js',
  nodejs: 'node.js',
  postgres: 'postgresql',
  mongo: 'mongodb',
  ml: 'machine learning',
  py: 'python',
  tailwind: 'tailwind css',
  k8s: 'kubernetes',
  golang: 'go',
  'ui/ux': 'ui/ux design',
  'figma design': 'figma',
};

/** Canonical lowercase key for a skill name. */
export function normalizeSkill(name) {
  const slug = String(name).toLowerCase().trim().replace(/\s+/g, ' ').replace(/^\.+/, '');
  return ALIASES[slug] ?? slug;
}

export const cleanSkillName = (name) => String(name).trim().replace(/\s+/g, ' ');
