import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ManeuverIcon } from './ManeuverIcon';
import { formatManeuverDistance, maneuverKind } from '../../services/navigationEngine';
import type { RouteStep } from '../../services/routing';
import { fontFamily } from '../../theme/fonts';
import { elevation, radius } from '../../theme/tokens';

export type NavUpcomingStep = {
  step: RouteStep;
  /** Distância até esta manobra a partir da posição atual (m), se conhecida */
  distanceM?: number;
};

function shortManeuverLabel(step: RouteStep | null): string {
  if (!step) return 'Siga a rota';
  const kind = maneuverKind(step);
  switch (kind) {
    case 'left':
      return 'À esquerda';
    case 'right':
      return 'À direita';
    case 'u-turn':
      return 'Retorno';
    case 'roundabout':
      return 'Rotatória';
    case 'arrive':
      return 'Destino';
    case 'depart':
      return 'Partida';
    default: {
      const raw = step.instruction?.split(',')[0] || 'Em frente';
      return raw.length > 18 ? `${raw.slice(0, 16)}…` : raw;
    }
  }
}

function fullManeuverLabel(step: RouteStep | null): string {
  if (!step) return 'Siga a rota';
  const kind = maneuverKind(step);
  switch (kind) {
    case 'left':
      return 'Vire à esquerda';
    case 'right':
      return 'Vire à direita';
    case 'u-turn':
      return 'Faça o retorno';
    case 'roundabout':
      return 'Entre na rotatória';
    case 'arrive':
      return 'Chegue ao destino';
    case 'depart':
      return 'Partida';
    default:
      return step.instruction?.split(',')[0] || 'Siga em frente';
  }
}

export function NavInstructionBanner({
  step,
  distanceM,
  streetFallback,
  upcoming = [],
}: {
  step: RouteStep | null;
  distanceM: number;
  streetFallback?: string;
  /** Próximos passos em sequência (já filtrados) */
  upcoming?: NavUpcomingStep[];
}) {
  const title = useMemo(() => fullManeuverLabel(step), [step]);
  const street = step?.name || streetFallback || 'Continuar na via';

  const sequence = useMemo(() => {
    const items: NavUpcomingStep[] = [];
    if (step) items.push({ step, distanceM });
    for (const u of upcoming) {
      if (items.length >= 4) break;
      items.push(u);
    }
    return items;
  }, [step, distanceM, upcoming]);

  return (
    <View style={styles.root}>
      <View style={[styles.card, elevation.float]}>
        <View style={styles.mainRow}>
          <View style={styles.iconBox}>
            <ManeuverIcon step={step} size={40} color="#fff" />
          </View>
          <View style={styles.copy}>
            <Text style={styles.dist}>{formatManeuverDistance(distanceM)}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.road} numberOfLines={1}>
              {street}
            </Text>
          </View>
        </View>

        {sequence.length > 1 ? (
          <View style={styles.seqBlock}>
            <View style={styles.seqDivider} />
            <Text style={styles.seqTitle}>Próximos passos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.seqScroll}
            >
              {sequence.map((item, i) => {
                const active = i === 0;
                const label = shortManeuverLabel(item.step);
                const road = item.step.name?.trim();
                return (
                  <React.Fragment key={`${item.step.location.latitude}-${i}`}>
                    {i > 0 ? (
                      <View style={styles.seqArrow}>
                        <Text style={styles.seqArrowText}>→</Text>
                      </View>
                    ) : null}
                    <View style={[styles.seqChip, active && styles.seqChipActive]}>
                      <View style={[styles.seqIcon, active && styles.seqIconActive]}>
                        <ManeuverIcon step={item.step} size={active ? 16 : 14} color="#fff" />
                      </View>
                      <View style={styles.seqCopy}>
                        <Text style={[styles.seqLabel, active && styles.seqLabelActive]} numberOfLines={1}>
                          {label}
                        </Text>
                        <Text style={styles.seqMeta} numberOfLines={1}>
                          {typeof item.distanceM === 'number'
                            ? formatManeuverDistance(item.distanceM)
                            : road || '—'}
                        </Text>
                      </View>
                      {active ? <View style={styles.nowDot} /> : null}
                    </View>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  card: {
    backgroundColor: '#0B1220',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 68,
    height: 76,
    borderRadius: 18,
    backgroundColor: '#276EF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  dist: {
    color: '#06C167',
    fontFamily: fontFamily.extrabold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    marginTop: 2,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  road: {
    color: 'rgba(255,255,255,0.64)',
    fontFamily: fontFamily.medium,
    fontSize: 14,
    marginTop: 3,
  },
  seqBlock: {
    marginTop: 12,
  },
  seqDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  seqTitle: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  seqScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  seqArrow: {
    paddingHorizontal: 4,
  },
  seqArrowText: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  seqChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: 148,
  },
  seqChipActive: {
    backgroundColor: 'rgba(39,110,241,0.22)',
    borderColor: 'rgba(39,110,241,0.55)',
  },
  seqIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqIconActive: {
    backgroundColor: '#276EF1',
  },
  seqCopy: {
    flexShrink: 1,
    minWidth: 0,
  },
  seqLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  seqLabelActive: {
    color: '#fff',
    fontFamily: fontFamily.bold,
  },
  seqMeta: {
    color: 'rgba(255,255,255,0.42)',
    fontFamily: fontFamily.medium,
    fontSize: 10,
    marginTop: 1,
  },
  nowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#06C167',
    marginLeft: 2,
  },
});
