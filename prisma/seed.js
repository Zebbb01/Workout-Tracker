const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const EXERCISES = [
    { id: 'squat', name: 'Barbell Squat', category: 'Legs' },
    { id: 'leg-press', name: 'Leg Press', category: 'Legs' },
    { id: 'lunge', name: 'Lunges', category: 'Legs' },
    { id: 'deadlift', name: 'Deadlift', category: 'Back/Legs' },
    { id: 'bench-press', name: 'Bench Press', category: 'Chest' },
    { id: 'incline-bench', name: 'Incline Bench Press', category: 'Chest' },
    { id: 'push-up', name: 'Push Ups', category: 'Chest' },
    { id: 'dumbbell-fly', name: 'Dumbbell Flys', category: 'Chest' },
    { id: 'pull-up', name: 'Pull Ups', category: 'Back' },
    { id: 'barbell-row', name: 'Barbell Row', category: 'Back' },
    { id: 'lat-pulldown', name: 'Lat Pulldown', category: 'Back' },
    { id: 'overhead-press', name: 'Overhead Press', category: 'Shoulders' },
    { id: 'lateral-raise', name: 'Lateral Raise', category: 'Shoulders' },
    { id: 'bicep-curl', name: 'Barbell Curl', category: 'Biceps' },
    { id: 'tricep-extension', name: 'Tricep Extension', category: 'Triceps' },
];

async function main() {
    console.log('Start seeding ...');
    for (const ex of EXERCISES) {
        const exercise = await prisma.exercise.upsert({
            where: { id: ex.id },
            update: {},
            create: {
                id: ex.id,
                name: ex.name,
                category: ex.category,
                isCustom: false,
                userId: null,
            },
        });
        console.log(`Created exercise with id: ${exercise.id}`);
    }
    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
