# E-Charge Map

App de mobilidade elétrica (React Native + Expo + Supabase) com:

- **Mobile cliente**: mapa, busca/comparação, detalhes, reserva, rota, navegação 2.5D, sessão de carga, fatura e Pix
- **Web/Admin**: dashboard, postos, usuários, reservas, sessões, pagamentos e aprovações
- **Owner portal**: cadastro de postos, conectores, tarifas e faturamento

## Stack

- Expo SDK 58 + Expo Router
- TypeScript
- Supabase (Auth + Postgres + RLS)
- react-native-maps (nativo) + fallback visual no web

## Setup

```bash
cd Desktop/e-charge-map
npm install
npx expo start
```

- `w` → Web (bom para Admin + mapa OSM/Google/Mapbox)
- Expo Go → Mobile (mapa nativo + pitch 2.5D)

### Variáveis `.env`

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# Mapa (opcional — sem chave usa OpenStreetMap no web)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_MAPBOX_TOKEN=

# Pix
EXPO_PUBLIC_PIX_KEY=pagamentos@echargemap.app
EXPO_PUBLIC_MERCADOPAGO_ACCESS_TOKEN=
EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
```

### Integrações desta versão
- **Mapa**: `react-native-maps` (nativo, camera pitch 2.5D) + embed Google/Mapbox/OSM (web)
- **Pagamento**: BR Code Pix EMV + QR real; Mercado Pago se token estiver no `.env`
- **Animações**: Reanimated (splash, welcome, charging ring, sheets)

## Logins demo

Na tela de login use os botões **Cliente / Dono / Admin** (cria/entra automaticamente):

| Perfil | Email | Senha |
|--------|-------|-------|
| Cliente | `cliente@echarge.demo` | `Echarge@123` |
| Dono | `dono@echarge.demo` | `Echarge@123` |
| Admin | `admin@echarge.demo` | `Echarge@123` |

## Supabase

Projeto: `e-charge-map` (`itdrinmdniuhakfxqihk`, região `sa-east-1`)

Já provisionado:

- Schema completo (profiles, stations, connectors, favorites, reservations, charging_sessions, payments)
- RLS por perfil
- Seed com 5 postos em São Paulo + conectores

## Fluxo do cliente

Welcome → Login/Register → Map → Search → Station → Reserve → Route → Navigation → Arrival → Session → Bill → Payment

## Observações de produção

- Pagamento atual é **demo** (Pix simulado). Integrar Stripe/Mercado Pago tokenizado.
- Navegação 2.5D é preview visual; integrar Directions SDK (Google/Mapbox).
- Confirmação de e-mail pode estar ativa no Auth — os demos confirmam usuário via fluxo de signup/signin.
