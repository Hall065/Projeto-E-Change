import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { maneuverKind } from '../../services/navigationEngine';
import type { RouteStep } from '../../services/routing';

type Kind = ReturnType<typeof maneuverKind>;

/**
 * Setas longas estilo apps de navegação (Waze/Google/Apple Maps).
 * ViewBox 48×64 — proporção alta (haste + ponta).
 */
function ArrowSvg({ kind, color, size }: { kind: Kind; color: string; size: number }) {
  const w = size;
  const h = size * 1.35;

  if (kind === 'arrive') {
    return (
      <Svg width={w} height={h} viewBox="0 0 48 64" fill="none">
        <Path
          d="M24 6C16.3 6 10 12.3 10 20c0 10.5 14 28 14 28s14-17.5 14-28c0-7.7-6.3-14-14-14z"
          fill={color}
        />
        <Circle cx="24" cy="20" r="5.5" fill="#0B1220" />
        <Path d="M24 48v12" stroke={color} strokeWidth="5" strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'roundabout') {
    return (
      <Svg width={w} height={h} viewBox="0 0 48 64" fill="none">
        <Circle cx="24" cy="30" r="14" stroke={color} strokeWidth="5" />
        <Path
          d="M24 8v10M24 8l-5 6M24 8l5 6"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M38 30h6M44 30l-5-5M44 30l-5 5"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (kind === 'u-turn') {
    return (
      <Svg width={w} height={h} viewBox="0 0 48 64" fill="none">
        {/* Haste longa subindo + loop + ponta para baixo */}
        <Path
          d="M14 58V26c0-10 7.5-16 16-16s16 6 16 16v8"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M46 34l-8-10M46 34l-10 2"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (kind === 'left') {
    return (
      <Svg width={w} height={h} viewBox="0 0 48 64" fill="none">
        {/* Haste longa de baixo → curva à esquerda + ponta alongada */}
        <Path
          d="M30 58V28c0-6-4-10-10-10H8"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M18 8L6 18l12 10"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  }

  if (kind === 'right') {
    return (
      <Svg width={w} height={h} viewBox="0 0 48 64" fill="none">
        <Path
          d="M18 58V28c0-6 4-10 10-10h12"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M30 8l12 10-12 10"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  }

  // straight | depart — seta vertical bem longa
  return (
    <Svg width={w} height={h} viewBox="0 0 48 64" fill="none">
      <Path
        d="M24 58V18"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <Path
        d="M10 28L24 8l14 20"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function ManeuverIcon({
  step,
  size = 36,
  color = '#fff',
}: {
  step: RouteStep | null;
  size?: number;
  color?: string;
}) {
  const kind = maneuverKind(step);
  const h = size * 1.35;
  return (
    <View style={{ width: size + 4, height: h + 4, alignItems: 'center', justifyContent: 'center' }}>
      <ArrowSvg kind={kind} color={color} size={size} />
    </View>
  );
}
