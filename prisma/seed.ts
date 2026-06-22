import { config } from 'dotenv';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: '.env.local' });
config({ path: '.env' });

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Branch
  const branch = await prisma.branch.upsert({
    where: { id: 'branch_wonjung' },
    update: {},
    create: { id: 'branch_wonjung', name: '운정점' },
  });

  // Instructor
  const instructor = await prisma.user.upsert({
    where: { clerkId: 'clerk_instructor_baek' },
    update: {},
    create: {
      id: 'user_baek_jihun',
      clerkId: 'clerk_instructor_baek',
      name: '박지훈',
      email: 'baek@jmcare.kr',
      role: 'INSTRUCTOR',
      branchId: branch.id,
    },
  });

  const instructor2 = await prisma.user.upsert({
    where: { clerkId: 'clerk_instructor_kim' },
    update: {},
    create: {
      id: 'user_kim_seoyeon',
      clerkId: 'clerk_instructor_kim',
      name: '김서연',
      email: 'kimsy@jmcare.kr',
      role: 'INSTRUCTOR',
      branchId: branch.id,
    },
  });

  // Director
  await prisma.user.upsert({
    where: { clerkId: 'clerk_director_main' },
    update: {},
    create: {
      id: 'user_director_main',
      clerkId: 'clerk_director_main',
      name: '원장',
      email: 'director@jmcare.kr',
      role: 'DIRECTOR',
      branchId: branch.id,
    },
  });

  // Student — 김민준
  const student = await prisma.student.upsert({
    where: { id: 'student_minjun' },
    update: {},
    create: {
      id: 'student_minjun',
      name: '김민준',
      initial: '김',
      grade: '중2',
      school: '파주 운정중',
      enrolledMonths: 12,
      finalGoalSchool: '고려대학교',
      finalGoalDetail: '공학계열 희망',
      finalGoalTrack: '수시·정시 트랙 고1 결정 예정',
      midGoalSchool: '일반고 상위권 트랙',
      midGoalDetail: '내신 1점대 진입 기반 조성',
      midGoalTrack: '고입 2027',
      daysUntilCSAT: 1647,
      daysUntilHS: 477,
      overallReadiness: 71,
      peerAverage: 78,
      instructorId: instructor.id,
      branchId: branch.id,
    },
  });

  // Mock Exams
  const examData = [
    { name: '1차', date: '2025.06.14', fullName: '2025 6월 전국 학력평가', korean: 72, english: 80, math: 68, science: 75, avg: 73.8, percentile: '상위 26.2%' },
    { name: '2차', date: '2025.09.13', fullName: '2025 9월 전국 학력평가', korean: 76, english: 84, math: 75, science: 78, avg: 78.3, percentile: '상위 21.7%' },
    { name: '3차', date: '2025.12.13', fullName: '2025 12월 전국 학력평가', korean: 81, english: 86, math: 82, science: 77, avg: 81.5, percentile: '상위 18.5%' },
    { name: '4차', date: '2026.03.14', fullName: '2026 3월 전국 학력평가', korean: 84, english: 89, math: 88, science: 82, avg: 85.8, percentile: '상위 14.2%' },
  ];

  for (const exam of examData) {
    await prisma.mockExam.upsert({
      where: { id: `exam_minjun_${exam.name}` },
      update: {},
      create: { id: `exam_minjun_${exam.name}`, studentId: student.id, ...exam },
    });
  }

  // Counseling records
  const counselingData = [
    {
      id: 'counseling_minjun_3',
      date: '2026.04.15', type: '정기상담', topic: '학습',
      summary: '4차 학평 분석 결과 국어 백분위 84로 상승 추세이나, 고려대 합격생 중2 시점 평균(90) 대비 갭 최대. 비문학 독해 기초 체력이 원인으로 진단되어 독해 기초반 편성 결정.',
      internalMemo: '학생이 문학 지문은 강하나 비문학에서 시간 부족. 학부모가 국어보다 수학에 관심 집중.',
      parentShare: '국어 비문학 독해력 향상을 위해 독해 기초반을 시작합니다.',
      actionName: '국어 독해 기초반 편성 (주 2회)', actionOwner: '박지훈 강사', actionDeadline: '2026.05.31', actionStatus: 'in-progress',
    },
    {
      id: 'counseling_minjun_2',
      date: '2026.01.10', type: '정기상담', topic: '학습',
      summary: '3차 학평 분석. 수학 백분위 68→82 급성장 확인 (입학 후 +14). 현 추세 유지를 위해 고1 과정 심화 선행 시작 결정.',
      internalMemo: '수학 자신감이 학습 전반의 동력이 되고 있음.',
      parentShare: '수학이 크게 성장하여 고1 과정 선행을 시작합니다.',
      actionName: '수학 고1 선행반 배정 + 월간 점검', actionOwner: '김서연 강사', actionDeadline: '2026.02.28', actionStatus: 'completed',
    },
    {
      id: 'counseling_minjun_1',
      date: '2025.11.20', type: '진로상담', topic: '진로',
      summary: '학부모 면담. 학생의 공학 분야 흥미와 1년간 성장 추세를 근거로 최종 목표를 고려대학교(공학계열)로 구체화.',
      internalMemo: '학부모가 처음에는 의대 희망. 학생 공학 흥미와 적성 데이터로 설득.',
      parentShare: '민준이의 공학 분야 흥미와 성장 추세를 근거로 고려대학교를 목표로 정했습니다.',
      actionName: '5년 장기 로드맵 수립 및 공유', actionOwner: '박지훈 강사', actionDeadline: '2025.12.10', actionStatus: 'completed',
    },
  ];

  for (const c of counselingData) {
    await prisma.counseling.upsert({
      where: { id: c.id },
      update: {},
      create: { studentId: student.id, ...c },
    });
  }

  // Other students for instructor view
  const otherStudents = [
    { id: 'student_seoyeon', name: '이서연', initial: '이', grade: '중2', school: '고양 능곡중', overallReadiness: 61 },
    { id: 'student_yujin', name: '정유진', initial: '정', grade: '중3', school: '파주 문산중', overallReadiness: 75 },
    { id: 'student_haneul', name: '윤하늘', initial: '윤', grade: '중3', school: '김포 풍무중', overallReadiness: 78 },
    { id: 'student_junho', name: '박준호', initial: '박', grade: '중1', school: '파주 야당중', overallReadiness: 81 },
    { id: 'student_jiwon', name: '최지원', initial: '최', grade: '중3', school: '파주 와동중', overallReadiness: 87 },
  ];

  for (const s of otherStudents) {
    await prisma.student.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id, name: s.name, initial: s.initial, grade: s.grade, school: s.school,
        enrolledMonths: 6, overallReadiness: s.overallReadiness,
        instructorId: instructor.id, branchId: branch.id,
      },
    });
  }

  console.log('✓ Seed completed successfully');
  console.log(`  Branch: ${branch.name}`);
  console.log(`  Instructors: 박지훈, 김서연`);
  console.log(`  Students: ${otherStudents.length + 1}명`);
  console.log(`  Mock Exams: ${examData.length}회`);
  console.log(`  Counselings: ${counselingData.length}건`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
