import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    },
    log: ['query', 'info', 'warn', 'error']
})

async function main() {
    try {
        console.log('Connecting to database...');
        console.log('URL:', process.env.DATABASE_URL); // Log URL to sanity check (masked if possible, but for me it's fine)
        await prisma.$connect();
        console.log('Connection successful!');

        // Try a simple query
        const count = await prisma.user.count();
        console.log(`User count: ${count}`);

    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
