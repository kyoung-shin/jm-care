import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

function parseDate(s: string): Date | null {
  const m = s.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function daysLeft(deadline: string): number | null {
  const d = parseDate(deadline);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentAppUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const instructor = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, branch: { select: { name: true } } } });
  if (!instructor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const students = await prisma.student.findMany({
    where: { instructorId: id },
    include: { counselings: { orderBy: { createdAt: 'desc' } } },
  });

  const actions = students
    .flatMap(s =>
      s.counselings
        .filter(c => c.actionName)
        .map(c => ({
          student: s.name,
          task: c.actionName as string,
          deadline: c.actionDeadline,
          status: c.actionStatus,
          daysLeft: c.actionDeadline ? daysLeft(c.actionDeadline) : null,
        }))
    )
    .filter(a => a.status !== 'completed')
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  const alertStudents = students
    .filter(s => Array.isArray(s.riskSignals) && (s.riskSignals as { tone?: string }[]).some(r => r?.tone === 'risk' || r?.tone === 'critical'))
    .map(s => {
      const signals = (s.riskSignals as { label: string; detail: string; tone?: string }[]).filter(r => r.tone === 'risk' || r.tone === 'critical');
      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        target: s.finalGoalSchool ?? '목표 미설정',
        priority: signals.some(sig => sig.tone === 'critical') ? 'critical' as const : 'high' as const,
        signals,
      };
    });

  const scheduleEvents = await prisma.scheduleEvent.findMany({
    where: { instructorId: id },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });

  const scheduleByDate = new Map<string, typeof scheduleEvents>();
  for (const ev of scheduleEvents) {
    const list = scheduleByDate.get(ev.date) ?? [];
    list.push(ev);
    scheduleByDate.set(ev.date, list);
  }
  const schedule = Array.from(scheduleByDate.entries()).map(([date, items]) => ({
    date,
    day: items[0]?.day ?? '',
    items: items.map(i => ({ time: i.time, type: i.type, label: i.label, urgent: i.urgent })),
  }));

  const today = new Date();
  const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const todayItems = scheduleEvents.filter(e => e.date === todayStr).length;
  const urgentActions = actions.filter(a => a.status === 'overdue' || a.status === 'urgent').length;

  return NextResponse.json({
    instructor: { id: instructor.id, name: instructor.name, branch: instructor.branch?.name ?? null },
    students: students.map(s => ({
      id: s.id, name: s.name, grade: s.grade, school: s.school,
      finalGoalSchool: s.finalGoalSchool, overallReadiness: s.overallReadiness,
    })),
    actions,
    alertStudents,
    schedule,
    todayItems,
    urgentActions,
  });
}
