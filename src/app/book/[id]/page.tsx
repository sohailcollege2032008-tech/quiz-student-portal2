import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BookOpen, GraduationCap, ChevronRight, HelpCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BookDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Get user and check activation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: activation } = await supabase
        .from('user_book_activations')
        .select('*, books(*)')
        .eq('user_id', user.id)
        .eq('book_id', id)
        .single();

    if (!activation) {
        // Direct to redeem if not activated
        redirect(`/redeem?bookId=${id}`);
    }

    const book = activation.books;

    // 2. Fetch Topics
    const { data: topics } = await supabase
        .from('topics')
        .select('*')
        .eq('book_id', id)
        .order('created_at', { ascending: true });

    // 3. Fetch Questions
    const { data: questions } = await supabase
        .from('questions')
        .select('id, question_text, qr_slug, topic_id')
        .eq('book_id', id)
        .order('created_at', { ascending: true });

    // Group questions by topic
    const questionsByTopic: Record<string, typeof questions> = {};
    const untrackedQuestions: typeof questions = [];

    questions?.forEach(q => {
        if (q.topic_id) {
            if (!questionsByTopic[q.topic_id]) questionsByTopic[q.topic_id] = [];
            questionsByTopic[q.topic_id].push(q);
        } else {
            untrackedQuestions.push(q);
        }
    });

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white -ml-2">
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-xl flex items-center justify-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest transform -rotate-90">STUDY</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{book?.title}</h1>
                                <p className="text-gray-400 mt-1">{book?.description || 'Study materials and questions'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                        <BookOpen className="w-3.5 h-3.5" />
                        ACTIVE LICENSE
                    </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Topics & Questions List */}
                <div className="space-y-12 pb-20">
                    {topics && topics.map((topic) => (
                        <section key={topic.id} className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                    <GraduationCap className="w-4 h-4" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-100">{topic.title}</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {questionsByTopic[topic.id]?.map((q, idx) => (
                                    <Link key={q.id} href={`/q/${q.qr_slug}`}>
                                        <div className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-blue-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-mono text-gray-600 w-6">{(idx + 1).toString().padStart(2, '0')}</span>
                                                <p className="text-sm text-gray-300 line-clamp-1 group-hover:text-white transition-colors">
                                                    {q.question_text}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </Link>
                                ))}
                                {(!questionsByTopic[topic.id] || questionsByTopic[topic.id].length === 0) && (
                                    <p className="text-sm text-gray-600 italic ml-11">No questions for this topic yet.</p>
                                )}
                            </div>
                        </section>
                    ))}

                    {untrackedQuestions.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center text-gray-400 border border-gray-500/20">
                                    <HelpCircle className="w-4 h-4" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-100">Other Questions</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {untrackedQuestions.map((q, idx) => (
                                    <Link key={q.id} href={`/q/${q.qr_slug}`}>
                                        <div className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-blue-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-mono text-gray-600 w-6">{(idx + 1).toString().padStart(2, '0')}</span>
                                                <p className="text-sm text-gray-300 line-clamp-1 group-hover:text-white transition-colors">
                                                    {q.question_text}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {(!topics || topics.length === 0) && untrackedQuestions.length === 0 && (
                        <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl">
                            <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500">This book has no questions or topics yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
