
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Simple .env parser since we might not have dotenv installed
const envPath = path.resolve(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
        let value = match[2].trim()
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1)
        }
        env[match[1].trim()] = value
    }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env')
    process.exit(1)
}

console.log('Testing Supabase SDK Connection (HTTPS)...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    try {
        // Just try to get the server time or a simple query
        // "User" table might not exist yet if migration failed, so we check connection by auth or just health
        const { data, error } = await supabase.from('User').select('count', { count: 'exact', head: true })

        if (error) {
            // 42P01 means table undefined (which is GOOD, it means we connected!)
            if (error.code === '42P01') {
                console.log('✅ Connection Successful! (Table "User" not found, but DB was reached)')
            } else {
                console.error('❌ Connection Error:', error.message)
            }
        } else {
            console.log('✅ Connection Successful!')
        }
    } catch (e) {
        console.error('❌ SDK Client Error:', e)
    }
}

main()
