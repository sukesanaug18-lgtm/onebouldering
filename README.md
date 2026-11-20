# ONE Bouldering

THE NORTH FACE CUP / Division Tryout / ONE bouldering Ranking をひとつにまとめた公式サイト。
設計とルールは [CLAUDE.md](./CLAUDE.md) を参照。

## はじめかた

```bash
npm install
cp .env.local.example .env.local   # 値を埋める
npm run dev                        # http://localhost:3000
```

## よく使うコマンド

| コマンド | 内容 |
| :--- | :--- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run lint` / `npm run typecheck` | ESLint / 型チェック |
| `npm run format` | Prettier で整形 |
| `npm test` | 単体テスト（Vitest） |
| `npm run test:e2e` | 画面の通しテスト（Playwright。初回は `npx playwright install chromium`） |
| `npm run emulators` | Firebase Emulator（Auth / Firestore。UI は http://127.0.0.1:4000） |
