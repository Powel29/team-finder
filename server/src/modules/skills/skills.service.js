import { prisma } from '../../lib/prisma.js';
import { cache } from '../../lib/cache.js';
import { cleanSkillName, normalizeSkill } from '../../lib/skills.js';

const MAX_RESULTS = 50;
const publicSkill = (s) => ({ id: s.id, name: s.name });

export async function listSkills(q, ids = []) {
  if (ids.length)
    return (await prisma.skill.findMany({ where: { id: { in: ids } }, orderBy: { name: 'asc' } })).map(publicSkill);
  const version = await cache.version('skills');
  const all = await cache.getOrSet(`skills:all:v${version}`, 600, () =>
    prisma.skill.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
  );
  const needle = q ? normalizeSkill(q) : '';
  const matches = needle ? all.filter((s) => s.slug.includes(needle) || s.name.toLowerCase().includes(needle)) : all;
  return matches.slice(0, MAX_RESULTS).map(publicSkill);
}

/** Creates a skill unless one with the same normalised slug exists. Safe under concurrent calls. */
export async function findOrCreateSkill(name, db = prisma) {
  const slug = normalizeSkill(name);
  const existing = await db.skill.findUnique({ where: { slug } });
  if (existing) return existing;
  const display = cleanSkillName(name).replace(/^\.+/, '');
  const skill = await db.skill.upsert({
    where: { slug },
    create: { slug, name: display },
    update: {},
  });
  await cache.bump('skills');
  return skill;
}

export async function createSkill(name) {
  return publicSkill(await findOrCreateSkill(name));
}

/**
 * Resolves ids and free-text names to a de-duplicated list of skill ids.
 * @param {{ skillIds?: string[], skillNames?: string[] }} input
 */
export async function resolveSkillIds({ skillIds = [], skillNames = [] }, db = prisma) {
  const found = skillIds.length
    ? await db.skill.findMany({ where: { id: { in: skillIds } }, select: { id: true } })
    : [];
  const created = [];
  for (const name of skillNames) created.push(await findOrCreateSkill(name, db));
  return [...new Set([...found.map((s) => s.id), ...created.map((s) => s.id)])];
}
