import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'JM-CARE — 종로엠스쿨 학생 종합관리 시스템',
  description: '학생 진학 관리, 모의고사 분석, 상담 기록, 학부모 리포트',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ko" className="h-full">
        <body className="min-h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
