'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Branch { id: string; name: string; }

interface Props {
  branches: Branch[];
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteBranchModal({ branches, onClose, onDeleted }: Props) {
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!branchId) {
      setError('삭제할 지점을 선택해 주세요');
      return;
    }
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/branches/${branchId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '지점 삭제에 실패했습니다');
        setDeleting(false);
        return;
      }
      onDeleted();
      onClose();
    } catch {
      setError('지점 삭제에 실패했습니다');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
            <div className="serif-ko text-lg font-bold text-slate-900">지점 삭제</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">삭제할 지점 <span className="text-red-500">*</span></label>
              <select
                value={branchId}
                onChange={e => { setBranchId(e.target.value); setError(''); }}
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <option value="">지점을 선택하세요</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="text-xs text-slate-400">소속된 계정, 학생 또는 가입 신청이 있는 지점은 삭제할 수 없습니다.</div>
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>

          <div className="flex gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-stone-300 rounded-lg text-slate-600 hover:bg-stone-100 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
