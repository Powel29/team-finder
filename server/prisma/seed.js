/* Seeds the skill catalogue and a populated demo dataset. Safe to re-run: demo data is skipped once alice@demo.dev exists. */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { normalizeSkill } from '../src/lib/skills.js';
import { computeMatch } from '../src/lib/match.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const PASSWORD = 'Password123!';
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms) => new Date(Date.now() - ms);
const fromNow = (days) => new Date(Date.now() + days * DAY);

const SKILLS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Vue',
  'Angular',
  'Svelte',
  'Tailwind CSS',
  'HTML/CSS',
  'Node.js',
  'Express',
  'NestJS',
  'Python',
  'Django',
  'Flask',
  'FastAPI',
  'Java',
  'Spring Boot',
  'C++',
  'C#',
  '.NET',
  'Go',
  'Rust',
  'Kotlin',
  'Swift',
  'Flutter',
  'React Native',
  'Android',
  'iOS',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Firebase',
  'Supabase',
  'GraphQL',
  'REST APIs',
  'Docker',
  'Kubernetes',
  'AWS',
  'GCP',
  'Azure',
  'Git',
  'CI/CD',
  'Linux',
  'Machine Learning',
  'Deep Learning',
  'PyTorch',
  'TensorFlow',
  'NLP',
  'Computer Vision',
  'Data Analysis',
  'Pandas',
  'SQL',
  'Figma',
  'UI/UX Design',
  'Product Management',
  'Technical Writing',
  'Pitching',
  'Marketing',
  'Cybersecurity',
  'Blockchain',
  'Solidity',
  'Unity',
  'Game Design',
  'Embedded/IoT',
  'Arduino',
];

const MEMBERS = [
  [
    'alice',
    'Alice Johnson',
    'Full-stack dev and hackathon organiser',
    'ADVANCED',
    15,
    ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Git'],
    ['HACKATHON', 'STARTUP'],
    ['EdTech', 'AI'],
  ],
  [
    'bob',
    'Bob Martinez',
    'Backend engineer who loves marketplaces',
    'ADVANCED',
    12,
    ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'AWS', 'REST APIs'],
    ['STARTUP'],
    ['Fintech', 'Marketplaces'],
  ],
  [
    'carol',
    'Carol Nguyen',
    'Rustacean and CLI tool enthusiast',
    'ADVANCED',
    10,
    ['Rust', 'C++', 'Linux', 'Git', 'Go'],
    ['OPEN_SOURCE'],
    ['Developer tooling', 'Compilers'],
  ],
  [
    'dave',
    'Dave Okafor',
    'Embedded systems and IoT tinkerer',
    'INTERMEDIATE',
    8,
    ['Embedded/IoT', 'Arduino', 'C++', 'Python', 'Linux'],
    ['COURSE_PROJECT', 'HACKATHON'],
    ['Robotics', 'Smart homes'],
  ],
  [
    'erin',
    'Erin Park',
    'Data storyteller with a climate focus',
    'INTERMEDIATE',
    10,
    ['Python', 'Pandas', 'Data Analysis', 'SQL', 'Machine Learning'],
    ['HACKATHON'],
    ['Climate', 'Open data'],
  ],
  [
    'frank',
    'Frank Silva',
    'Product-minded Java engineer',
    'ADVANCED',
    6,
    ['Java', 'Spring Boot', 'MySQL', 'Docker', 'Kubernetes'],
    ['STARTUP'],
    ['Banking', 'Platform engineering'],
  ],
  [
    'grace',
    'Grace Lee',
    'UI/UX designer who also codes',
    'INTERMEDIATE',
    12,
    ['Figma', 'UI/UX Design', 'HTML/CSS', 'React', 'Pitching'],
    ['HACKATHON', 'STARTUP'],
    ['Accessibility', 'Design systems'],
  ],
  [
    'heidi',
    'Heidi Müller',
    'ML student into language models',
    'INTERMEDIATE',
    15,
    ['Python', 'PyTorch', 'Machine Learning', 'NLP', 'TensorFlow', 'Deep Learning'],
    ['HACKATHON', 'COURSE_PROJECT'],
    ['LLMs', 'Education'],
  ],
  [
    'ivan',
    'Ivan Petrov',
    'Mobile developer shipping apps',
    'INTERMEDIATE',
    10,
    ['Flutter', 'Kotlin', 'Android', 'Firebase', 'React Native'],
    ['STARTUP', 'HACKATHON'],
    ['Mobile', 'Campus life'],
  ],
  [
    'judy',
    'Judy Chen',
    'Frontend dev looking for a first hackathon team',
    'INTERMEDIATE',
    14,
    ['React', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'Git', 'TypeScript'],
    ['HACKATHON', 'COURSE_PROJECT'],
    ['Web apps', 'Data visualisation'],
  ],
  [
    'ken',
    'Ken Watanabe',
    'Beginner exploring web development',
    'BEGINNER',
    6,
    ['HTML/CSS', 'JavaScript', 'Python'],
    ['COURSE_PROJECT', 'HACKATHON'],
    ['Games'],
  ],
  [
    'lena',
    'Lena Kowalski',
    'Cybersecurity and DevOps enthusiast',
    'ADVANCED',
    5,
    ['Cybersecurity', 'Linux', 'Docker', 'Python', 'CI/CD'],
    ['OPEN_SOURCE', 'STARTUP'],
    ['Security', 'Automation'],
  ],
];

// owner, name, idea, type, size, deadline (days from now), tech, status, roles
const TEAMS = [
  [
    'alice',
    'AI Study Buddy',
    'A study companion that turns lecture notes into quizzes and adaptive revision plans for university students.',
    'HACKATHON',
    5,
    30,
    ['React', 'Node.js', 'PyTorch', 'Tailwind CSS'],
    'OPEN',
    [
      {
        title: 'Frontend',
        slots: 2,
        req: ['React', 'TypeScript'],
        nice: ['Tailwind CSS'],
        minLevel: 'INTERMEDIATE',
        minHours: 8,
      },
      { title: 'ML Engineer', slots: 1, req: ['Python', 'Machine Learning'], nice: ['PyTorch', 'NLP'], minHours: 10 },
      { title: 'Designer', slots: 1, req: ['Figma', 'UI/UX Design'], nice: ['HTML/CSS'] },
    ],
  ],
  [
    'bob',
    'Campus Marketplace',
    'A trusted marketplace where students buy, sell and swap textbooks, furniture and gear within their campus.',
    'STARTUP',
    4,
    60,
    ['React Native', 'Node.js', 'PostgreSQL'],
    'OPEN',
    [
      {
        title: 'Backend',
        slots: 1,
        req: ['Node.js', 'PostgreSQL'],
        nice: ['Redis', 'Docker'],
        minLevel: 'INTERMEDIATE',
        minHours: 8,
      },
      { title: 'Mobile', slots: 1, req: ['React Native'], nice: ['Firebase'], minHours: 8 },
    ],
  ],
  [
    'carol',
    'DevTools CLI',
    'An open-source command line tool that scaffolds, lints and benchmarks small projects in a single binary.',
    'OPEN_SOURCE',
    4,
    45,
    ['Rust', 'Linux', 'Git'],
    'OPEN',
    [{ title: 'Rust Dev', slots: 2, req: ['Rust'], nice: ['Linux', 'Git'], minHours: 4 }],
  ],
  [
    'dave',
    'Plant Monitor',
    'A sensor network that tracks soil moisture and light for campus greenhouses and alerts gardeners.',
    'COURSE_PROJECT',
    3,
    20,
    ['Arduino', 'Embedded/IoT', 'Python', 'PostgreSQL'],
    'OPEN',
    [
      { title: 'Embedded', slots: 1, req: ['Embedded/IoT', 'Arduino'], nice: ['C++'] },
      { title: 'Backend', slots: 1, req: ['Python'], nice: ['PostgreSQL', 'REST APIs'] },
    ],
  ],
  [
    'erin',
    'Climate Dashboard',
    'An interactive dashboard that makes open climate datasets understandable for students and local councils.',
    'HACKATHON',
    4,
    14,
    ['React', 'Python', 'Pandas', 'Data Analysis'],
    'OPEN',
    [
      { title: 'Data Analyst', slots: 1, req: ['Python', 'Data Analysis'], nice: ['Pandas', 'SQL'], minHours: 8 },
      { title: 'Frontend', slots: 1, req: ['React'], nice: ['TypeScript', 'Tailwind CSS'], minHours: 8 },
    ],
  ],
  [
    'frank',
    'Ledger Lite',
    'A lightweight double-entry ledger service for student clubs and societies to track budgets.',
    'STARTUP',
    3,
    10,
    ['Java', 'Spring Boot', 'MySQL'],
    'CLOSED',
    [
      { title: 'Backend', slots: 1, req: ['Java', 'Spring Boot'], nice: ['MySQL'] },
      { title: 'DevOps', slots: 1, req: ['Docker'], nice: ['CI/CD', 'Linux'] },
    ],
  ],
];

// [type, sender, recipient, team, role, status, message, ageDays]
const REQUESTS = [
  [
    'JOIN_REQUEST',
    'judy',
    'alice',
    'AI Study Buddy',
    'Frontend',
    'PENDING',
    "Hi Alice! I've built several React dashboards with Tailwind and would love to join the Frontend squad.",
    1,
  ],
  [
    'JOIN_REQUEST',
    'ken',
    'alice',
    'AI Study Buddy',
    'Frontend',
    'PENDING',
    "I'm still learning but I can commit 6 hours a week and I learn fast.",
    2,
  ],
  [
    'JOIN_REQUEST',
    'grace',
    'alice',
    'AI Study Buddy',
    'Designer',
    'PENDING',
    'I can own the UX flows and a Figma design system for the quiz experience.',
    1,
  ],
  [
    'INVITE',
    'erin',
    'judy',
    'Climate Dashboard',
    'Frontend',
    'PENDING',
    'Your React work looks great. Want to build the charts layer with us?',
    1,
  ],
  [
    'INVITE',
    'carol',
    'judy',
    'DevTools CLI',
    'Rust Dev',
    'PENDING',
    'We also need docs and a website. Interested in learning some Rust along the way?',
    3,
  ],
  [
    'INVITE',
    'alice',
    'heidi',
    'AI Study Buddy',
    'ML Engineer',
    'ACCEPTED',
    'Your NLP background is exactly what our quiz generator needs.',
    9,
  ],
  [
    'JOIN_REQUEST',
    'ivan',
    'bob',
    'Campus Marketplace',
    'Mobile',
    'ACCEPTED',
    'I have shipped two React Native apps and can start this week.',
    8,
  ],
  [
    'JOIN_REQUEST',
    'ken',
    'dave',
    'Plant Monitor',
    'Embedded',
    'DECLINED',
    'I have an Arduino starter kit and plenty of enthusiasm.',
    6,
  ],
  [
    'JOIN_REQUEST',
    'carol',
    'frank',
    'Ledger Lite',
    'Backend',
    'ACCEPTED',
    'Happy to help with the core ledger service.',
    12,
  ],
  [
    'JOIN_REQUEST',
    'lena',
    'frank',
    'Ledger Lite',
    'DevOps',
    'ACCEPTED',
    'I can set up CI/CD and hardening for the service.',
    11,
  ],
];

// [team, member, role title]
const MEMBERSHIPS = [
  ['AI Study Buddy', 'heidi', 'ML Engineer'],
  ['Campus Marketplace', 'ivan', 'Mobile'],
  ['Ledger Lite', 'carol', 'Backend'],
  ['Ledger Lite', 'lena', 'DevOps'],
];

const CHAT = [
  ['alice', 'Welcome to the AI Study Buddy channel! 🎉'],
  ['heidi', 'Hey Alice, thanks for the invite. Excited to work on the quiz generator.'],
  ['alice', 'Great. I was thinking we use a small transformer to draft questions from lecture notes.'],
  ['heidi', 'Makes sense. I can prototype it in PyTorch this weekend.'],
  ['alice', 'Perfect. I will sketch the API contract so the frontend can start in parallel.'],
  ['heidi', 'Do we need user accounts for the demo?'],
  ['alice', 'Just simple email login. Judging is mostly on the study flow.'],
  ['heidi', 'Got it. I will keep inference behind a single /generate endpoint.'],
  ['alice', 'Nice. We still need two frontend devs and a designer.'],
  ['heidi', 'I saw a few good requests come in. Judy looks strong.'],
  ['alice', 'Agreed, reviewing those today.'],
  ['heidi', 'Dataset update: I found a public lecture-notes corpus we can fine-tune on.'],
  ['alice', 'Amazing, drop the link in the repo README.'],
  ['heidi', 'Done ✅'],
  ['alice', 'Standup tomorrow at 6pm?'],
];

async function seedSkills() {
  for (const name of SKILLS) {
    const slug = normalizeSkill(name);
    await prisma.skill.upsert({ where: { slug }, create: { slug, name }, update: {} });
  }
  return Object.fromEntries((await prisma.skill.findMany()).map((s) => [s.slug, s]));
}

const roleToMatchInput = (role, team) => ({
  requiredSkills: role.req.map(normalizeSkill),
  niceToHaveSkills: role.nice.map(normalizeSkill),
  minLevel: role.minLevel ?? null,
  minHoursPerWeek: role.minHours ?? null,
  teamType: team[3],
});

async function seedDemo(skillBySlug) {
  const skillId = (name) => skillBySlug[normalizeSkill(name)].id;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const users = {};
  for (const [key, name, headline, level, hrs, skills, lookingFor, interests] of MEMBERS) {
    users[key] = await prisma.user.create({
      data: {
        email: `${key}@demo.dev`,
        name,
        passwordHash,
        memberProfile: {
          create: {
            headline,
            bio: `${name.split(' ')[0]} is a student who enjoys building things with others. Currently looking for teammates who ship.`,
            experienceLevel: level,
            availabilityHrs: hrs,
            githubUrl: `https://github.com/${key}-demo`,
            interests,
            lookingFor,
            skills: { create: skills.map((s) => ({ skillId: skillId(s) })) },
          },
        },
      },
    });
  }

  const teams = {};
  const roles = {};
  for (const team of TEAMS) {
    const [ownerKey, name, idea, type, teamSize, deadlineDays, tech, status, roleDefs] = team;
    const created = await prisma.team.create({
      data: {
        ownerId: users[ownerKey].id,
        name,
        idea,
        type,
        teamSize,
        status,
        deadline: fromNow(deadlineDays),
        tech: { create: tech.map((s) => ({ skillId: skillId(s) })) },
        members: { create: { userId: users[ownerKey].id, isOwner: true } },
      },
    });
    teams[name] = created;
    for (const def of roleDefs) {
      const filled = MEMBERSHIPS.filter(([t, , r]) => t === name && r === def.title).length;
      roles[`${name}/${def.title}`] = {
        def,
        team,
        row: await prisma.role.create({
          data: {
            teamId: created.id,
            title: def.title,
            slots: def.slots,
            filled,
            minLevel: def.minLevel ?? null,
            minHoursPerWeek: def.minHours ?? null,
            skills: {
              create: [
                ...def.req.map((s) => ({ skillId: skillId(s), importance: 'REQUIRED' })),
                ...def.nice.map((s) => ({ skillId: skillId(s), importance: 'NICE_TO_HAVE' })),
              ],
            },
          },
        }),
      };
    }
  }

  for (const [teamName, memberKey, roleTitle] of MEMBERSHIPS) {
    await prisma.teamMember.create({
      data: {
        teamId: teams[teamName].id,
        userId: users[memberKey].id,
        roleId: roles[`${teamName}/${roleTitle}`].row.id,
      },
    });
  }

  const memberKeys = Object.fromEntries(MEMBERS.map((m) => [m[0], m]));
  const scoreFor = (memberKey, roleKey) => {
    const [, , , , , skills, lookingFor] = memberKeys[memberKey];
    const m = memberKeys[memberKey];
    return computeMatch(roleToMatchInput(roles[roleKey].def, roles[roleKey].team), {
      skills: skills.map(normalizeSkill),
      experienceLevel: m[3],
      availabilityHrs: m[4],
      lookingFor,
    }).score;
  };

  const requests = [];
  for (const [type, senderKey, recipientKey, teamName, roleTitle, status, message, ageDays] of REQUESTS) {
    const roleKey = `${teamName}/${roleTitle}`;
    const applicantKey = type === 'INVITE' ? recipientKey : senderKey;
    const createdAt = ago(ageDays * DAY);
    requests.push(
      await prisma.request.create({
        data: {
          type,
          status,
          message,
          teamId: teams[teamName].id,
          roleId: roles[roleKey].row.id,
          senderId: users[senderKey].id,
          recipientId: users[recipientKey].id,
          matchScore: scoreFor(applicantKey, roleKey),
          createdAt,
          respondedAt: status === 'PENDING' ? null : new Date(createdAt.getTime() + 3 * 60 * 60 * 1000),
        },
      }),
    );
  }

  const aliceJudy = scoreFor('judy', 'AI Study Buddy/Frontend');
  const notifications = [
    [
      'alice',
      'REQUEST_RECEIVED',
      'New join request',
      'Judy Chen wants to join Frontend in AI Study Buddy',
      '/dashboard',
      null,
      1,
    ],
    [
      'alice',
      'REQUEST_RECEIVED',
      'New join request',
      'Ken Watanabe wants to join Frontend in AI Study Buddy',
      '/dashboard',
      null,
      2,
    ],
    [
      'alice',
      'REQUEST_RECEIVED',
      'New join request',
      'Grace Lee wants to join Designer in AI Study Buddy',
      '/dashboard',
      null,
      1,
    ],
    [
      'alice',
      'NEW_MATCH',
      'New match',
      `Judy Chen is a ${aliceJudy}% match for Frontend in AI Study Buddy`,
      '/people/judy',
      aliceJudy,
      1,
    ],
    [
      'alice',
      'REQUEST_ACCEPTED',
      'Invite accepted',
      'Heidi Müller accepted your invite for ML Engineer',
      '/teams/AI',
      null,
      9,
      true,
    ],
    ['alice', 'ROLE_FILLED', 'Role filled', 'ML Engineer in AI Study Buddy is now filled', '/teams/AI', null, 9, true],
    [
      'judy',
      'REQUEST_RECEIVED',
      'New invite',
      'Erin Park invited you to Frontend in Climate Dashboard',
      '/dashboard',
      null,
      1,
    ],
    [
      'judy',
      'REQUEST_RECEIVED',
      'New invite',
      'Carol Nguyen invited you to Rust Dev in DevTools CLI',
      '/dashboard',
      null,
      3,
    ],
    [
      'judy',
      'NEW_MATCH',
      'New role matches your skills',
      'Frontend in Climate Dashboard looks like a strong fit',
      '/teams/Climate',
      null,
      2,
    ],
  ];
  for (const [userKey, type, title, body, link, , ageDays, read] of notifications) {
    let resolved = link;
    if (link === '/teams/AI') resolved = `/teams/${teams['AI Study Buddy'].id}`;
    if (link === '/teams/Climate') resolved = `/teams/${teams['Climate Dashboard'].id}`;
    if (link === '/people/judy') resolved = `/people/${users.judy.id}`;
    await prisma.notification.create({
      data: {
        userId: users[userKey].id,
        type,
        title,
        body,
        link: resolved,
        createdAt: ago(ageDays * DAY),
        readAt: read ? ago(ageDays * DAY - 60_000) : null,
      },
    });
  }

  const start = Date.now() - 2 * DAY;
  for (const [index, [senderKey, body]] of CHAT.entries()) {
    await prisma.message.create({
      data: {
        teamId: teams['AI Study Buddy'].id,
        senderId: users[senderKey].id,
        body,
        createdAt: new Date(start + index * 7 * 60 * 1000),
      },
    });
  }

  return requests.length;
}

async function main() {
  const skillBySlug = await seedSkills();
  const alreadySeeded = await prisma.user.findUnique({ where: { email: 'alice@demo.dev' } });
  if (alreadySeeded) {
    console.log('Demo data already present, skipping (run `npm run db:reset` for a fresh copy).');
  } else {
    await seedDemo(skillBySlug);
    console.log(`Seeded ${SKILLS.length} skills, ${MEMBERS.length} members, ${TEAMS.length} teams.`);
  }
  console.log('\nDemo credentials (password for all: %s)', PASSWORD);
  console.log('Email'.padEnd(18), 'Name'.padEnd(16), 'Notes');
  for (const [key, name, headline] of MEMBERS) console.log(`${key}@demo.dev`.padEnd(18), name.padEnd(16), headline);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
