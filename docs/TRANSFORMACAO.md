# Transformação E-Charge Map — relatório técnico

Data: 2026-11-23

## A. Diagnóstico inicial

- Mapa web era iframe OSM: sem marcadores reais, rota ou interação.
- Tela inicial dividia mapa (~62%) + lista; pouco “map-first”.
- Sem tema claro/escuro centralizado.
- Sem modelo de veículo/bateria nem planejador energético.
- Rotas OSRM sem alternativas.
- Busca só filtrava postos locais (sem geocoding).
- Sem Supabase anon key o app quebrava ao listar postos.

## B. Transformações visuais

- Design tokens (`src/theme/tokens.ts`) + `ThemeProvider` (system/light/dark).
- Mapa cliente em tela cheia com busca flutuante, filtros, badge de bateria, FAB de tema, recenter e bottom sheet / painel desktop.
- Cores de navegação em azul; energia/recarga em verde/laranja.

## C. Transformações funcionais

- Fallback de postos demo quando Supabase falha/não configurado.
- Leaflet interativo no web (tiles claros/escuros, pins, polylines, clique).
- Alternativas OSRM reais (`alternatives=true`).
- Estimativa energética determinística + planejador de paradas.
- Busca Nominatim com debounce/abort + coordenadas.
- Navegação com recálculo por desvio (~120 m) e ETA de bateria.
- Perfil: veículo manual, bateria manual, tema.

## D. Arquitetura

Novos módulos: `ThemeContext`, `VehicleContext`, `energy.ts`, `geocode.ts`, `demoStations.ts`, componentes `BatteryBadge`, `FloatingSearchBar`, `MapCanvas.web` reescrito.

Stack preservada: Expo 58, Expo Router, Supabase, OSRM, react-native-maps (nativo).

## E. Validação

- `npx tsc --noEmit` — OK (2026-11-23).
- Smoke test `energy.ts`: bateria 25% / 80 km → precisa recarga; planejador retornou 1 parada viável.
- Dev server: `npx expo start --web` em `http://localhost:8081`.
- UI map-first verificada no browser (pins Leaflet + lista + tema).

## F. Pendências reais

- `EXPO_PUBLIC_SUPABASE_ANON_KEY` ausente → auth demo e dados remotos bloqueados (fallback local ativo).
- Disponibilidade “tempo real” de conectores só via DB; sem inventar status.
- Curvas de carga reais não disponíveis → aproximação 70% da potência nominal.
- Trânsito/pedágio dependem de provedor pago (não adicionado).
- Agrupamento denso de markers (clustering) ainda não implementado.

## G. Próximos passos

1. Configurar anon key Supabase e validar login demo.
2. Clustering de markers + filtros persistentes.
3. Waypoints intermediários na rota OSRM.
4. Testes unitários de `energy.ts` / `routing.ts`.
5. Direções turn-by-turn com voz (opcional).

## H. Atualização Uber UI + funcional (2026-11-23)

- Identidade preto/branco estilo Uber + Plus Jakarta Sans + Ionicons (sem emojis).
- Home “Para onde?” com sheet, filtros e Ir agora.
- `resolveOpsOrigin`: se GPS longe de SP no modo demo, origem/rotas usam hub SP (app utilizável).
- Navegação demo anima ao longo da polyline OSRM quando GPS real está fora do corredor.
