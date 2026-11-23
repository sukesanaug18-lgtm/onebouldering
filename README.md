# ONE Bouldering

THE NORTH FACE CUP / Division Tryout / ONE bouldering Ranking をひとつにまとめた公式サイト。
設計とルールは [CLAUDE.md](./CLAUDE.md) を参照。

## 公開（Firebase App Hosting）

手順は [docs/deploy.md](docs/deploy.md)。GitHub の `main` に push すると自動でサイトが更新される。

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
| `npm run emulators` | Firebase Emulator（Auth / Firestore / Storage。UI は http://127.0.0.1:4000）。Storage は事務局がアップロードするポスター画像用 |
| `npm run seed:old` | 旧アプリの形の架空データ（平文の暗証番号・HTML の NEWS・GA4 設定など）を Emulator の `demo-old-ranking` に入れる。コピー用スクリプトを試すため |
| `npm run copy-data -- --source <旧> --target <新> [--apply]` | 今のアプリのデータを新プロジェクトにコピーする（旧側は読むだけ・何も消さない）。`--apply` なしは件数を見るだけ。Emulator では `--emulator --source demo-old-ranking --target demo-onebouldering`。本番は事務局の許可を取ってから |
| `npm run seed` | Emulator にデモデータ（架空の選手・30ジム・スコア）を入れて ranking_cache を作る。TNFC 予選前のデモ大会（ROUND2・36人）と、開催済みでリザルト待ちのデモ大会（ROUND1・34人、ゼッケン採番済み）も入る。U カテゴリーの選手には生年月日が入る（7人に1人はなし）ので、年度更新画面 `/admin/rollover` の確認に使える。NEWS のサンプル記事4件（公開2件・予約1件・下書き1件）も入る。Emulator 起動中に実行。demo-* 以外のプロジェクトでは動かない。ログイン確認用のデモ選手：ライセンスNo. `10000` / 暗証番号 `0000`（Emulator 専用）。店舗スタッフ画面 `/gym-admin` は、どの会場もパスワード `gym-demo-2027`。各ジムのデモ用QRキーは `demo-<会場ID>`（例：`/checkin?venue=bolz&k=demo-bolz` を開くとそのジムで確認済みになる）。座標は地域の中心付近の架空の値。事務局画面 `/admin` は `office@example.test` / `office-demo-2027`（権限なしの確認用に `staff@example.test` も同じパスワード）（Emulator 専用） |
