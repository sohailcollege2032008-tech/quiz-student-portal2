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
    Star,
    Loader2
} from 'lucide-react'
import { toggleReviewQuestion } from '@/app/actions/student-actions'

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
    const [bookmarking, setBookmarking] = useState(false)
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

    // Helper to detect if text contains Arabic characters
    const getDirection = (text: string) => {
        if (!text) return 'ltr'
        const arabicRegex = /[\u0600-\u06FF]/
        return arabicRegex.test(text) ? 'rtl' : 'ltr'
    }

    useEffect(() => {
        // Trigger MathJax typesetting
        if (typeof window !== 'undefined' && (window as any).MathJax) {
            (window as any).MathJax.typesetPromise?.()
        }
    }, [revealLevels, question])


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
        { id: 1, title: 'The Idea', type: 'the_idea', icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { id: 2, title: 'The Approach', type: 'how_to_solve', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { id: 3, title: 'The Solution', type: 'explanation', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
    ]

    const getSectionContent = (type: string) => {
        // Correct data paths based on database structure
        const mcqData = data.mcq_data;
        const explanation = mcqData?.explanation || data.explanation;

        if (type === 'explanation') {
            // Priority 1: True/False Explanation
            if (question.type === 'tf' && data.tf_data) {
                const isTrue = data.tf_data.is_true
                return `
                    <div class="mb-4 flex items-center gap-2 ${isTrue ? 'text-emerald-400' : 'text-red-400'} font-bold text-xl uppercase tracking-wider">
                        ${isTrue ? '✅ True statement' : '❌ False statement'}
                    </div>
                    <div class="text-gray-300 leading-relaxed">${data.tf_data.explanation || 'No explanation provided.'}</div>
                `
            }

            // Priority 2: Matching Explanation
            if (question.type === 'matching' && data.matching_data) {
                const mapping = data.matching_data.correct_mapping
                const items = data.matching_data.items
                const options = data.matching_data.options

                let html = `<div class="mb-6 space-y-3">`
                html += `<div class="text-blue-400 font-medium mb-4 flex items-center gap-2">🔗 Correct Matches:</div>`

                Object.entries(mapping).forEach(([itemId, optId]) => {
                    const item = items.find((i: any) => String(i.id) === String(itemId))
                    const option = options.find((o: any) => String(o.id) === String(optId))
                    if (item && option) {
                        html += `
                            <div class="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
                                <span class="font-bold text-gray-400 min-w-[24px]">${item.id}.</span>
                                <span class="text-gray-200">${item.text}</span>
                                <span class="text-blue-500 font-bold">→</span>
                                <span class="font-bold text-gray-400 min-w-[24px]">(${option.id})</span>
                                <span class="text-gray-200">${option.text}</span>
                            </div>
                        `
                    }
                })
                html += `</div>`

                if (data.how_to_solve) {
                    html += `<div class="text-amber-400 font-medium mb-3">💡 Strategy:</div>`
                    html += `<div class="text-gray-300 italic">${data.how_to_solve}</div>`
                }
                return html
            }

            // Priority 3: MCQ Explanation Breakdown (Detailed Object)
            if (explanation && typeof explanation === 'object') {
                let html = ''

                // Show Correct Answer section as in screenshot
                if (explanation.why_correct) {
                    const correctId = mcqData?.correct_answer || mcqData?.correct_id;
                    const correctLabel = correctId ? `: ${correctId}` : '';
                    html += `<div class="mb-2"><div class="flex items-center gap-2 text-emerald-400 font-bold"><span class="text-lg">✨</span><span>Correct Answer${correctLabel}</span></div><div class="text-gray-200 leading-tight pl-3 border-l border-emerald-500/20">${explanation.why_correct}</div></div>`
                }

                if (explanation.why_incorrect && Array.isArray(explanation.why_incorrect)) {
                    html += `<div class="mt-3"><div class="flex items-center gap-2 text-red-400 font-bold mb-2"><span class="text-lg">❌</span><span>Why others are incorrect:</span></div><div class="space-y-2.5">`
                    explanation.why_incorrect.forEach((item: any) => {
                        html += `<div class="flex gap-3 group"><div class="font-bold text-red-500/40 mt-0.5 min-w-[24px] group-hover:text-red-500/60 transition-colors uppercase">${item.option}:</div><div class="text-gray-300 text-[15px] leading-snug pl-3 border-l border-red-500/20">${item.reason}</div></div>`
                    })
                    html += `</div></div>`
                }
                return html || 'No detailed explanation provided for this step.'
            }

            // Priority 4: Simple MCQ Correctness (if no text explanation)
            if (question.type === 'mcq' && (mcqData?.correct_answer || mcqData?.correct_id)) {
                const correctId = mcqData?.correct_answer || mcqData?.correct_id;
                return `
                    <div class="mb-4">
                        <div class="flex items-center gap-2 text-emerald-400 font-bold mb-3">
                            <span class="text-lg">✨</span>
                            <span>Correct Answer: ${correctId}</span>
                        </div>
                        ${explanation ? `<div class="text-gray-300 leading-relaxed pl-4 border-l border-emerald-500/20">${explanation}</div>` : ''}
                    </div>
                `
            }

            // Fallback for simple string explanations
            return (typeof explanation === 'string' ? explanation : null) || 'No detailed solution provided for this step.'
        }

        return data[type] || question[type] || 'No information provided for this step.'
    }

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
                    onClick={async () => {
                        setBookmarking(true)
                        const res = await toggleReviewQuestion(question.id)
                        if (res.success) {
                            setIsBookmarked(res.action === 'added')
                        }
                        setBookmarking(false)
                    }}
                    disabled={bookmarking}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${isBookmarked
                        ? 'bg-amber-500/20 border-amber-500/30 text-amber-500'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                >
                    {bookmarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />}
                    <span className="text-xs font-bold uppercase tracking-widest">
                        {isBookmarked ? 'Bookmarked' : 'Add to Review'}
                    </span>
                </button>
            </div>

            {/* Question Text */}
            <div
                className="p-5 md:p-8 bg-white/[0.03] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
                dir={getDirection(question.question_text)}
            >
                <h1 className="text-xl md:text-3xl font-bold leading-tight mb-6 md:mb-8 break-words">
                    {question.question_text}
                </h1>

                {/* Question Type Specific Content */}
                {question.type === 'mcq' && data.mcq_data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.mcq_data.options.map((opt: any, idx: number) => {
                            const optText = typeof opt === 'string' ? opt : (opt.text || '');
                            const optId = typeof opt === 'object' ? opt.id : String.fromCharCode(65 + idx);

                            const isSelected = selectedOptionId === optId;
                            const isCorrectAnswer = optId === (data.mcq_data.correct_answer || data.mcq_data.correct_id);

                            // Determine colors based on selection and correctness
                            let bgClass = "bg-white/5 hover:bg-white/[0.08]"
                            let borderClass = "border-white/10"
                            let textClass = "text-gray-300"
                            let iconBgClass = "bg-white/5 border-white/10"
                            let iconTextClass = "text-gray-400 group-hover:text-white"

                            if (isSelected) {
                                if (isCorrectAnswer) {
                                    bgClass = "bg-emerald-500/20"
                                    borderClass = "border-emerald-500/50"
                                    textClass = "text-emerald-100 font-medium"
                                    iconBgClass = "bg-emerald-500 text-white border-transparent shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                    iconTextClass = "text-white"
                                } else {
                                    bgClass = "bg-red-500/20"
                                    borderClass = "border-red-500/50"
                                    textClass = "text-red-100"
                                    iconBgClass = "bg-red-500 text-white border-transparent"
                                    iconTextClass = "text-white"
                                }
                            } else if (selectedOptionId && isCorrectAnswer) {
                                // Highlight the correct answer even if they selected the wrong one
                                bgClass = "bg-emerald-500/10"
                                borderClass = "border-emerald-500/30 border-dashed"
                                textClass = "text-emerald-200/80"
                                iconBgClass = "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                iconTextClass = "text-emerald-400"
                            }

                            return (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedOptionId(optId)}
                                    className={`flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4 border rounded-2xl transition-all cursor-pointer group ${bgClass} ${borderClass}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg border flex-shrink-0 flex items-center justify-center font-bold transition-all mt-0.5 md:mt-0 ${iconBgClass} ${iconTextClass}`}>
                                        {optId}
                                    </div>
                                    <span className={`${textClass} transition-colors text-sm md:text-base break-words`}>{optText}</span>
                                </div>
                            )
                        })}
                    </div>
                )}

                {question.type === 'matching' && data.matching_data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 py-4">
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 md:mb-4">Column A</h4>
                            {data.matching_data.items.map((m: any) => (
                                <div key={m.id} className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm italic break-words">
                                    {m.id}. {m.text}
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 md:mb-4">Column B</h4>
                            {data.matching_data.options.map((m: any) => (
                                <div key={m.id} className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm italic md:text-right break-words">
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
                    const content = getSectionContent(section.type)

                    return (
                        <div key={section.id} className="relative group">
                            <motion.div
                                initial={false}
                                animate={{ opacity: isRevealed ? 1 : 0.4 }}
                                className={`rounded-3xl border transition-all duration-500 overflow-hidden ${isRevealed ? 'bg-white/[0.05] border-white/10' : 'bg-transparent border-white/5 border-dashed'
                                    }`}
                            >
                                <div className="p-4 md:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl flex-shrink-0 ${section.bg} ${section.color}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <h3 className={`font-bold text-base md:text-lg ${section.color}`}>{section.title}</h3>
                                        </div>
                                        {canReveal && (
                                            <button
                                                onClick={() => setRevealLevels(idx + 1)}
                                                className="w-full sm:w-auto px-6 py-2 bg-white text-black text-sm md:text-base font-bold rounded-xl hover:bg-gray-200 transition-all shadow-xl shadow-white/5"
                                            >
                                                Reveal Step
                                            </button>
                                        )}
                                        {isRevealed && (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 hidden sm:block" />
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {isRevealed && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                className="text-gray-300 leading-relaxed max-w-none"
                                                dir={getDirection(content)}
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
