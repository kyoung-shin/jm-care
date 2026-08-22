'use client';
import RoleGuard from '@/components/RoleGuard';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText, MessageSquare, Flame, AlertTriangle, Calendar, Activity,
  Users, Inbox, ChevronRight,
} from 'lucide-react';
import CounselingModal from '@/components/modals/CounselingModal';
import ReportModal from '@/components/modals/ReportModal';
import StudentInputModal from '@/components/modals/StudentInputModal';
import InstructorPickerModal from '@/components/modals/InstructorPickerModal';
import Footer from '@/components/dashboard/Footer';
import { statusConfig, actionStatusConfig, type CounselingRecord } from '@/lib/dummy-data';

interface RealStudent {
  id: string;
  name: string;
  grade: string;
  school: string;
  finalGoalSchool: string | null;
  overallReadiness: number | null;
}

interface ActionItem {
  student: string;
  task: string;
  deadline: string | null;
  status: string;
  daysLeft: number | null;
}

interface AlertStudent {
  id: string;
  name: string;
  grade: string;
  target: string;
  priority: 'critical' | 'high';
  signals: { label: string; detail: string; tone?: string }[];
}

interface ScheduleDay {
  date: string;
  day: string;
  items: { time: string; type: string; label: string; urgent: boolean }[];
}

interface Summary {
  instructor: { id: string; name: string; branch: string | null };
  students: RealStudent[];
  actions: ActionItem[];
  alertStudents: AlertStudent[];
  schedule: ScheduleDay[];
  todayItems: number;
  urgentActions: number;
}

function InstructorPage() {
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [counselingModal, setCounselingModal] = useState<{
    mode: 'new' | 'detail';
    prefill?: null;
  } | null>(null);
  const [inputStudent, setInputStudent] = useState<RealStudent | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(async me => {
        if (!me?.id) return;
        setViewerRole(me.role);
        setBranchId(me.branchId ?? null);
        if (me.role === 'INSTRUCTOR') {
          setInstructorId(me.id);
          return;
        }
        // DIRECTOR/ADMIN previewing: default to the first instructor in the branch
        if (me.branchId) {
          const instructors = await fetch(`/api/users?role=INSTRUCTOR&branchId=${me.branchId}`).then(r => r.json());
          if (Array.isArray(instructors) && instructors.length > 0) setInstructorId(instructors[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadSummary = useCallback(() => {
    if (!instructorId) return;
    fetch(`/api/instructors/${instructorId}/summary`)
      .then(r => r.json())
      .then(d => { if (!d.error) setSummary(d); })
      .catch(() => {});
  }, [instructorId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  if (!summary) {
    return (
      <RoleGuard allowed={['INSTRUCTOR', 'DIRECTOR']}>
        <div className="max-w-7xl mx-auto px-8 py-16 text-center text-sm text-slate-400">불러오는 중...</div>
      </RoleGuard>
    );
  }

  const counselingTarget = summary.students[0];

  const handleSaveCounseling = async (record: CounselingRecord) => {
    setCounselingModal(null);
    if (!counselingTarget) return;
    try {
      await fetch(`/api/students/${counselingTarget.id}/counselings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      loadSummary();
    } catch { /* best-effort */ }
  };

  const canSwitch = viewerRole === 'DIRECTOR' || viewerRole === 'ADMIN';

  return (
    <RoleGuard allowed={['INSTRUCTOR', 'DIRECTOR']}>
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="mb-7 flex items-end justify-between border-b border-stone-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Instructor Workspace</div>
          <div className="serif-ko text-[34px] font-black text-slate-900 leading-none">
            오늘의 업무 —{' '}
            {canSwitch ? (
              <button onClick={() => setPickerOpen(true)} className="underline decoration-dotted decoration-2 underline-offset-4 hover:text-slate-600 transition-colors">
                {summary.instructor.name}
              </button>
            ) : summary.instructor.name}
            {' '}강사
          </div>
          <div className="text-sm text-slate-500 mt-2">{summary.instructor.branch ?? ''} · 담당 학생 <span className="num font-semibold text-slate-700">{summary.students.length}</span>명</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button onClick={() => setReportOpen(true)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 rounded font-semibold flex items-center gap-1 shadow-sm">
            <FileText size={12} /> 학부모 리포트 생성
          </button>
          <button onClick={() => setCounselingModal({ mode: 'new' })} className="px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 flex items-center gap-1">
            <MessageSquare size={12} /> 상담 기록 +
          </button>
        </div>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-red-600 font-semibold">긴급</div>
            <Flame size={14} className="text-red-600" />
          </div>
          <div className="text-[40px] font-black num leading-none text-red-700">{summary.urgentActions}</div>
          <div className="text-xs text-red-700 mt-1.5 font-semibold">즉시 대응 필요한 액션</div>
          <div className="text-[10px] text-red-600/80 mt-0.5">기한 초과 또는 임박</div>
        </div>
        {[
          { label: '위험 신호 학생', value: summary.alertStudents.length, sub: `전체 ${summary.students.length}명 중`, sub2: '담당 학생 중 신호 발생', icon: AlertTriangle, iconColor: 'text-amber-600' },
          { label: '오늘 일정', value: summary.todayItems, sub: '등록된 일정 기준', sub2: '수업 · 상담 · 보충', icon: Calendar, iconColor: 'text-slate-600' },
          { label: '진행 중 액션', value: summary.actions.length, sub: '기한 도달 자동 알림', sub2: '상담에서 합의된 액션', icon: Activity, iconColor: 'text-slate-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{card.label}</div>
              <card.icon size={14} className={card.iconColor} />
            </div>
            <div className="text-[40px] font-black num leading-none text-slate-900">{card.value}</div>
            <div className="text-xs text-slate-600 mt-1.5">{card.sub2}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* 긴급 학생 */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Flame size={14} className="text-red-600" /><div className="serif-ko text-base font-bold text-slate-900">지금 바로 챙겨야 할 학생</div></div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Priority Alerts</div>
        </div>
        {summary.alertStudents.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-6">위험 신호가 있는 학생이 없습니다</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {summary.alertStudents.map(s => {
              const isCritical = s.priority === 'critical';
              const cfg = isCritical ? statusConfig.critical : statusConfig.risk;
              return (
                <div key={s.id} className={`border-2 ${cfg.border} ${cfg.bg} rounded-lg p-4 relative`}>
                  <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl text-[10px] font-bold bg-red-600 text-white">{isCritical ? '긴급' : '주의'}</div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full ${cfg.soft} text-white flex items-center justify-center serif-ko font-bold shrink-0`}>{s.name.charAt(0)}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900">{s.name} <span className="text-xs text-slate-500 font-normal">· {s.grade}</span></div>
                      <div className="text-[11px] text-slate-600 mt-0.5">목표 · {s.target}</div>
                    </div>
                  </div>
                  <div className="bg-white/70 rounded p-3 border border-white space-y-1">
                    {s.signals.map((sig, j) => (
                      <div key={j} className={`text-xs ${cfg.text}`}><span className="font-bold">{sig.label}</span> · {sig.detail}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 학생 목록 + 액션 */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-7 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Users size={14} className="text-slate-700" /><div className="serif-ko text-base font-bold text-slate-900">담당 학생 ({summary.students.length}명)</div></div>
          </div>
          <div className="space-y-2">
            {summary.students.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-6">담당 학생이 없습니다</div>
            )}
            {summary.students.slice(0, 6).map(s => (
              <button
                key={s.id}
                onClick={() => setInputStudent(s)}
                className="w-full text-left border border-stone-200 rounded-lg p-3 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-slate-700 text-white flex items-center justify-center serif-ko font-bold text-sm shrink-0">{s.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                    <div className="text-[10px] text-slate-500">{s.grade}</div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">{s.finalGoalSchool ?? '목표 미설정'}</div>
                </div>
                {typeof s.overallReadiness === 'number' && (
                  <div className="font-bold num text-slate-900 shrink-0">{s.overallReadiness}<span className="text-[10px] text-slate-500 font-normal">%</span></div>
                )}
                <ChevronRight size={14} className="text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-center">
            <Link href="/students" className="text-xs text-slate-700 hover:text-slate-900 font-semibold">담당 학생 전체 보기 →</Link>
          </div>
        </div>

        <div className="col-span-5 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Inbox size={14} className="text-slate-700" /><div className="serif-ko text-base font-bold text-slate-900">내가 담당한 액션</div></div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">기한 임박순</div>
          </div>
          {summary.actions.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6">진행 중인 액션이 없습니다</div>
          ) : (
            <div className="space-y-2">
              {summary.actions.map((a, i) => {
                const isLate = typeof a.daysLeft === 'number' && a.daysLeft < 0;
                const isUrgent = typeof a.daysLeft === 'number' && a.daysLeft >= 0 && a.daysLeft <= 3;
                const cfg = actionStatusConfig[a.status] ?? actionStatusConfig['in-progress'];
                return (
                  <div key={i} className={`border ${isLate ? 'border-red-300 bg-red-50/30' : isUrgent ? 'border-amber-300 bg-amber-50/30' : 'border-stone-200'} rounded-lg p-3`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                        <div className="text-[11px] font-semibold text-slate-700 shrink-0">{a.student}</div>
                      </div>
                      {typeof a.daysLeft === 'number' && (
                        <div className={`text-[10px] font-bold shrink-0 num ${isLate ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-slate-500'}`}>
                          {isLate ? `D+${Math.abs(a.daysLeft)}` : `D-${a.daysLeft}`}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-900 font-semibold mb-1.5 leading-snug">{a.task}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-slate-500 num">{a.deadline ?? '기한 미정'}</div>
                      <div className={`text-[10px] px-2 py-0.5 rounded font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 이번 주 일정 */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-700" /><div className="serif-ko text-base font-bold text-slate-900">이번 주 일정</div></div>
        </div>
        {summary.schedule.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-6">등록된 일정이 없습니다</div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {summary.schedule.map((day, i) => (
              <div key={i} className="border border-stone-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-center border-b bg-stone-50 border-stone-200 text-slate-700">
                  <div className="text-[10px] uppercase tracking-wider opacity-70">{day.day}</div>
                  <div className="text-sm font-bold num mt-0.5">{day.date}</div>
                </div>
                <div className="p-2 space-y-1.5 min-h-[110px]">
                  {day.items.map((item, j) => (
                    <div key={j} className={`text-[10px] p-1.5 rounded ${item.urgent ? 'bg-red-50 border border-red-200' : 'bg-stone-50 border border-stone-200'}`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`font-bold num ${item.urgent ? 'text-red-700' : 'text-slate-700'}`}>{item.time}</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded ${item.urgent ? 'bg-red-200 text-red-800' : 'bg-white text-slate-600 border border-stone-200'}`}>{item.type}</span>
                      </div>
                      <div className={`leading-tight ${item.urgent ? 'text-red-900 font-semibold' : 'text-slate-800'}`}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer perspective="강사" extra="강사 본인이 담당하는 학생/액션/일정만 노출됩니다 · 권한 분리 적용" />

      {reportOpen && (
        <ReportModal
          mode="director"
          studentId={summary.students[0]?.id}
          studentName={summary.students[0]?.name}
          onClose={() => setReportOpen(false)}
        />
      )}
      {counselingModal && (
        <CounselingModal
          mode="new"
          prefill={null}
          studentName={counselingTarget?.name}
          onClose={() => setCounselingModal(null)}
          onSave={handleSaveCounseling}
          onToggleAction={() => {}}
        />
      )}
      {inputStudent && (
        <StudentInputModal
          studentId={inputStudent.id}
          studentName={inputStudent.name}
          grade={inputStudent.grade}
          onClose={() => setInputStudent(null)}
          onSaved={loadSummary}
        />
      )}
      {pickerOpen && branchId && (
        <InstructorPickerModal
          branchId={branchId}
          currentInstructorId={instructorId ?? undefined}
          onSelect={id => { setInstructorId(id); setSummary(null); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
    </RoleGuard>
  );
}

export default InstructorPage;
