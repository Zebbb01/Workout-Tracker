
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking Users in Postgres...')
    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users:`)
    users.forEach(u => {
        console.log(`- [${u.id}] ${u.email} (Name: ${u.name})`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
