import { createAdminClient } from '@/lib/supabase/admin';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import QuestionDisplay from '@/components/question/QuestionDisplay';
import { ChevronLeft, BookOpen, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cookieStore = await cookies();
    const accessCode = cookieStore.get('student-access-code')?.value;

    if (!accessCode) {
        redirect('/login');
    }

    const supabase = createAdminClient();

    // 1. Fetch Question data by qr_slug
    const { data: question, error: qError } = await supabase
        .from('questions')
        .select('*, books(*), topics(*)')
        .eq('qr_slug', slug)
        .maybeSingle();

    if (qError || !question) {
        return notFound();
    }

    // 2. Verify that the student's access code unlocks the book this question belongs to
    const { data: accessData, error: accessError } = await supabase
        .from('access_codes')
        .select('id')
        .eq('code', accessCode)
        .eq('book_id', question.book_id)
        .single();

    if (accessError || !accessData) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 flex flex-col items-center justify-center space-y-8">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <BookOpen className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-3xl font-bold">Access Required</h2>
                    <p className="text-gray-400">Your access code doesn't cover this book. Please use a code for <strong>{question.books?.title}</strong>.</p>
                    <Link href="/login" className="block p-4 bg-blue-600 rounded-xl font-bold">Enter Another Code</Link>
                    <Link href="/dashboard" className="block text-sm text-gray-500 hover:underline">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    // 3. Review list functionality is currently disabled (requires User ID)
    // We can re-implement this using access_code if needed later.
    const initialIsInReviewList = false;

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
                        <span className="truncate max-w-[150px]">{question.books?.title}</span>
                        <span className="text-gray-600">/</span>
                        <GraduationCap className="w-3 h-3 text-emerald-500" />
                        <span className="truncate max-w-[150px]">{question.topics?.title || 'General'}</span>
                    </div>
                </div>

                {/* Question Content */}
                <QuestionDisplay
                    question={question}
                    isActivated={true}
                    initialIsInReviewList={initialIsInReviewList}
                />
            </div>
        </div>
    );
}
