'use client';

import { useRef, useState } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';

interface Props {
  label: string;
  endpoint: string;
  /** 어떤 표를 올리는지 안내 (버튼 툴팁) */
  hint: string;
  /**
   * append  — 기존 내용에 더한다 (같은 항목은 갱신)
   * replace — 기존 내용을 모두 지우고 올린 파일로 바꾼다
   */
  mode: 'append' | 'replace';
  /** 업로드 결과를 한 줄 문구로 */
  summarize: (data: Record<string, unknown>) => string;
  onDone?: () => void;
}

/**
 * CSV 를 골라 한 번에 올리는 버튼.
 * 엑셀에서 내보낸 표를 그대로 올리므로 파싱·검증은 서버가 맡고,
 * 여기서는 결과 요약과 오류만 보여 준다.
 */
export default function CsvUploadButton({ label, endpoint, hint, mode, summarize, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; detail?: string[] } | null>(null);
  // 전체 교체는 되돌릴 수 없어 한 번 더 확인받는다
  const [confirming, setConfirming] = useState(false);

  const modeNote = mode === 'replace'
    ? '기존 내용을 모두 교체합니다'
    : '기존 내용에 추가됩니다 (같은 항목은 갱신)';

  const openPicker = () => {
    if (mode === 'replace' && !confirming) { setConfirming(true); return; }
    setConfirming(false);
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 동작하도록
    if (!file) return;

    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, text: data.error || '업로드에 실패했습니다' });
        return;
      }
      const errors = Array.isArray(data.errors) ? (data.errors as string[]) : [];
      setResult({
        ok: errors.length === 0,
        text: summarize(data as Record<string, unknown>),
        detail: errors.length > 0 ? errors.slice(0, 5) : undefined,
      });
      onDone?.();
    } catch {
      setResult({ ok: false, text: '네트워크 오류가 발생했습니다' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
      <button
        onClick={openPicker}
        disabled={busy}
        title={`${hint} · ${modeNote}`}
        className={`px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50 flex items-center gap-1 ${
          confirming
            ? 'border-amber-400 bg-amber-50 text-amber-800 font-semibold'
            : 'border-stone-300 hover:bg-stone-50'
        }`}
      >
        <Upload size={12} /> {busy ? '업로드 중...' : confirming ? '전체 교체 — 한 번 더 누르세요' : label}
      </button>
      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="absolute -bottom-5 right-0 text-[10px] text-slate-500 hover:text-slate-800"
        >
          취소
        </button>
      )}
      {result && (
        <div
          className={`absolute bottom-full right-0 mb-2 w-72 rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed shadow-lg z-10 ${
            result.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start gap-1.5">
            {result.ok ? <Check size={12} className="mt-0.5 shrink-0" /> : <AlertCircle size={12} className="mt-0.5 shrink-0" />}
            <div className="flex-1">
              <div className="font-semibold">{result.text}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{modeNote}</div>
              {result.detail && (
                <ul className="mt-1 space-y-0.5 text-[10px] opacity-80">
                  {result.detail.map((d, i) => <li key={i}>· {d}</li>)}
                </ul>
              )}
            </div>
            <button onClick={() => setResult(null)} className="shrink-0 opacity-60 hover:opacity-100">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
