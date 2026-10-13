import { supabase } from './supabase';

interface Row {
  branch_id: string | null;
  branch_name: string;
  group_id: string;
  group_name: string;
  student_id: string;
  student_name: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
}

export interface Counts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
}

export interface GroupAttendance extends Counts {
  id: string;
  name: string;
  branchName: string;
  students: (Counts & { id: string; name: string })[];
}

export interface BranchAttendance extends Counts {
  id: string;
  name: string;
  groups: GroupAttendance[];
}

export interface AttendanceSummary {
  totals: Counts;
  branches: BranchAttendance[];
  groups: GroupAttendance[];
  // Ученики с наибольшим числом пропусков (без уважительной причины).
  absentees: (Counts & { id: string; name: string; groupName: string })[];
}

const empty = (): Counts => ({ present: 0, late: 0, absent: 0, excused: 0, total: 0 });

function add(target: Counts, row: Counts) {
  target.present += row.present;
  target.late += row.late;
  target.absent += row.absent;
  target.excused += row.excused;
  target.total += row.total;
}

// Доля посещений: «был» и «опоздал» от всех отметок.
export function attendanceRate(c: Counts): number {
  return c.total === 0 ? 0 : Math.round(((c.present + c.late) / c.total) * 100);
}

export async function fetchAttendanceSummary(from: string, to: string, noBranch: string): Promise<AttendanceSummary> {
  const { data, error } = await supabase.rpc('attendance_summary', { p_from: from, p_to: to });
  if (error) throw error;
  const totals = empty();
  const branches = new Map<string, BranchAttendance>();
  const groups = new Map<string, GroupAttendance>();
  const absentees: AttendanceSummary['absentees'] = [];
  for (const raw of (data as Row[]) ?? []) {
    const c: Counts = {
      present: Number(raw.present),
      late: Number(raw.late),
      absent: Number(raw.absent),
      excused: Number(raw.excused),
      total: 0,
    };
    c.total = c.present + c.late + c.absent + c.excused;
    add(totals, c);
    const branchId = raw.branch_id ?? 'none';
    let branch = branches.get(branchId);
    if (!branch) {
      branch = { id: branchId, name: raw.branch_name || noBranch, groups: [], ...empty() };
      branches.set(branchId, branch);
    }
    add(branch, c);
    let group = groups.get(raw.group_id);
    if (!group) {
      group = { id: raw.group_id, name: raw.group_name, branchName: branch.name, students: [], ...empty() };
      groups.set(raw.group_id, group);
      branch.groups.push(group);
    }
    add(group, c);
    group.students.push({ id: raw.student_id, name: raw.student_name, ...c });
    if (c.absent > 0) absentees.push({ id: `${raw.group_id}:${raw.student_id}`, name: raw.student_name, groupName: raw.group_name, ...c });
  }
  absentees.sort((a, b) => b.absent - a.absent || a.name.localeCompare(b.name));
  return {
    totals,
    branches: [...branches.values()],
    groups: [...groups.values()].sort((a, b) => attendanceRate(a) - attendanceRate(b)),
    absentees: absentees.slice(0, 30),
  };
}
