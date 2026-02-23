'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Circle,
    Lightbulb,
    BookOpen,
    CheckCircle,
    Bookmark,
    BookmarkCheck,
    Loader2
} from 'lucide-react'
import { toggleReviewListItem } from '@/app/actions/review-actions'

interface QuestionDisplayProps {
    question: any
    isActivated: boolean
    initialIsInReviewList?: boolean
}

export default function QuestionDisplay({
    question,
    isActivated,
    initialIsInReviewList = false
}: QuestionDisplayProps) {
    const [revealLevels, setRevealLevels] = useState<number>(0)
    const [isBookmarked, setIsBookmarked] = useState(initialIsInReviewList)
    const [isToggling, setIsToggling] = useState(false)

    useEffect(() => {
        // Trigger MathJax typesetting
        if (typeof window !== 'undefined' && (window as any).MathJax) {
            (window as any).MathJax.typesetPromise?.()
        }
    }, [revealLevels, question])

    const handleToggleBookmark = async () => {
        setIsToggling(true)
        try {
            await toggleReviewListItem(question.id)
            setIsBookmarked(!isBookmarked)
        } catch (error) {
            console.error('Failed to toggle bookmark:', error)
        } finally {
            setIsToggling(false)
        }
    }

    if (!isActivated) {
        return (
            <div className="p-8 bg-white/[0.03] border border-dashed border-white/10 rounded-3xl text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Book Not Activated</h3>
                <p className="text-gray-400 max-w-sm mx-auto mb-6">
                    You need to activate this book to see the interactive steps and answers.
                </p>
                <button className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10">
                    Redeem Access Code
                </button>
            </div>
        )
    }

    const data = question.content_json
    const sections = [
        { id: 1, title: 'The Idea', type: 'idea', icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { id: 2, title: 'The Approach', type: 'approach', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { id: 3, title: 'The Solution', type: 'solution', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
    ]

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20 uppercase">
                        {question.type}
                    </span>
                    <span className="text-xs text-gray-500">
                        {new Date(question.created_at).toLocaleDateString()}
                    </span>
                </div>

                <button
                    onClick={handleToggleBookmark}
                    disabled={isToggling}
                    className={`p-2 rounded-xl transition-all border flex items-center gap-2 ${isBookmarked
                            ? 'bg-purple-600/20 border-purple-500/30 text-purple-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    {isToggling ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isBookmarked ? (
                        <BookmarkCheck className="w-5 h-5" />
                    ) : (
                        <Bookmark className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">
                        {isBookmarked ? 'In Review List' : 'Add to Review'}
                    </span>
                </button>
            </div>

            {/* Question Text */}
            <div className="p-8 bg-white/[0.03] border border-white/10 rounded-3xl shadow-2xl">
                <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-8">
                    {question.question_text}
                </h1>

                {/* Question Type Specific Content */}
                {question.type === 'mcq' && data.mcq_data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.mcq_data.options.map((opt: any, idx: number) => {
                            const optText = typeof opt === 'string' ? opt : (opt.text || '');
                            const optId = typeof opt === 'object' ? opt.id : String.fromCharCode(65 + idx);
                            return (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-all cursor-pointer group">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-gray-400 group-hover:text-white transition-colors">
                                        {optId}
                                    </div>
                                    <span className="text-gray-300">{optText}</span>
                                </div>
                            )
                        })}
                    </div>
                )}

                {question.type === 'matching' && data.matching_data && (
                    <div className="grid grid-cols-2 gap-8 py-4">
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Column A</h4>
                            {data.matching_data.items.map((m: any) => (
                                <div key={m.id} className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm italic">
                                    {m.id}. {m.text}
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Column B</h4>
                            {data.matching_data.options.map((m: any) => (
                                <div key={m.id} className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm italic text-right">
                                    ({m.id}) {m.text}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Progressive Reveal Sections */}
            <div className="space-y-4">
                {sections.map((section, idx) => {
                    const isRevealed = revealLevels > idx
                    const canReveal = revealLevels === idx
                    const Icon = section.icon
                    const content = data[section.type] || question[section.type] || 'No information provided for this step.'

                    return (
                        <div key={section.id} className="relative group">
                            <motion.div
                                initial={false}
                                animate={{ opacity: isRevealed ? 1 : 0.4 }}
                                className={`rounded-3xl border transition-all duration-500 overflow-hidden ${isRevealed ? 'bg-white/[0.05] border-white/10' : 'bg-transparent border-white/5 border-dashed'
                                    }`}
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${section.bg} ${section.color}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <h3 className={`font-bold text-lg ${section.color}`}>{section.title}</h3>
                                        </div>
                                        {canReveal && (
                                            <button
                                                onClick={() => setRevealLevels(idx + 1)}
                                                className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all shadow-xl shadow-white/5"
                                            >
                                                Reveal Step
                                            </button>
                                        )}
                                        {isRevealed && (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {isRevealed && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                className="text-gray-300 leading-relaxed max-w-none"
                                            >
                                                <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
