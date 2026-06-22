'use client';

import { useState, useEffect } from 'react';
import { Users, Plus } from 'lucide-react';

type Role = 'DIRECTOR' | 'INSTRUCTOR' | 'PARENT';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  branch: { name: string } | null;
  createdAt: string;
  _count?: { students: number };
}

const ROLE_LABELS: Record<Role, string> = {
  DIRECTOR: '원장',
  INSTRUCTOR: '강사',
  PARENT: '학부모',
};

const ROLE_STYLES: Record<Role, string> = {
  DIRECTOR: 'bg-amber-50 text-amber-700 border-amber-200',
  INSTRUCTOR: 'bg-blue-50 text-blue-700 border-blue-200',
  PARENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="serif-ko text-3xl font-black text-slate-900">사용자 관리</div>
          <div className="text-sm text-slate-500 mt-1">강사 · 원장 · 학부모 계정 및 권한 설정</div>
        </div>
        <button className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs hover:bg-slate-800 flex items-center gap-1">
          <Plus size={12} /> 사용자 등록
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        <strong>역할 설정 방법:</strong> Clerk 대시보드에서 사용자의 <code className="bg-amber-100 px-1 rounded">publicMetadata.role</code>을{' '}
        <code className="bg-amber-100 px-1 rounded">DIRECTOR</code> / <code className="bg-amber-100 px-1 rounded">INSTRUCTOR</code> / <code className="bg-amber-100 px-1 rounded">PARENT</code>로 설정하면
        로그인 시 자동으로 해당 뷰로 리다이렉트됩니다.
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">데이터 로딩 중...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="text-slate-300 mx-auto mb-3" />
            <div className="text-slate-500 text-sm">등록된 사용자가 없습니다</div>
            <div className="text-xs text-slate-400 mt-1">시드 스크립트를 실행하거나 직접 Clerk에서 사용자를 생성하세요</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-[11px] text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">이름</th>
                <th className="px-4 py-3 text-left font-semibold">이메일</th>
                <th className="px-4 py-3 text-left font-semibold">역할</th>
                <th className="px-4 py-3 text-left font-semibold">지점</th>
                <th className="px-4 py-3 text-center font-semibold">담당 학생</th>
                <th className="px-4 py-3 text-center font-semibold">등록일</th>
                <th className="px-4 py-3 text-center font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-t border-stone-200 hover:bg-stone-50 ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}>
                  <td className="px-4 py-3 font-bold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${ROLE_STYLES[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.branch?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-center num text-slate-600">{u._count?.students ?? 0}명</td>
                  <td className="px-4 py-3 text-center text-slate-500 num text-xs">{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded">편집</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
