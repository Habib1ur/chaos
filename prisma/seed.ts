import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
  {
    id: 'king-of-chaos',
    name: 'King of Chaos',
    description: 'Be crowned the King in King’s Truth or Dare.',
    icon: '👑',
    points: 100,
  },
  {
    id: 'truth-machine',
    name: 'Truth Machine',
    description: 'Complete 10 Truth prompts without skipping.',
    icon: '💬',
    points: 75,
  },
  {
    id: 'daredevil',
    name: 'Daredevil',
    description: 'Complete 10 Dare challenges.',
    icon: '🔥',
    points: 100,
  },
  {
    id: 'master-detective',
    name: 'Master Detective',
    description: 'Correctly guess the author 5 times in Who Said That?',
    icon: '🕵️',
    points: 120,
  },
  {
    id: 'anonymous-legend',
    name: 'Anonymous Legend',
    description: 'Fool the entire room with an anonymous confession.',
    icon: '🎭',
    points: 100,
  },
  {
    id: 'party-starter',
    name: 'Party Starter',
    description: 'Host your first multiplayer CHAOS room.',
    icon: '🎉',
    points: 50,
  },
  {
    id: 'quiz-genius',
    name: 'Quiz Genius',
    description: 'Win a Quick Quiz session.',
    icon: '🧠',
    points: 90,
  },
];

async function main() {
  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { id: achievement.id },
      update: achievement,
      create: achievement,
    });
  }

  console.log(`Seeded ${ACHIEVEMENTS.length} achievements.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
