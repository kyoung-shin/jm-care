'use client';

import { useState } from 'react';
import { X, MessageSquare, ShieldCheck, Heart, Inbox, Sparkles, Check } from 'lucide-react';
import { actionStatusConfig, type CounselingRecord } from '@/lib/dummy-data';

interface Props {
  mode: 'new' | 'detail';
  data?: CounselingRecord;
  prefill?: { subject?: string; topic?: string; summary?: string; action?: string } | null;
  onClose: () => void;
  onSave: (record: CounselingRecord) => void;
  onToggleAction: (date: string) => void;
}

export default function CounselingModal({ mode, data, prefill, onClose, onSave, onToggleAction }: Props) {
  const isNew = mode === 'new';
  const today = '2026.05.12';

  const [form, setForm] = useState({
    date: today,
    type: '정기상담',
    topic: prefill?.topic ?? '학습',
    trigger: prefill?.subject ? `${prefill.subject} 갭 분석에서 연결` : '정기 점검',
    summary: prefill?.summary ?? '',
    internalMemo: '',
    parentShare: '',
    actionName: prefill?.action ?? '',
    actionOwner: '박지훈 강사',
    actionDeadline: '2026.05.31',
  });

  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!form.summary.trim()) { alert('상담 내용을 입력해 주세요.'); return; }
    onSave({
      date: form.date, type: form.type, topic: form.topic,
      summary: form.summary, internalMemo: form.internalMemo,
      parentShare: form.parentShare, isNew: true,
      action: {
        name: form.actionName || '(액션 미설정)',
        owner: form.actionOwner,
        deadline: form.actionDeadline,
        status: 'in-progress',
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col pointer-events-auto overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <MessageSquare size={16} />
              </div>
              <div>
                <div className="serif-ko text-lg font-bold text-slate-900">{isNew ? '새 상담 기록 작성' : '상담 상세'}</div>
                <div className="text-xs text-slate-500">
                  김민준 학생 · {isNew ? '작성 후 종합 현황에 즉시 반영됩니다' : `${data?.date} · ${data?.type}`}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-200 flex items-center justify-center text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isNew ? (
              <div className="space-y-5">
                {prefill?.subject && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <Sparkles size={13} className="mt-0.5 shrink-0 text-amber-600" />
                    <span>갭 분석의 <span className="font-bold">{prefill.subject}</span> 항목에서 연결되어 내용과 액션이 미리 채워졌습니다. 수정 후 저장하세요.</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">상담일</label>
                    <input value={form.date} onChange={e => update('date', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 num" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">유형</label>
                    <select value={form.type} onChange={e => update('type', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white">
                      <option>정기상담</option><option>수시상담</option><option>진로상담</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">주제</label>
                    <select value={form.topic} onChange={e => update('topic', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white">
                      <option>학습</option><option>진로</option><option>생활·태도</option><option>학부모 요청</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">상담 트리거 <span className="text-slate-400 font-normal">(왜 이 상담이 필요했는가)</span></label>
                  <input value={form.trigger} onChange={e => update('trigger', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2" placeholder="예: 성적 하락 / 학부모 요청 / 정기 점검" />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">상담 내용 <span className="text-red-500">*</span></label>
                  <textarea value={form.summary} onChange={e => update('summary', e.target.value)} className="w-full min-h-[100px] text-sm border border-stone-300 rounded-lg px-3 py-2 resize-y leading-relaxed" placeholder="상담에서 논의된 진단과 분석 내용을 입력하세요." />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <ShieldCheck size={11} className="text-slate-400" /> 내부 메모 <span className="text-slate-400 font-normal">(학부모 비공개)</span>
                    </label>
                    <textarea value={form.internalMemo} onChange={e => update('internalMemo', e.target.value)} className="w-full min-h-[80px] text-sm border border-stone-300 rounded-lg px-3 py-2 resize-y bg-slate-50/50" placeholder="학원 내부 전략·관찰 메모" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <Heart size={11} className="text-amber-500" /> 학부모 공유 요약
                    </label>
                    <textarea value={form.parentShare} onChange={e => update('parentShare', e.target.value)} className="w-full min-h-[80px] text-sm border border-stone-300 rounded-lg px-3 py-2 resize-y bg-amber-50/30" placeholder="리포트·학부모 화면에 노출될 요약" />
                  </div>
                </div>

                <div className="border border-stone-200 rounded-lg p-4 bg-stone-50/40">
                  <div className="text-[11px] font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <Inbox size={12} /> 액션플랜 <span className="text-slate-400 font-normal">(상담에서 합의된 다음 행동)</span>
                  </div>
                  <div className="space-y-3">
                    <input value={form.actionName} onChange={e => update('actionName', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2" placeholder="예: 국어 독해 기초반 주 2회 시작" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 mb-1 block">담당</label>
                        <select value={form.actionOwner} onChange={e => update('actionOwner', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white">
                          <option>박지훈 강사</option><option>김서연 강사</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 mb-1 block">기한</label>
                        <input value={form.actionDeadline} onChange={e => update('actionDeadline', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 num" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-bold text-slate-900 num">{data?.date}</div>
                  <div className="text-[11px] px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-slate-600">{data?.type}</div>
                  <div className="text-[11px] px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-slate-600">{data?.topic}</div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">상담 내용</div>
                  <div className="text-sm text-slate-700 leading-relaxed bg-stone-50 rounded-lg p-4 border border-stone-200">{data?.summary}</div>
                </div>

                {data?.internalMemo && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1"><ShieldCheck size={11} /> 내부 메모 (학부모 비공개)</div>
                    <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-200">{data.internalMemo}</div>
                  </div>
                )}

                {data?.parentShare && (
                  <div>
                    <div className="text-[11px] font-semibold text-amber-700 mb-1.5 flex items-center gap-1"><Heart size={11} /> 학부모 공유 요약</div>
                    <div className="text-sm text-slate-700 leading-relaxed bg-amber-50/40 rounded-lg p-4 border border-amber-200">{data.parentShare}</div>
                  </div>
                )}

                {data?.action && (
                  <div className="border border-stone-200 rounded-lg p-4">
                    <div className="text-[11px] font-bold text-slate-700 mb-3 flex items-center gap-1.5"><Inbox size={12} /> 합의된 액션플랜</div>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${actionStatusConfig[data.action.status]?.dot} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{data.action.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">담당 {data.action.owner} · 기한 <span className="num">{data.action.deadline}</span></div>
                      </div>
                      <button
                        onClick={() => data?.date && onToggleAction(data.date)}
                        className={`text-[11px] px-3 py-1.5 rounded font-semibold transition-colors ${data.action.status === 'completed' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                      >
                        {data.action.status === 'completed' ? '✓ 완료됨 (되돌리기)' : '완료 처리'}
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-3">※ 완료 처리 시 종합 현황과 학부모 리포트에 반영됩니다.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span>내부 메모와 학부모 공유 내용은 자동으로 분리되어 노출됩니다</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs text-slate-700 hover:bg-stone-100 rounded">{isNew ? '취소' : '닫기'}</button>
              {isNew && (
                <button onClick={handleSave} className="px-5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded font-bold flex items-center gap-1.5">
                  <Check size={12} /> 상담 기록 저장
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
