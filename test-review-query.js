const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Superbase URL or Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    console.log("Testing review_list query...");

    // 1. Get raw review_list entries
    console.log("\n--- Raw review_list ---");
    const { data: raw, error: rawError } = await supabase
        .from('review_list')
        .select('*')
        .limit(5);

    if (rawError) console.error("Error fetching raw:", rawError);
    else console.log(JSON.stringify(raw, null, 2));

    // 2. Test the join query exactly as it is in the app
    console.log("\n--- Joined Query (Current structure) ---");
    const { data: joined, error: joinError } = await supabase
        .from('review_list')
        .select(`
        id,
        created_at,
        question_id,
        questions:question_id (
            id,
            question_text,
            qr_slug,
            books:book_id (title),
            topics:topic_id (title)
        )
    `)
        .limit(5);

    if (joinError) console.error("Error in joined query:", joinError);
    else console.log(JSON.stringify(joined, null, 2));

    // 3. Test simple question join
    console.log("\n--- Simple Question Join ---");
    const { data: simpleJoin, error: simpleJoinError } = await supabase
        .from('review_list')
        .select(`
        id,
        question_id,
        questions (*)
    `)
        .limit(2);

    if (simpleJoinError) console.error("Error in simple join query:", simpleJoinError);
    else console.log(JSON.stringify(simpleJoin, null, 2));

}

testQuery();
