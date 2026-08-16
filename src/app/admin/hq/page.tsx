'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Building2, Database, Plus, Search, Edit3, CheckCircle2, ShieldCheck, School,
} from 'lucide-react';
import BranchAccountsModal from '@/components/modals/BranchAccountsModal';
import AddBranchModal from '@/components/modals/AddBranchModal';
import DeleteBranchModal from '@/components/modals/DeleteBranchModal';
import AddSchoolModal from '@/components/modals/AddSchoolModal';
import { registerBeforeLeaveSave } from '@/lib/beforeLeave';

const inputCls = 'w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white';

function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-slate-400 font-normal ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function StatCard({ label, value, unit, sub, icon: Icon }: { label: string; value: string; unit?: string; sub?: string; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
        {Icon && <Icon size={14} className="text-slate-400" />}
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-[32px] font-black num leading-none text-slate-900">{value}</div>
        {unit && <div className="text-sm text-slate-500 font-semibold">{unit}</div>}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-1.5">{sub}</div>}
    </div>
  );
}

const TABS = ['입시기준 DB', '지점·계정 관리', '프랜차이즈 표준', '전국 통계'] as const;
type Tab = (typeof TABS)[number];

interface HQStatsData {
  branchCount: number;
  activeBranchCount: number;
  preparingBranchCount: number;
  instructorCount: number;
  newInstructorsThisMonth: number;
  studentCount: number;
  schoolCount: number;
  verifiedSchoolCount: number;
  updatingSchoolCount: number;
}

export default function AdminHQPage() {
  const [tab, setTab] = useState<Tab>('입시기준 DB');
  const [stats, setStats] = useState<HQStatsData | null>(null);

  useEffect(() => {
    fetch('/api/admin/hq-stats').then(r => r.json()).then(d => { if (d && !d.error) setStats(d); }).catch(() => {});
  }, []);

  return (
    <div className="ko-sans max-w-6xl mx-auto px-8 py-8">
      <div className="mb-7 border-b border-stone-200 pb-5 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Headquarters Admin</div>
          <div className="serif-ko text-3xl font-black text-slate-900">본사 관리</div>
          <div className="text-sm text-slate-500 mt-1.5">전사 표준 데이터를 관리합니다 · 모든 지점이 공유</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={13} className="text-violet-600" /> 최고 권한
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="등록 지점" value={String(stats?.branchCount ?? '—')} unit="개" sub={stats ? `운영중 ${stats.activeBranchCount} · 준비중 ${stats.preparingBranchCount}` : undefined} icon={School} />
        <StatCard label="전체 강사" value={String(stats?.instructorCount ?? '—')} unit="명" sub={stats ? `이번달 신규 ${stats.newInstructorsThisMonth}명` : undefined} icon={Building2} />
        <StatCard label="전체 재원생" value={stats ? stats.studentCount.toLocaleString() : '—'} unit="명" icon={Building2} />
        <StatCard label="입시 DB 학교" value={String(stats?.schoolCount ?? '—')} unit="개교" sub={stats ? `검증완료 ${stats.verifiedSchoolCount} · 갱신중 ${stats.updatingSchoolCount}` : undefined} icon={Database} />
      </div>

      <div className="flex gap-1 mb-5 border-b border-stone-200">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'text-violet-700 border-current' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === '입시기준 DB' && <AdmissionDB />}
      {tab === '지점·계정 관리' && <BranchAccounts />}
      {tab === '프랜차이즈 표준' && <FranchiseStandards />}
      {tab === '전국 통계' && <NationwideStats />}
    </div>
  );
}

interface AdmissionSchoolRow {
  id: string;
  name: string;
  dept: string | null;
  year: number;
  typesCount: number;
  status: 'VERIFIED' | 'REVIEW' | 'DRAFT';
  updatedBy: string | null;
  source: string | null;
  updatedAt: string;
}

const statusCfg: Record<string, { label: string; cls: string }> = {
  VERIFIED: { label: '검증완료', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REVIEW: { label: '검토중', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  DRAFT: { label: '초안', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const currentAdmissionYear = new Date().getFullYear() + 1;

function AdmissionDB() {
  const [schools, setSchools] = useState<AdmissionSchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<AdmissionSchoolRow | null>(null);

  const load = () => {
    fetch('/api/admin/admission-schools').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setSchools(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const q = query.trim().toLowerCase();
  const filteredSchools = q
    ? schools.filter(s => s.name.toLowerCase().includes(q) || (s.dept ?? '').toLowerCase().includes(q))
    : schools;

  return (
    <div className="space-y-4">
      {showAddModal && (
        <AddSchoolModal defaultYear={currentAdmissionYear} onClose={() => setShowAddModal(false)} onCreated={load} />
      )}
      {editingSchool && (
        <AddSchoolModal
          defaultYear={currentAdmissionYear}
          school={editingSchool}
          onClose={() => setEditingSchool(null)}
          onCreated={load}
        />
      )}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
        <Database size={18} className="text-violet-600 mt-0.5 shrink-0" />
        <div className="text-xs text-violet-900 leading-relaxed flex-1">
          <span className="font-bold">연 1회 갱신 원칙.</span> 대학 전형계획 발표(4~6월) 시 입시연구팀이 PDF 원문과 대조 검증 후 등록합니다. AI는 초안 추출에만 1회성으로 사용하며, 검증완료(verified) 전까지는 학생 대시보드에 반영되지 않습니다.
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 hover:bg-violet-700">
          <Plus size={13} /> 학교 추가
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-stone-50">
          <div className="text-sm font-bold text-slate-900">{currentAdmissionYear}학년도 입시 기준 마스터</div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} className="text-xs border border-stone-300 rounded-lg pl-8 pr-3 py-1.5 w-44" placeholder="학교 검색" />
            </div>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50/60 text-[11px] text-slate-500">
            <tr>
              <th className="px-5 py-2.5 text-left font-semibold">학교 / 모집단위</th>
              <th className="px-3 py-2.5 text-center font-semibold">학년도</th>
              <th className="px-3 py-2.5 text-center font-semibold">전형 수</th>
              <th className="px-3 py-2.5 text-center font-semibold">상태</th>
              <th className="px-3 py-2.5 text-left font-semibold">최종 갱신</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredSchools.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-400 text-sm">{q ? '검색 결과가 없습니다' : '등록된 학교가 없습니다'}</td></tr>
            )}
            {filteredSchools.map(s => {
              const sc = statusCfg[s.status];
              return (
                <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50/50">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-500">{s.dept}</div>
                  </td>
                  <td className="px-3 py-3 text-center num text-slate-700">{s.year}</td>
                  <td className="px-3 py-3 text-center num text-slate-700">{s.typesCount}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${sc.cls}`}>{sc.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-[11px] text-slate-700 num">{new Date(s.updatedAt).toLocaleDateString('ko-KR')}</div>
                    <div className="text-[10px] text-slate-400">{s.updatedBy}</div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => setEditingSchool(s)}
                      className="text-xs text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-0.5 ml-auto"
                    >
                      <Edit3 size={12} /> 편집
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TrackInputForm schools={schools} />
    </div>
  );
}

function TrackInputForm({ schools }: { schools: AdmissionSchoolRow[] }) {
  const [schoolId, setSchoolId] = useState('');
  const [name, setName] = useState('');
  const [period, setPeriod] = useState('수시');
  const [type, setType] = useState('');
  const [method, setMethod] = useState('');
  const [csatMinCriteria, setCsatMinCriteria] = useState('');
  const [koreanHistory, setKoreanHistory] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [targetCsatMinRate, setTargetCsatMinRate] = useState('');
  const [targetRecordCount, setTargetRecordCount] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedSchool = schools.find(s => s.id === schoolId);

  const reset = () => {
    setName(''); setPeriod('수시'); setType(''); setMethod('');
    setCsatMinCriteria(''); setKoreanHistory('');
    setTargetGrade(''); setTargetCsatMinRate(''); setTargetRecordCount(''); setSource('');
  };

  const handleSave = async (status: 'DRAFT' | 'VERIFIED') => {
    if (!schoolId) { setError('학교를 선택해 주세요'); return; }
    if (!name.trim()) { setError('전형명을 입력해 주세요'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/admission-schools/${schoolId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, period, type, method, csatMinCriteria, koreanHistory,
          targetGrade, targetCsatMinRate, targetRecordCount, source, status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '저장에 실패했습니다');
        setSaving(false);
        return;
      }
      reset();
      setSaving(false);
    } catch {
      setError('저장에 실패했습니다');
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Edit3 size={14} className="text-violet-600" />
        <div className="serif-ko text-base font-bold text-slate-900">
          전형 입력 폼{selectedSchool ? ` — ${selectedSchool.name}` : ''}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="학교" required>
          <select value={schoolId} onChange={e => setSchoolId(e.target.value)} className={inputCls}>
            <option value="">학교를 선택하세요</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="전형명" required>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 학업우수전형" className={inputCls} />
        </Field>
        <Field label="모집시기" required>
          <select value={period} onChange={e => setPeriod(e.target.value)} className={inputCls}>
            <option>수시</option><option>정시</option><option>고입</option>
          </select>
        </Field>
        <Field label="전형 유형">
          <input value={type} onChange={e => setType(e.target.value)} placeholder="예: 학생부종합" className={inputCls} />
        </Field>
        <Field label="전형 방법">
          <input value={method} onChange={e => setMethod(e.target.value)} placeholder="예: 서류 100% 일괄합산" className={inputCls} />
        </Field>
        <Field label="수능최저 기준" hint="(충족 판정용)">
          <input value={csatMinCriteria} onChange={e => setCsatMinCriteria(e.target.value)} placeholder="예: 국·수·영·탐(1) 4개 중 3개 합 7 이내" className={inputCls} />
        </Field>
        <Field label="한국사">
          <input value={koreanHistory} onChange={e => setKoreanHistory(e.target.value)} placeholder="예: 4등급 이내" className={inputCls} />
        </Field>
      </div>
      <div className="mt-4 border-t border-stone-100 pt-4">
        <div className="text-[11px] font-semibold text-slate-600 mb-2">목표 지표 (학생 갭 계산 기준)</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
            <div className="text-[10px] text-slate-500 mb-1">내신 평균 등급</div>
            <div className="flex items-center gap-1">
              <input value={targetGrade} onChange={e => setTargetGrade(e.target.value)} inputMode="decimal" className="w-16 text-sm border border-stone-300 rounded px-2 py-1 num" placeholder="1.5" />
              <span className="text-xs text-slate-500">등급 이하</span>
            </div>
          </div>
          <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
            <div className="text-[10px] text-slate-500 mb-1">수능최저 충족 가능성</div>
            <div className="flex items-center gap-1">
              <input value={targetCsatMinRate} onChange={e => setTargetCsatMinRate(e.target.value)} inputMode="numeric" className="w-16 text-sm border border-stone-300 rounded px-2 py-1 num" placeholder="80" />
              <span className="text-xs text-slate-500">% 이상</span>
            </div>
          </div>
          <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
            <div className="text-[10px] text-slate-500 mb-1">생기부 계열적합 활동</div>
            <div className="flex items-center gap-1">
              <input value={targetRecordCount} onChange={e => setTargetRecordCount(e.target.value)} inputMode="numeric" className="w-16 text-sm border border-stone-300 rounded px-2 py-1 num" placeholder="3" />
              <span className="text-xs text-slate-500">건 이상</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
        <input value={source} onChange={e => setSource(e.target.value)} placeholder="출처 (예: 고려대 2027 입학전형시행계획)" className="text-[11px] text-slate-600 border border-transparent hover:border-stone-200 focus:border-stone-300 rounded px-1.5 py-1 focus:outline-none flex-1 mr-3" />
        <div className="flex items-center gap-2 shrink-0">
          {error && <div className="text-xs text-red-600">{error}</div>}
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={saving}
            className="px-3 py-1.5 text-xs border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50"
          >
            초안 저장
          </button>
          <button
            onClick={() => handleSave('VERIFIED')}
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-violet-600 text-white rounded-lg font-semibold flex items-center gap-1 hover:bg-violet-700 disabled:opacity-50"
          >
            <CheckCircle2 size={13} /> 검증완료 등록
          </button>
        </div>
      </div>
    </div>
  );
}

type BranchStatus = 'ACTIVE' | 'PREPARING' | 'CLOSING';

const BRANCH_STATUS_LABELS: Record<BranchStatus, string> = { ACTIVE: '운영중', PREPARING: '준비중', CLOSING: '정리중' };
const BRANCH_STATUS_CLS: Record<BranchStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PREPARING: 'bg-amber-50 text-amber-700 border-amber-200',
  CLOSING: 'bg-red-50 text-red-700 border-red-200',
};

interface BranchRow {
  id: string;
  name: string;
  region: string | null;
  status: BranchStatus;
  directorName: string | null;
  instructorCount: number;
  _count: { users: number; students: number };
}

interface PendingSignup {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  requestedRole: string;
  reason?: string | null;
  createdAt: string;
  branch?: { name: string } | null;
  user?: { username: string | null } | null;
}

const REQUESTED_ROLE_LABELS: Record<string, string> = {
  DIRECTOR: '원장', INSTRUCTOR: '강사', PARENT: '학부모', STUDENT: '학생',
};

function BranchAccounts() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [pending, setPending] = useState<PendingSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountsModalBranch, setAccountsModalBranch] = useState<{ id: string; name: string } | null>(null);
  const [branchModal, setBranchModal] = useState<'add' | 'delete' | null>(null);
  const [actingOn, setActingOn] = useState<Record<string, boolean>>({});

  const load = () => {
    Promise.all([
      fetch('/api/admin/branches').then(r => r.json()),
      fetch('/api/admin/all-pending-users').then(r => r.json()),
    ]).then(([b, p]) => {
      if (Array.isArray(b)) setBranches(b);
      if (Array.isArray(p)) setPending(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const decide = async (p: PendingSignup, action: 'approve' | 'reject') => {
    setActingOn(a => ({ ...a, [p.id]: true }));
    try {
      const res = await fetch(`/api/admin/users/${p.userId}/${action}`, { method: 'POST' });
      if (res.ok) {
        load();
      } else {
        setActingOn(a => ({ ...a, [p.id]: false }));
      }
    } catch {
      setActingOn(a => ({ ...a, [p.id]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">현재 등록된 지점과 신규 가입 신청 현황입니다.</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBranchModal('add')}
            className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-violet-700"
          >
            <Plus size={13} /> 지점 추가
          </button>
          <button
            onClick={() => setBranchModal('delete')}
            className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50"
          >
            지점 삭제
          </button>
        </div>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] text-slate-500">
            <tr>
              <th className="px-5 py-2.5 text-left font-semibold">지점</th>
              <th className="px-3 py-2.5 text-left font-semibold">지역</th>
              <th className="px-3 py-2.5 text-left font-semibold">원장</th>
              <th className="px-3 py-2.5 text-center font-semibold">강사</th>
              <th className="px-3 py-2.5 text-center font-semibold">재원생</th>
              <th className="px-3 py-2.5 text-center font-semibold">상태</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && branches.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-6 text-center text-slate-400 text-sm">등록된 지점이 없습니다</td></tr>
            )}
            {branches.map(b => (
              <tr key={b.id} className="border-t border-stone-100 hover:bg-stone-50/50">
                <td className="px-5 py-3 font-semibold text-slate-900">{b.name}</td>
                <td className="px-3 py-3 text-slate-600 text-xs">{b.region ?? '—'}</td>
                <td className="px-3 py-3 text-slate-700">{b.directorName ?? '— (미배정)'}</td>
                <td className="px-3 py-3 text-center num">{b.instructorCount}</td>
                <td className="px-3 py-3 text-center num">{b._count.students}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${BRANCH_STATUS_CLS[b.status]}`}>{BRANCH_STATUS_LABELS[b.status]}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    onClick={() => setAccountsModalBranch({ id: b.id, name: b.name })}
                    className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
                  >
                    계정관리 →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200 bg-stone-50">
          <div className="text-sm font-bold text-slate-900">신규 가입 신청 <span className="text-violet-600 num">({pending.length})</span></div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50/60 text-[11px] text-slate-500">
            <tr>
              <th className="px-5 py-2.5 text-left font-semibold">아이디</th>
              <th className="px-3 py-2.5 text-left font-semibold">이름</th>
              <th className="px-3 py-2.5 text-left font-semibold">연락처</th>
              <th className="px-3 py-2.5 text-left font-semibold">이메일</th>
              <th className="px-3 py-2.5 text-center font-semibold">신청 역할</th>
              <th className="px-3 py-2.5 text-left font-semibold">지점</th>
              <th className="px-3 py-2.5 text-left font-semibold">사유</th>
              <th className="px-3 py-2.5 text-left font-semibold">신청일</th>
              <th className="px-3 py-2.5 text-right font-semibold">처리</th>
            </tr>
          </thead>
          <tbody>
            {!loading && pending.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-6 text-center text-slate-400 text-sm">대기 중인 가입 신청이 없습니다</td></tr>
            )}
            {pending.map(p => {
              const isDirector = p.requestedRole === 'DIRECTOR';
              const busy = !!actingOn[p.id];
              return (
                <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50/50">
                  <td className="px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">{p.user?.username ?? '—'}</td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{p.name}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">{p.phone || '—'}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">{p.email || '—'}</td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span className="text-[10px] px-2 py-1 rounded-full border font-semibold bg-violet-50 text-violet-700 border-violet-200">
                      {REQUESTED_ROLE_LABELS[p.requestedRole] ?? p.requestedRole}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{p.branch?.name ?? '—'}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{p.reason || '—'}</td>
                  <td className="px-3 py-3 text-slate-500 text-xs num whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {isDirector ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => decide(p, 'approve')}
                          disabled={busy}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => decide(p, 'reject')}
                          disabled={busy}
                          className="px-2.5 py-1 border border-stone-300 rounded-md text-[11px] text-slate-600 hover:bg-stone-100 disabled:opacity-50"
                        >
                          거부
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">해당 지점 원장 승인 필요</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {accountsModalBranch && (
        <BranchAccountsModal
          branchId={accountsModalBranch.id}
          branchName={accountsModalBranch.name}
          onClose={() => setAccountsModalBranch(null)}
        />
      )}

      {branchModal === 'add' && (
        <AddBranchModal onClose={() => setBranchModal(null)} onCreated={load} />
      )}

      {branchModal === 'delete' && (
        <DeleteBranchModal
          branches={branches.map(b => ({ id: b.id, name: b.name }))}
          onClose={() => setBranchModal(null)}
          onDeleted={load}
        />
      )}
    </div>
  );
}

const FRANCHISE_ITEMS = [
  { key: 'franchiseFee', k: '가맹비', n: 'VAT 포함 · 1회', default: '1,650만원' },
  { key: 'royalty', k: '월 로열티', n: 'VAT 포함', default: '99만원' },
  { key: 'regionUnit', k: '권역 단위', n: '권역 내 1위 목표 500명', default: '초중등 5,000명' },
  { key: 'parentFee', k: '학부모 시스템 사용료', n: '학부모가 본사에 직접 결제', default: '월 25,000원' },
];

function FranchiseStandards() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FRANCHISE_ITEMS.map(it => [it.key, it.default]))
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const valuesRef = useRef(values);
  useEffect(() => { valuesRef.current = values; }, [values]);

  const save = () => {
    const items = FRANCHISE_ITEMS.map(it => ({ key: it.key, value: valuesRef.current[it.key] ?? it.default }));
    fetch('/api/admin/franchise-standards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      keepalive: true,
    }).catch(() => {});
  };

  useEffect(() => {
    fetch('/api/admin/franchise-standards')
      .then(r => r.json())
      .then((rows: { key: string; value: string }[]) => {
        if (!Array.isArray(rows)) return;
        setValues(prev => {
          const next = { ...prev };
          rows.forEach(r => { if (r.key in next) next[r.key] = r.value; });
          return next;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unregister = registerBeforeLeaveSave(save);
    const handleBeforeUnload = () => save();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unregister();
      save();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500">프랜차이즈 표준 정책을 관리합니다. 변경 시 전 지점에 자동 반영됩니다.</div>
      <div className="grid grid-cols-2 gap-4">
        {FRANCHISE_ITEMS.map(it => (
          <div key={it.key} className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">{it.k}</div>
              {editingKey === it.key ? (
                <input
                  autoFocus
                  value={values[it.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [it.key]: e.target.value }))}
                  onBlur={() => setEditingKey(null)}
                  onKeyDown={e => { if (e.key === 'Enter') setEditingKey(null); }}
                  className="text-xl font-black text-slate-900 num mt-0.5 w-full border-b-2 border-violet-400 focus:outline-none"
                />
              ) : (
                <div className="text-xl font-black text-slate-900 num mt-0.5">{values[it.key] ?? it.default}</div>
              )}
              <div className="text-[11px] text-slate-400 mt-0.5">{it.n}</div>
            </div>
            <button
              onClick={() => setEditingKey(it.key)}
              className="text-xs text-slate-400 hover:text-slate-700 shrink-0 ml-2"
            >
              <Edit3 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="serif-ko text-base font-bold text-slate-900 mb-3">학습력 강화 시스템 (주 1회 정규수업 의무)</div>
        <div className="flex gap-3">
          {['브레인오아시스', '듣는교과서', '학교집중노트'].map((s, i) => (
            <div key={i} className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-sm font-medium text-slate-800">{s}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-slate-400 mt-2">※ 3개 중 1개 이상 주 1회 정규 수업 편성이 가맹 표준 의무사항입니다.</div>
      </div>
    </div>
  );
}

function NationwideStats() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="serif-ko text-base font-bold text-slate-900 mb-4">지점별 평균 준비도</div>
        {([['분당점', 81], ['일산점', 76], ['대전둔산점', 74], ['운정점', 71]] as [string, number][]).map(([n, v], i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between text-xs mb-1"><span className="text-slate-700">{n}</span><span className="num font-bold">{v}%</span></div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${v}%` }}></div></div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="serif-ko text-base font-bold text-slate-900 mb-4">전사 재원 안정성</div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="평균 재원기간" value="19.4" unit="개월" sub="전년 17.1개월" />
          <StatCard label="12개월 잔존율" value="84" unit="%" sub="전년 79%" />
          <StatCard label="이탈 위험군" value="218" unit="명" sub="전체의 2.3%" />
          <StatCard label="리포트 열람률" value="87" unit="%" sub="발송 대비" />
        </div>
      </div>
    </div>
  );
}
