'use client';
import { useState } from 'react';
import {
  Building2, Database, Plus, Search, Upload, Edit3, Send, CheckCircle2, ShieldCheck, School,
} from 'lucide-react';

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

export default function AdminHQPage() {
  const [tab, setTab] = useState<Tab>('입시기준 DB');

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
        <StatCard label="등록 지점" value="38" unit="개" sub="운영중 36 · 준비중 2" icon={School} />
        <StatCard label="전체 강사" value="247" unit="명" sub="이번달 신규 12명" icon={Building2} />
        <StatCard label="전체 재원생" value="9,418" unit="명" sub="전월 대비 +312" icon={Building2} />
        <StatCard label="입시 DB 학교" value="184" unit="개교" sub="검증완료 171 · 갱신중 13" icon={Database} />
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

function AdmissionDB() {
  const schools = [
    { name: '고려대학교 (서울)', dept: '신소재공학부 외 82개 모집단위', year: 2027, types: 4, status: 'verified', updated: '2026.06.10', by: '입시연구팀 김OO' },
    { name: '서울대학교', dept: '공과대학 외 76개', year: 2027, types: 3, status: 'verified', updated: '2026.06.08', by: '입시연구팀 김OO' },
    { name: '연세대학교 (서울)', dept: '공학계열 외', year: 2027, types: 4, status: 'verified', updated: '2026.06.05', by: '입시연구팀 이OO' },
    { name: '경기북과학고', dept: '자기주도학습전형', year: 2027, types: 1, status: 'draft', updated: '2026.05.20', by: '입시연구팀 이OO' },
    { name: 'KAIST 부설 한국과학영재학교', dept: '영재학교 전형', year: 2027, types: 1, status: 'review', updated: '2026.05.18', by: '입시연구팀 박OO' },
  ];
  const statusCfg: Record<string, { label: string; cls: string }> = {
    verified: { label: '검증완료', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    review: { label: '검토중', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    draft: { label: '초안', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  };
  return (
    <div className="space-y-4">
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
        <Database size={18} className="text-violet-600 mt-0.5 shrink-0" />
        <div className="text-xs text-violet-900 leading-relaxed flex-1">
          <span className="font-bold">연 1회 갱신 원칙.</span> 대학 전형계획 발표(4~6월) 시 입시연구팀이 PDF 원문과 대조 검증 후 등록합니다. AI는 초안 추출에만 1회성으로 사용하며, 검증완료(verified) 전까지는 학생 대시보드에 반영되지 않습니다.
        </div>
        <button className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 hover:bg-violet-700">
          <Plus size={13} /> 학교 추가
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-stone-50">
          <div className="text-sm font-bold text-slate-900">2027학년도 입시 기준 마스터</div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="text-xs border border-stone-300 rounded-lg pl-8 pr-3 py-1.5 w-44" placeholder="학교 검색" />
            </div>
            <button className="text-xs px-2.5 py-1.5 border border-stone-300 rounded-lg flex items-center gap-1 hover:bg-stone-50">
              <Upload size={12} /> PDF 일괄 등록
            </button>
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
            {schools.map((s, i) => {
              const sc = statusCfg[s.status];
              return (
                <tr key={i} className="border-t border-stone-100 hover:bg-stone-50/50">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-500">{s.dept}</div>
                  </td>
                  <td className="px-3 py-3 text-center num text-slate-700">{s.year}</td>
                  <td className="px-3 py-3 text-center num text-slate-700">{s.types}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${sc.cls}`}>{sc.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-[11px] text-slate-700 num">{s.updated}</div>
                    <div className="text-[10px] text-slate-400">{s.by}</div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button className="text-xs text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-0.5 ml-auto">
                      <Edit3 size={12} /> 편집
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Edit3 size={14} className="text-violet-600" />
          <div className="serif-ko text-base font-bold text-slate-900">전형 입력 폼 — 고려대 학업우수전형 (예시)</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="전형명" required><input className={inputCls} defaultValue="학업우수전형" /></Field>
          <Field label="모집시기" required>
            <select className={inputCls}><option>수시</option><option>정시</option><option>고입</option></select>
          </Field>
          <Field label="전형 유형"><input className={inputCls} defaultValue="학생부종합" /></Field>
          <Field label="전형 방법"><input className={inputCls} defaultValue="서류 100% 일괄합산" /></Field>
          <Field label="수능최저 기준" hint="(충족 판정용)">
            <input className={inputCls} defaultValue="국·수·영·탐(1) 4개 중 3개 합 7 이내" />
          </Field>
          <Field label="한국사"><input className={inputCls} defaultValue="4등급 이내" /></Field>
        </div>
        <div className="mt-4 border-t border-stone-100 pt-4">
          <div className="text-[11px] font-semibold text-slate-600 mb-2">목표 지표 (학생 갭 계산 기준)</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <div className="text-[10px] text-slate-500 mb-1">내신 평균 등급</div>
              <div className="flex items-center gap-1"><input className="w-16 text-sm border border-stone-300 rounded px-2 py-1 num" defaultValue="1.5" /><span className="text-xs text-slate-500">등급 이하</span></div>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <div className="text-[10px] text-slate-500 mb-1">수능최저 충족 가능성</div>
              <div className="flex items-center gap-1"><input className="w-16 text-sm border border-stone-300 rounded px-2 py-1 num" defaultValue="80" /><span className="text-xs text-slate-500">% 이상</span></div>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <div className="text-[10px] text-slate-500 mb-1">생기부 계열적합 활동</div>
              <div className="flex items-center gap-1"><input className="w-16 text-sm border border-stone-300 rounded px-2 py-1 num" defaultValue="3" /><span className="text-xs text-slate-500">건 이상</span></div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">출처: 고려대 2027 입학전형시행계획 · 검증: 입시연구팀</div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs border border-stone-300 rounded-lg hover:bg-stone-50">초안 저장</button>
            <button className="px-4 py-1.5 text-xs bg-violet-600 text-white rounded-lg font-semibold flex items-center gap-1 hover:bg-violet-700"><CheckCircle2 size={13} /> 검증완료 등록</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchAccounts() {
  const branches = [
    { name: '운정점', dir: '최영호 원장', teachers: 12, students: 286, status: '운영중', region: '경기 파주' },
    { name: '일산점', dir: '김미경 원장', teachers: 18, students: 412, status: '운영중', region: '경기 고양' },
    { name: '분당점', dir: '이정훈 원장', teachers: 21, students: 487, status: '운영중', region: '경기 성남' },
    { name: '대전둔산점', dir: '박상우 원장', teachers: 15, students: 334, status: '운영중', region: '대전 서구' },
    { name: '청주점', dir: '— (배정 예정)', teachers: 0, students: 0, status: '준비중', region: '충북 청주' },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">지점 계정과 원장·강사 계정을 발급·관리합니다.</div>
        <button className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-violet-700"><Plus size={13} /> 지점 등록</button>
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
            {branches.map((b, i) => (
              <tr key={i} className="border-t border-stone-100 hover:bg-stone-50/50">
                <td className="px-5 py-3 font-semibold text-slate-900">{b.name}</td>
                <td className="px-3 py-3 text-slate-600 text-xs">{b.region}</td>
                <td className="px-3 py-3 text-slate-700">{b.dir}</td>
                <td className="px-3 py-3 text-center num">{b.teachers}</td>
                <td className="px-3 py-3 text-center num">{b.students}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${b.status === '운영중' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{b.status}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  <button className="text-xs text-slate-500 hover:text-slate-900 font-semibold">계정 관리 →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="serif-ko text-base font-bold text-slate-900 mb-4">신규 계정 발급 (예시)</div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="소속 지점" required><select className={inputCls}><option>운정점</option><option>일산점</option></select></Field>
          <Field label="역할" required><select className={inputCls}><option>원장</option><option>강사</option><option>행정직원</option></select></Field>
          <Field label="이름" required><input className={inputCls} placeholder="홍길동" /></Field>
          <Field label="휴대폰" required><input className={inputCls} placeholder="010-0000-0000" /></Field>
          <Field label="이메일"><input className={inputCls} placeholder="example@jmcare.kr" /></Field>
          <Field label="권한 범위" hint="(강사: 담당 학생만)"><select className={inputCls}><option>담당 학생만</option><option>지점 전체</option></select></Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-1.5 text-xs bg-violet-600 text-white rounded-lg font-semibold flex items-center gap-1 hover:bg-violet-700"><Send size={13} /> 초대 발송</button>
        </div>
      </div>
    </div>
  );
}

function FranchiseStandards() {
  const items = [
    { k: '가맹비', v: '1,650만원', n: 'VAT 포함 · 1회' },
    { k: '월 로열티', v: '99만원', n: 'VAT 포함' },
    { k: '권역 단위', v: '초중등 5,000명', n: '권역 내 1위 목표 500명' },
    { k: '학부모 시스템 사용료', v: '월 25,000원', n: '학부모가 본사에 직접 결제' },
  ];
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500">프랜차이즈 표준 정책을 관리합니다. 변경 시 전 지점에 자동 반영됩니다.</div>
      <div className="grid grid-cols-2 gap-4">
        {items.map((it, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">{it.k}</div>
              <div className="text-xl font-black text-slate-900 num mt-0.5">{it.v}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{it.n}</div>
            </div>
            <button className="text-xs text-slate-400 hover:text-slate-700"><Edit3 size={14} /></button>
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
