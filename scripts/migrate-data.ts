
import { PrismaClient as SqliteClient } from '../prisma/generated/sqlite-client'
import { PrismaClient as PostgresClient } from '@prisma/client'

const path = require('path')
const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')
const normalizedPath = dbPath.replace(/\\/g, '/')
const sqlite = new SqliteClient({
    datasources: {
        db: {
            url: `file:${normalizedPath}`
        }
    }
})
const postgres = new PostgresClient()

async function main() {
    console.log('🔄 Starting migration from SQLite to Supabase...')

    // 1. Users
    console.log('Reading users...')
    const users = await sqlite.user.findMany()
    console.log(`Found ${users.length} users`)

    for (const user of users) {
        const existing = await postgres.user.findUnique({ where: { email: user.email || '' } })
        if (!existing) {
            await postgres.user.create({
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    image: user.image
                }
            })
            console.log(`Created user: ${user.email || user.id}`)
        } else {
            console.log(`Skipping existing user: ${user.email}`)
            // If user exists, we might want to update ID mapping if IDs differ, 
            // but here we are forcing ID to be same, so it should be fine.
            // If we can't force ID (due to collision), we'd need a map.
            // But let's assume empty target DB for now or non-conflicting IDs.
        }
    }

    // 2. Custom Exercises
    // We need to map old IDs to new IDs if we let Postgres generate them, 
    // OR we just force the old IDs if they are CUIDs (which they are).
    console.log('Migrating Custom Exercises...')
    const exercises = await sqlite.exercise.findMany()
    for (const ex of exercises) {
        const exists = await postgres.exercise.findUnique({ where: { id: ex.id } })
        if (!exists) {
            await postgres.exercise.create({
                data: {
                    id: ex.id,
                    name: ex.name,
                    category: ex.category,
                    isCustom: ex.isCustom,
                    userId: ex.userId // This relies on user ID being preserved
                }
            })
        }
    }

    // 3. Workout Sets
    console.log('Migrating Workout Sets...')
    const workouts = await sqlite.workoutSet.findMany()
    for (const w of workouts) {
        const exists = await postgres.workoutSet.findUnique({ where: { id: w.id } })
        if (!exists) {
            await postgres.workoutSet.create({
                data: {
                    id: w.id,
                    userId: w.userId,
                    exerciseId: w.exerciseId,
                    exerciseName: w.exerciseName,
                    weightPerSide: w.weightPerSide,
                    totalWeight: w.totalWeight,
                    reps: w.reps,
                    sets: w.sets,
                    date: w.date,
                    type: w.type,
                    notes: w.notes,
                    restTime: w.restTime,
                    createdAt: w.createdAt
                }
            })
        }
    }

    // 4. Routines
    console.log('Migrating Routines...')
    const routines = await sqlite.routine.findMany()
    for (const r of routines) {
        const exists = await postgres.routine.findUnique({ where: { id: r.id } })
        if (!exists) {
            await postgres.routine.create({
                data: {
                    id: r.id,
                    userId: r.userId,
                    name: r.name,
                    exerciseIds: r.exerciseIds,
                    createdAt: r.createdAt
                }
            })
        }
    }

    console.log('✅ Migration complete!')
}

main()
    .catch(e => {
        console.error('❌ Migration failed:', JSON.stringify(e, null, 2))
        console.error(e)
    })
    .finally(async () => {
        await sqlite.$disconnect()
        await postgres.$disconnect()
    })
