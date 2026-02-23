import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import QuestionDisplay from '@/components/question/QuestionDisplay';
import { ChevronLeft, BookOpen, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { getReviewStatus } from '@/app/actions/review-actions';

interface QuestionPageProps {
    params: {
        slug: string;
    };
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();

    // 1. Fetch Question data by qr_slug
    const { data: question, error: qError } = await supabase
        .from('questions')
        .select(`
      *,
      book:books(*),
      topic:topics(*)
    `)
        .eq('qr_slug', slug)
        .single();

    if (qError || !question) {
        console.error('Question fetch error:', qError);
        return notFound();
    }

    // 2. Check if user has access (activated the book)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/login?returnTo=/q/${slug}`);
    }

    const { data: activation, error: aError } = await supabase
        .from('user_book_activations')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', question.book_id)
        .single();

    const isActivated = !!activation;

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
