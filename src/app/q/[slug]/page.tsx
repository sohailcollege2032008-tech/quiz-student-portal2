import { createAdminClient } from '@/lib/supabase/admin';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import QuestionDisplay from '@/components/question/QuestionDisplay';
import { ChevronLeft, BookOpen, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/button';
import { getReviewStatus } from '@/app/actions/student-actions';

export const dynamic = 'force-dynamic';

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get('student-access-code')?.value || "";
    const accessCodes = accessCookie.split(',').filter(c => c.trim().length > 0)

    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch Question data by qr_slug
    const { data: question, error: qError } = await supabase
        .from('questions')
        .select('*, books(*), topics(*)')
        .eq('qr_slug', slug)
        .maybeSingle();

    if (qError || !question) {
        return notFound();
    }

    // 2. Access Logic: Allowed if book is free OR if any of the session codes match this book
    const book = Array.isArray(question.books) ? question.books[0] : question.books;
    let hasAccess = book?.is_free === true;

    if (!hasAccess && accessCodes.length > 0) {
        const { data: accessData } = await supabase
            .from('access_codes')
            .select('id')
            .in('code', accessCodes)
            .eq('book_id', question.book_id)
            .maybeSingle();

        if (accessData) hasAccess = true;
    }

    if (!hasAccess && user) {
        const { data: userActivation } = await supabase
            .from('user_book_activations')
            .select('id')
            .eq('user_id', user.id)
            .eq('book_id', question.book_id)
            .maybeSingle();

        if (userActivation) hasAccess = true;
    }

    if (!hasAccess) {
        // Access Denied - Show Unlock UI
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 flex flex-col items-center justify-center space-y-8">
                <div className="text-center space-y-6 max-w-md w-full">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                        <BookOpen className="w-10 h-10 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Quiz Locked</h2>
                        <p className="text-gray-400">This content belongs to <strong>{book?.title || 'a locked book'}</strong>. Please enter the activation code to unlock it.</p>
                    </div>

                    <div className="p-1 bg-white/5 rounded-xl border border-white/10">
                        <LoginForm isInline={true} />
                    </div>

                    <Link href="/dashboard" className="block text-sm text-gray-500 hover:text-white transition-colors">
                        ← Back to My Content
                    </Link>
                </div>
            </div>
        );
    }

    // 3. Review list status from database
    const initialIsInReviewList = await getReviewStatus(question.id);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-2 md:p-8">
            <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
                {/* Header Navigation */}
                <div className="flex items-center justify-between px-1 md:px-0">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2 md:px-3">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Dashboard</span>
                            <span className="sm:hidden">Back</span>
                        </Button>
                    </Link>
                    <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-400">
                        <BookOpen className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[100px] md:max-w-[150px]">{question.books?.title}</span>
                        <span className="text-gray-600">/</span>
                        <GraduationCap className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span className="truncate max-w-[80px] md:max-w-[150px]">{question.topics?.title || 'General'}</span>
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
