const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const EXERCISES = [
    { id: 'squat', name: 'Barbell Squat', category: 'Legs' },
    { id: 'leg-press', name: 'Leg Press', category: 'Legs' },
    { id: 'lunge', name: 'Lunges', category: 'Legs' },
    { id: 'deadlift', name: 'Deadlift', category: 'Back/Legs' },
    { id: 'romanian-deadlift', name: 'Romanian Deadlift', category: 'Legs' },
    { id: 'leg-curl', name: 'Leg Curl', category: 'Legs' },
    { id: 'calf-raise', name: 'Calf Raise', category: 'Legs' },
    { id: 'bench-press', name: 'Bench Press', category: 'Chest' },
    { id: 'incline-bench', name: 'Incline Bench Press', category: 'Chest' },
    { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', category: 'Chest' },
    { id: 'incline-db-press', name: 'Incline Dumbbell Press', category: 'Chest' },
    { id: 'push-up', name: 'Push Ups', category: 'Chest' },
    { id: 'dumbbell-fly', name: 'Dumbbell Flys', category: 'Chest' },
    { id: 'pull-up', name: 'Pull Ups', category: 'Back' },
    { id: 'barbell-row', name: 'Barbell Row', category: 'Back' },
    { id: 'lat-pulldown', name: 'Lat Pulldown', category: 'Back' },
    { id: 'seated-row', name: 'Seated Row', category: 'Back' },
    { id: 'face-pull', name: 'Face Pull', category: 'Back' },
    { id: 'overhead-press', name: 'Overhead Press', category: 'Shoulders' },
    { id: 'lateral-raise', name: 'Lateral Raise', category: 'Shoulders' },
    { id: 'bicep-curl', name: 'Barbell Curl', category: 'Biceps' },
    { id: 'dumbbell-curl', name: 'Dumbbell Curl', category: 'Biceps' },
    { id: 'tricep-extension', name: 'Tricep Extension', category: 'Triceps' },
    { id: 'triceps-pushdown', name: 'Triceps Pushdown', category: 'Triceps' },
];

async function main() {
    console.log('Start seeding ...');
    for (const ex of EXERCISES) {
        try {
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
            console.log(`Created/Updated exercise with id: ${exercise.id}`);
        } catch (err) {
            console.error(`Failed to seed exercise ${ex.id}:`, err.message);
        }
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
