# Camada de mapas / navegação

## Perspectivas

| ID | Uso | Pitch | Zoom |
|----|-----|-------|------|
| `top` | Vista de cima (planejamento / overview) | 0° | ~15 |
| `nav3d` | Navegação em perspectiva | ~58° | ~17 |

Definidas em `src/maps/types.ts` (`PERSPECTIVE_PRESETS`).

## Provedores

| Ambiente | Atual | 3D real |
|----------|-------|---------|
| iOS/Android | `react-native-maps` (Apple / Google se `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) | Sim (pitch/heading nativos) |
| Web | Leaflet + aproximação CSS 3D | Trocar para Mapbox GL / Google Maps JS com token |

Variáveis:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_MAPBOX_TOKEN=
```

`MapCanvasHandle.setPerspective` / `recenter` são o contrato estável. Novos provedores implementam a mesma API sem mudar `navigation/[id].tsx`.

## GPS

`useDeviceLocation` usa `expo-location` no dispositivo (e no browser, com permissão do usuário). A navegação só calcula rota OSRM depois de `hasFix === true`.
