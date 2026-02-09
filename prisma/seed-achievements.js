// Seed achievements data
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const achievements = [
    // Workout achievements
    { name: 'First Rep', description: 'Log your first workout set', icon: '🏋️', category: 'workout', requirement: 1 },
    { name: 'Getting Started', description: 'Complete 10 workout sets', icon: '🏋️', category: 'workout', requirement: 10 },
    { name: 'Dedicated', description: 'Complete 50 workout sets', icon: '🔥', category: 'workout', requirement: 50 },
    { name: 'Iron Will', description: 'Complete 100 workout sets', icon: '⭐', category: 'workout', requirement: 100 },
    { name: 'Beast Mode', description: 'Complete 500 workout sets', icon: '🏆', category: 'workout', requirement: 500 },

    // Meal achievements
    { name: 'First Bite', description: 'Log your first meal', icon: '🍽️', category: 'meals', requirement: 1 },
    { name: 'Meal Prepper', description: 'Log 10 meals', icon: '🍽️', category: 'meals', requirement: 10 },
    { name: 'Nutrition Pro', description: 'Log 50 meals', icon: '🎯', category: 'meals', requirement: 50 },
    { name: 'Diet Master', description: 'Log 200 meals', icon: '🏅', category: 'meals', requirement: 200 },

    // Weight tracking achievements
    { name: 'Weight Watcher', description: 'Log your first weight entry', icon: '⚖️', category: 'weight', requirement: 1 },
    { name: 'Consistent Tracker', description: 'Log 10 weight entries', icon: '⚖️', category: 'weight', requirement: 10 },
    { name: 'Data Driven', description: 'Log 30 weight entries', icon: '🎯', category: 'weight', requirement: 30 },
];

async function main() {
    console.log('Seeding achievements...');

    for (const achievement of achievements) {
        await prisma.achievement.upsert({
            where: { name: achievement.name },
            update: achievement,
            create: achievement,
        });
    }

    console.log(`Seeded ${achievements.length} achievements`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
