
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Environment constants:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing')
console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'Present' : 'Missing')

if (!supabaseUrl || !serviceRoleKey) {
    if (!supabaseUrl) console.error('Error: NEXT_PUBLIC_SUPABASE_URL is missing')
    if (!serviceRoleKey) console.error('Error: SUPABASE_SERVICE_ROLE_KEY is missing')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testVerification(code) {
    console.log(`\nTesting verification for code: ${code}`)
    try {
        const { data: accessCode, error } = await supabase
            .from('access_codes')
            .select('*, books(*)')
            .eq('code', code.trim())
            .single()

        if (error) {
            console.error('Database query error:', error)
            return
        }

        if (!accessCode) {
            console.log('No access code found in database.')
            return
        }

        console.log('Success! Access code found:')
        console.log(JSON.stringify(accessCode, null, 2))

    } catch (err) {
        console.error('Caught exception during execution:', err)
    }
}

testVerification('NA4PGV')
