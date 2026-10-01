import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colors, radius, spacing } from '../theme/colors';
import type { Attendance, AttendanceStatus } from '../types/database';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string }> = {
  present: { label: 'Был(а)', color: colors.success },
  late: { label: 'Опоздал(а)', color: colors.warning },
  absent: { label: 'Пропуск', color: colors.danger },
  excused: { label: 'Уваж. причина', color: colors.textMuted },
};

const STATUS_ORDER: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

export function AttendanceSummary({ rows, periodLabel }: { rows: Attendance[]; periodLabel: string }) {
  const counts = STATUS_ORDER.reduce(
    (acc, status) => ({ ...acc, [status]: rows.filter((r) => r.status === status).length }),
    {} as Record<AttendanceStatus, number>
  );
  // Опоздание считаем посещением; пропуск по уважительной причине не влияет на процент.
  const counted = rows.length - counts.excused;
  const percent = counted > 0 ? Math.round(((counts.present + counts.late) / counted) * 100) : null;

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Посещаемость</Text>
        <Text style={styles.period}>{periodLabel}</Text>
      </View>
      {rows.length === 0 ? (
        <Text style={styles.empty}>Отметок пока нет</Text>
      ) : (
        <>
          <Text style={styles.percent}>{percent !== null ? `${percent}%` : '—'}</Text>
          <View style={styles.bar}>
            {STATUS_ORDER.map((status) =>
              counts[status] > 0 ? (
                <View
                  key={status}
                  style={{ flex: counts[status], backgroundColor: STATUS_CONFIG[status].color }}
                />
              ) : null
            )}
          </View>
          <View style={styles.legend}>
            {STATUS_ORDER.map((status) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: STATUS_CONFIG[status].color }]} />
                <Text style={styles.legendText}>
                  {STATUS_CONFIG[status].label}: {counts[status]}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  period: { fontSize: 12, color: colors.textMuted },
  empty: { color: colors.textMuted, marginTop: spacing.sm },
  percent: { fontSize: 28, fontWeight: '800', color: colors.primary, marginTop: spacing.xs },
  bar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textMuted },
});
