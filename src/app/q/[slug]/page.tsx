import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import QuestionDisplay from '@/components/question/QuestionDisplay';
import { ChevronLeft, BookOpen, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { getReviewStatus } from '@/app/actions/review-actions';
import { checkUserActivation } from '@/app/actions/auth-actions';

export const dynamic = 'force-dynamic';

interface QuestionPageProps {
    params: {
        slug: string;
    };
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();

    // 1. Fetch Question data by qr_slug
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : 'UNDEFINED';

    console.log('--- DB FETCH START ---');
    console.log('Target Slug:', slug);
    console.log('Supabase Host:', supabaseHost);

    if (!supabaseUrl || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('CRITICAL: Supabase environment variables are missing!');
    }

    // Simplified query to avoid join issues initially
    const { data: question, error: qError } = await supabase
        .from('questions')
        .select('*, books(*), topics(*)')
        .eq('qr_slug', slug)
        .maybeSingle();

    if (qError) {
        console.error('Supabase Query Error:', JSON.stringify(qError, null, 2));
        return notFound();
    }

    if (!question) {
        console.error('No question found for slug:', slug);
        // Also log if any questions exist at all to verify table access
        const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true });
        console.log('Total questions in table:', count);
        return notFound();
    }

    console.log('Successfully fetched question:', question.id);
    console.log('--- DB FETCH END ---');

    // 2. Check if user has access (activated the book)
    const { authenticated, activated } = await checkUserActivation(question.book_id, question.book?.title);

    if (!authenticated) {
        // Instead of a forced server-side redirect, we could show a "Login Required" card
        // But for now, sticking to redirect to keep it simple, but adding the returnTo
        redirect(`/login?returnTo=/q/${slug}`);
    }

    const isActivated = activated;
    console.log(`Activation status for question ${question.id}:`, isActivated);

    // 3. Fetch initial review list status
    const initialIsInReviewList = await getReviewStatus(question.id);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header Navigation */}
                <div className="flex items-center justify-between">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Dashboard
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <BookOpen className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{question.book?.title}</span>
                        <span className="text-gray-600">/</span>
                        <GraduationCap className="w-3 h-3 text-emerald-500" />
                        <span className="truncate max-w-[150px]">{question.topic?.title || 'General'}</span>
                    </div>
                </div>

                {/* Lock Screen if not activated */}
                {!isActivated ? (
                    <Card className="p-12 border-dashed border-gray-800 bg-[#111] text-center space-y-6">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Book Not Activated</h2>
                            <p className="text-gray-400 max-w-sm mx-auto">
                                You need to redeem an access code for <strong>{question.book?.title}</strong> to view this question and its solution.
                            </p>
                        </div>
                        <Link href={`/redeem?bookId=${question.book_id}`}>
                            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white px-8">
                                Redeem Code
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    /* Question Content */
                    <QuestionDisplay
                        question={question}
                        isActivated={isActivated}
                        initialIsInReviewList={initialIsInReviewList}
                    />
                )}
            </div>
        </div>
    );
}
