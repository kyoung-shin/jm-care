import { Users } from 'lucide-react';

interface FooterProps {
  perspective: string;
  extra?: string;
}

export default function Footer({ perspective, extra }: FooterProps) {
  return (
    <div className="mt-6 flex items-center justify-between text-[11px] text-slate-500 border-t border-stone-200 pt-4">
      <div className="flex items-center gap-4">
        <span>JM-CARE Prototype v0.6 · 상담기록 활성화 케이스 · 모의고사 4회 누적 + 5년 로드맵</span>
        <span className="text-stone-300">|</span>
        <span>{extra ?? '본 화면은 더미 데이터로 구성된 시연용 프로토타입입니다'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Users size={11} />
        <span>현재 관점: <span className="font-semibold text-slate-700">{perspective}</span></span>
      </div>
    </div>
  );
}
