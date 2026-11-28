# CLAUDE.md — ONE Bouldering 統合サイト 設計書（v1.0 / 承認済み）

@AGENTS.md

> ステータス: **承認済み（2026-11-20）**。本ファイルが実装ルールの正本。正本はプロジェクトルート（`C:\Users\murakamieisuke\dev\onebouldering\CLAUDE.md`）、控えは `G:\マイドライブ\03_artifacts\onebouldering_portal\CLAUDE.md`。
> 履歴: v0.2 で「既存アプリの作り直し」「ドメインは仮」「質感・動きのルール」を反映 → v1.0 で承認・初期セットアップ完了。

## 0. いまの状態（セットアップ時点）
- Next.js **16.4.6** / React 19.3 / Tailwind CSS 4.3（Turbopack の CSS ローダー方式。`postcss.config` はない）/ `cacheComponents: true`。
- Firebase の本番プロジェクトは **`one-bouldering`**（`.firebaserc` の `default` / `production`）。既存アプリの `one-bouldering-ranking` とは別のプロジェクトで、データは**移行せずコピー**する（下の「データはコピーする」）。
- ローカル開発は仮プロジェクト ID `demo-onebouldering` と Emulator を使う（`npm run emulators`。本物のデータには触れない）。
- Java は **Temurin JDK 21** を導入済み。Windows では JDK の内部通信が `%TEMP%` で失敗するため、`scripts/emulators.mjs` が `-Djdk.net.unixdomain.tmpdir` を自動で設定する。
- 英字見出しは **Cabinet Grotesk**（Fontshare、ITF Free Font License。Medium / Bold / Extrabold の woff2 を `src/app/fonts/` に配置）。
- 加盟ジムのロゴ（`public/gym-logos/`）はファイル名が日本語のまま。会場ページを作るときに英数字の名前へ変える。

---

## 1. 目的・ゴール

| 項目 | 内容 |
| :--- | :--- |
| サイト名 | ONE Bouldering |
| 目的 | **THE NORTH FACE CUP（TNFC）／ Division Tryout ／ ONE bouldering Ranking** の3イベントを、1つのサイトでわかりやすく確認・参加できるようにする |
| 置き換える対象 | ・Ranking: `ranking.onebouldering.jp`（既存アプリ `onebouldering-ranking-2027`）<br>・TNFC: `www.onebouldering.jp/competition-login/`（WordPress）<br>・Tryout: Google Apps Script のWebアプリ |
| ゴール | **どのイベントにも、このサイトから直感的に迷わず参加できること** |
| 方針 | 既存アプリ `onebouldering-ranking-2027` を**作り直す**。機能と見た目の良いところは引き継ぎ、構造・安全性・デザインを整理し直す |
| 利用者 | ①選手 ②保護者（Uカテゴリー）③加盟ジムのスタッフ ④運営事務局 |

### 成功の基準
1. トップから各イベントの参加ボタンまで **2タップ以内**。
2. 初めての人が「最初に何をすればいいか」を **30秒で判断** できる（会員登録 → Tryout → Ranking → TNFC の順路）。
3. 3イベントの日程・会場・結果・自分の記録を、1つのサイトで見られる。
4. 業務フロー図（`03_artifacts/onebouldering_2027_workflows/`）の To-Be（図B-1〜B-8）の機能を、漏れなく新サイトで動かせる。

---

## 2. 作り直しで直すこと（既存アプリの調査結果）

既存アプリは約3万行。機能はそろっているが、次の点を作り直しで直す。

| # | 現状 | 作り直し後 |
| :--- | :--- | :--- |
| 1 | Firestore のセキュリティルールで多くのコレクションが**誰でも書き込める**（`allow write: if true`） | ブラウザからの書き込みは**すべて禁止**。書き込みはサーバー側（Admin SDK）だけで行う |
| 2 | PIN（暗証番号）を**そのまま保存**している | PIN は**ハッシュ化**して保存。ログイン試行回数を制限 |
| 3 | 事務局・店舗の認証が簡易的 | 事務局は Firebase Authentication ＋ 権限（custom claims）、店舗は会場ごとのアカウント |
| 4 | 管理画面が1ファイル5,500行など、巨大なファイルが多い | 機能ごとにフォルダを分け、**1ファイル300行程度まで**を目安にする |
| 5 | 業務ロジックがブラウザ側（`apiClient.ts`）とCloud Functions側に分かれて重複 | 判定・計算ロジックは `src/domain/` に1つだけ置き、サーバーと Functions で共有する |
| 6 | 静的書き出し（Cloudflare Pages）なのでサーバー処理を持てない | サーバー処理ができる構成に変える（4章） |

**データはコピーする（移行しない）**。今のデータ（`one-bouldering-ranking` の Firestore・Storage・スプレッドシート）はそのまま使い続けるので、一切書き換えない・消さない。コピー用スクリプトは旧プロジェクトを**読むだけ**で、新プロジェクト `one-bouldering` に書き込む。コピーは何度でもやり直せる形にし（同じ id で上書き）、本番切り替えの直前にもう一度コピーして最新にする。新サイトで変えた内容は旧データには戻らない。形を変える必要がある項目（旧 NEWS の HTML 本文、スプレッドシートのロゴ画像など）は、コピーするときに新しい形に直して新プロジェクト側にだけ書く。Firestore のコレクション名・項目名は原則そのまま使う（`users`, `venues`, `participant_data`, `tryout_logs`, `competition_results`, `ranking_cache`, `point_master`, `official_competitions`, `tournament_results`, `tnfc_rounds`, `tnfc_entries`, `tnfc_results`, `tnfc_cancellations`, `tnfc_sync_logs`, `news_articles`, `site_settings`, `notifications`）。名前を変える場合は、コピー用スクリプトの中で変換する。

**コピー用スクリプト**：`scripts/copy-data.ts`（`npm run copy-data -- --source one-bouldering-ranking --target one-bouldering`）。何も付けなければお試し実行（件数を表示するだけ）で、`--apply` を付けたときだけ書き込む。コピー元は読むだけ（get のみ）。コピー先は同じ id で上書きし、何も消さない（新サイトにしかない文書は残る）。コピー先に `one-bouldering-ranking` を指定すると止まる。変換は `src/domain/data-copy.ts`：平文の暗証番号（`pin` など）は `pinHash`、会場の平文パスワードは `gymPasswordHash` にして平文の項目は書かない。`site_settings` の GA4 設定（秘密鍵入り）はコピーしない。`site_settings/news_*` の旧 NEWS は HTML を記号の本文に直して `news_articles` に書く（id は `news_20261017_launch` → `20261017-launch`、予約公開は「公開＋未来の日付」、不明なカテゴリーは「お知らせ」）。文書の参照（DocumentReference）はコピー先の同じパスに付け替える。ranking_cache はコピーせず、コピー後のデータから作り直す。記録は `site_settings/data_copy`。サイトのキャッシュ（NEWS・ランキングは最大1時間）はスクリプトでは消えないので、本番ではコピー → デプロイ（または切り替え）の順にする。Storage（旧 NEWS の画像・ロゴ）と Firebase Auth のアカウントは、まだコピーしない（旧 NEWS の画像 URL は `oldThumbnailUrl` に残す）。Emulator で試すとき：`npm run seed` → `npm run seed:old`（旧アプリの形の架空データを demo-old-ranking に入れる）→ `npm run copy-data -- --emulator --source demo-old-ranking --target demo-onebouldering --apply`。

---

## 3. 技術スタック

| 分類 | 採用 | メモ |
| :--- | :--- | :--- |
| フレームワーク | **Next.js 16（App Router）** | 既存と同じ系統。`node_modules/next/dist/docs/` の最新仕様を確認してから書く |
| 言語 | **TypeScript**（`strict: true`） | |
| UI | **React 19** | Server Components を基本とし、操作が必要な部分だけ Client Component |
| スタイル | **Tailwind CSS v4**（`@theme` でトークン定義） | |
| 動き | **Motion（旧 Framer Motion）**: `motion` パッケージ、`import { motion } from "motion/react"` | Framer Motion は名前が Motion に変わった。中身は同じ |
| フォント | `next/font/google`: **Noto Sans JP**、`next/font/local`: **Cabinet Grotesk** | Cabinet Grotesk は Fontshare 配布（商用利用可）。ファイルを `src/app/fonts/` に置く |
| 日本語改行 | **BudouX** ＋ CSS `word-break: auto-phrase` / `text-wrap: balance` | |
| アイコン | **lucide-react** | 絵文字は使わない |
| フォーム | **react-hook-form** ＋ **zod**（入力チェックはサーバーでも同じ zod で再チェック） | |
| データベース | **Cloud Firestore**（既存プロジェクトのデータをコピーして使う。既存側は読むだけ） | |
| サーバー処理 | Next.js の **Server Actions / Route Handlers** ＋ **firebase-admin** | 書き込みはここだけ |
| バックグラウンド処理 | **Cloud Functions v2**（`onUserWrite` などのトリガー、毎日03:00のスプレッドシート自動バックアップ） | 既存の Functions を整理して引き継ぐ |
| 認証 | 選手: LICENCE NO. ＋ 4桁PIN（ハッシュ化、セッションは httpOnly Cookie）<br>事務局: Firebase Authentication（メール＋権限）<br>店舗: 会場ID＋パスワード（ハッシュ化） | |
| ホスティング | **Firebase App Hosting** | Next.js のサーバー処理に対応。Firestore と同じプロジェクトで運用できる。公開手順は `docs/deploy.md`（バックエンド名 `onebouldering`、GitHub `main` に push で自動更新）。ビルド中は Firestore を読まない：キャッシュ付きの読み込み（`getVenues`・`getRanking`・`getPublishedNews`・`getEventPoster` など）の入口で `await connection()` し、呼ぶ側は `<Suspense>` で包む（データが空のプロジェクトでもビルドが通り、古いデータを焼き込まない）。プロジェクト ID・Storage・Web API キーは App Hosting が渡す `FIREBASE_CONFIG` / `FIREBASE_WEBAPP_CONFIG` からも読む（`src/server/firebase-config.ts`）。**`FIREBASE_WEBAPP_CONFIG` はビルド中にしか渡されない**ので、Web API キーは `next.config.ts` の `env`（`FIREBASE_WEBAPP_API_KEY`）でビルド時に取り込む（これがないと事務局ログインとパスワードメールが本番で動かない） |
| ドメイン | **仮**: App Hosting が発行する `*.hosted.app` のURL | 本番ドメインが決まったら、設定を変えるだけで切り替えられるようにする（URLは環境変数 `NEXT_PUBLIC_SITE_URL` で管理） |
| 解析 | GA4 ＋ Looker Studio（既存と同じ） | |
| テスト | **Vitest**（ロジック）、**Playwright**（主要な流れ: 登録→Tryout→Ranking提出→店舗承認） | |
| 品質 | ESLint、Prettier | |
| 開発環境 | **Firebase Emulator Suite**（ローカルで Firestore / Auth / Functions を再現） | 本番データを開発中に壊さない |

### 環境の分け方
| 環境 | Firebase プロジェクト | URL |
| :--- | :--- | :--- |
| ローカル | Emulator | `localhost:3000` |
| ステージング | 新規の開発用プロジェクト（例: `onebouldering-staging`） | 仮の `*.hosted.app` |
| 本番 | 既存の本番プロジェクト | 本番ドメイン（未定） |

### 開発フォルダ
`C:\Users\murakamieisuke\dev\onebouldering`（Googleドライブの外）。バックアップは GitHub の非公開リポジトリ。本設計書の控えは `G:\マイドライブ\03_artifacts\onebouldering_portal\` に置く。

---

## 4. ディレクトリ構成

画面の種類ごとに **Route Group**（`(public)` など、URLに出ないフォルダ）で分け、機能ごとの部品とロジックは `src/features/` にまとめる。

```text
onebouldering/
├── CLAUDE.md                       # 本設計書
├── AGENTS.md                       # Next.js 公式のAI向け注意書き
├── README.md
├── package.json
├── next.config.ts
├── apphosting.yaml                 # Firebase App Hosting 設定
├── firebase.json / .firebaserc
├── firestore.rules                 # ブラウザからの書き込みは全面禁止
├── firestore.indexes.json
├── .env.local.example              # キー名のみ（値は書かない）
├── public/
│   ├── images/                     # 写真（WebP/AVIF）
│   ├── logos/                      # ONE Bouldering / TNF / スポンサー（SVG）
│   └── gym-logos/                  # 加盟ジムのロゴ
├── functions/                      # Cloud Functions v2（トリガー・定期処理のみ）
│   └── src/
│       ├── triggers/               # onUserWrite, onParticipantDataWrite, onCompResultWrite
│       └── scheduled/              # sheetsBackup（毎日03:00）
├── scripts/                        # データのコピー（旧プロジェクトは読むだけ）・PINハッシュ化などの処理
├── tests/
│   ├── unit/                       # src/domain のテスト
│   └── e2e/                        # Playwright
└── src/
    ├── app/
    │   ├── layout.tsx              # フォント・共通の土台
    │   ├── globals.css             # デザイントークン
    │   ├── fonts/                  # Cabinet Grotesk
    │   ├── (public)/               # 誰でも見られるページ
    │   │   ├── layout.tsx          # ヘッダー・フッター・スマホ下部タブ
    │   │   ├── page.tsx            # トップ（3イベントのハブ）
    │   │   ├── join/               # はじめての方へ
    │   │   ├── tnfc/               # THE NORTH FACE CUP（予選一覧・要項・本戦）
    │   │   ├── tryout/about/       # Division Tryout の説明
    │   │   ├── ranking/            # ランキング（全国・地域・Division別）
    │   │   ├── schedule/           # 3イベント合同の日程
    │   │   ├── venues/[venueId]/   # 会場詳細
    │   │   ├── results/            # リザルト
    │   │   ├── news/[slug]/
    │   │   ├── rules/ guide/ faq/
    │   │   ├── prizes/[sponsor]/   # 協賛景品
    │   │   └── sponsors/           # 協賛企業（イベント別の一覧）
    │   ├── (auth)/                 # login / register / reset-pin
    │   ├── (athlete)/              # ログインが必要な選手向け
    │   │   ├── entry/              # 統一QRの入口（会場ごとに自動で振り分け）
    │   │   ├── tryout/             # Tryout 受験
    │   │   ├── score/              # Ranking 40課題の提出
    │   │   ├── tnfc/apply/         # TNFC 予選エントリー
    │   │   └── mypage/
    │   ├── gym-admin/              # 加盟ジムのスタッフ用（承認・取消・Tryout履歴・集計）
    │   ├── admin/                  # 運営事務局用
    │   │   ├── tnfc/               # 予選前 / 予選後 / 本戦前後 / キャンセル・会場変更
    │   │   ├── annual-rollover/    # 年度末リセット・U進級
    │   │   ├── members/  venues/  news/  analytics/  tools/pop-a4/
    │   └── api/                    # 外部から呼ばれるもの（CSV出力・GA4集計など）だけ
    ├── features/                   # 機能ごと：components / actions（Server Actions）/ queries
    │   ├── auth/  ranking/  tryout/  tnfc/  score/
    │   ├── gym/  news/  venues/  annual/  member/
    ├── domain/                     # 純粋な判定・計算ロジック（画面にもDBにも依存しない）
    │   ├── tryout.ts               # Pre-Check推奨、昇格・残留・降格の判定
    │   ├── ranking.ts              # ジムスコア、総合・地域集計、上位10%ボーダー
    │   ├── points.ts               # 公認大会pt（順位pt × 人数倍率）
    │   ├── tnfc.ts                 # ゼッケン採番、グループ編成、Division X 変換、本戦判定
    │   ├── annual.ts               # 年度末リセット・U進級
    │   └── division.ts
    ├── server/                     # サーバー専用（firebase-admin, セッション, 権限チェック）
    ├── lib/                        # 両側で使う小物（日付表記、URL、BudouX など）
    ├── components/
    │   ├── ui/                     # Button, Card, Badge, Tabs, Dialog, Input など
    │   ├── layout/                 # Header, Footer, MobileTabBar, Container
    │   └── motion/                 # FadeIn など動きの共通部品
    ├── content/                    # 文章で固定の情報（イベント説明、FAQ、外部リンク）
    └── types/
```

**ルール**
- 画面（`app/`）には見た目と組み立てだけを書く。判定・計算は `domain/`、DBの読み書きは `features/*/actions` と `queries` に書く。
- `domain/` は Functions からも使う（Functions は esbuild で1ファイルにまとめてデプロイ）。

### 既存ページとの対応
| 既存 | 新 | 備考 |
| :--- | :--- | :--- |
| `/` | `/` | 3イベントのハブに作り直し |
| `/ranking` | `/ranking` | |
| `/tnfc`, `/competition` | `/tnfc`（閲覧）＋ `/tnfc/apply`（申込） | 閲覧と申込を分ける |
| `/tryout` | `/tryout/about`（説明）＋ `/tryout`（受験） | |
| `/entry` `/score` `/mypage` | 同じ | |
| `/login` `/register` `/reset-pin` | 同じ | |
| `/gym-admin`, `/gym-owner` | `/gym-admin` | 1つに統合 |
| `/admin`, `/admin/dashboard` | `/admin/*` | タブごとにページを分ける |
| `/news` `/rules` `/guide` `/prizes/*` | 同じ | |
| `/official-sponsors`, `/sponsor` | `/sponsors` | 1つに統合 |
| `/pop-a4` | `/admin/tools/pop-a4` | 事務局向けの道具なので管理側へ |

---

## 5. 主要な画面

### トップページ（上から順に）
1. **ヒーロー**: キャッチ1行＋「はじめての方へ」「日程を見る」。背景は大会写真＋ダークグラス。
2. **3イベントのカード**: TNFC／Tryout／Ranking を同じ形で並べる（スマホは縦積み）。各カード「何をするイベントか（1行）」「開催期間」「参加する」。
3. **参加の順路**: ① 会員登録 → ② Tryout でクラス決定 → ③ Ranking に参加 → ④ TNFC 予選・本戦。1枚の図で示す。
4. **いま開催中／もうすぐ開催**（3イベント合同）。今日の TNFC 予選＝開催中、60日以内の予選（受付中／まもなく）、期間中の Tryout・Ranking はまとめて「○ジムで開催中」、30日以内に始まるジムは「まもなく」。最大6件（src/domain/home.ts）。
5. **ランキング上位**（全国トップ3）。ranking_cache から男女それぞれ一番上の Division（人がいるもの）の上位3人。ジム名はその選手の最高スコアのジム。
6. **NEWS 最新3件**。
7. **参加ジムのロゴ**。協賛企業は TNFC と Ranking で違うので、トップには並べず各イベントページの「協賛」に出す（src/content/sponsors.ts）。

### 3イベントのページ（同じ型）
概要 → 対象・カテゴリー → 参加の流れ（ステップ図） → 日程・会場 → ルール要点 → FAQ → 参加ボタン（スマホでは画面下に固定）

### ログイン後の選手画面
統一QR `/entry?venue=…` から、ログイン状態・Division・会場の開催内容を見て Tryout か Ranking へ自動で案内する（図B-2の流れをそのまま実装）。

**ジムにいることの確認（必須）**：Tryout と Ranking の入力・送信は、その日そのジムで確認が取れた選手だけができる。確認方法は2つ。①ジム専用QR `/checkin?venue=…&k=<秘密キー>`（キーは事務局の会場画面で発行・作り直し。作り直すと古いQRは無効）。②位置情報（ジムの座標から300m以内、GPS精度は最大200mまで加算。座標は事務局の会場画面で入力。選手の位置は保存しない）。確認結果は署名付き Cookie `ob_venue` に入り、日本時間の夜12時に切れる。画面だけでなく送信処理（submitScore / submitTryout）でも確認し、記録に `checkIn: "qr" | "location"` を残す。

### 店舗・事務局画面
図B-3（店舗）、図B-4〜B-8（事務局）の機能をすべて実装する。見た目は公開ページと同じトークンを使い、情報の多い表は読みやすさを優先する。

**TNFC キャンセル・会場変更（図B-8 1.6.1〜1.6.2、図B-5 1.2.3）**：大会の「キャンセル・会場変更」タブで選手を選び、①キャンセル（区分＝コンビニ返金／キャンセル料あり／返金なし、金額、受付手段、メモ）→ エントリーを cancelled にし `tnfc_cancellations` に記録、②会場変更 → `${移動先roundId}_${userId}` に移してゼッケン・グループを外す（定員超過・要再採番・旧サイト3か所の修正を案内）。どちらも受付手段で送る返信文を出す。台帳は `/admin/tnfc/cancellations`（CSV あり）。

**NEWS**：`news_articles`（id は `YYYYMMDD-xxxxxx`）。事務局 `/admin/news` で作成・編集・削除（下書き／公開、公開日が未来なら予約公開、先頭固定、画像1枚＝サーバーで WebP 化して Storage `news/{id}.webp`、`/api/news-images/{id}?v=` で配信）。本文は HTML ではなく簡単な記号（`## 見出し`・`- 箇条書き`・`**太字**`・`[文字](URL)`・URL自動リンク）で書き、`src/domain/news.ts` が解析して React 要素で表示する（DB の HTML をページに入れない。リンクは https/http とサイト内パスのみ）。公開側 `/news`（カテゴリー絞り込み）・`/news/[slug]`・トップの最新3件。公開一覧は1時間キャッシュ＋保存時 updateTag("news")。旧サイトの HTML 記事はデータをコピーするときに新しい書き方へ変換する（旧データはそのまま）。

**分析**：`/admin/analytics`。今季の会員・Ranking 参加者・提出数・1人あたりジム数・Tryout 受験、月別の提出数と新規会員、課題ごとの完登率、提出の時間帯（日本時間）、会場別・Division 別（CSV あり `/api/admin/analytics?type=venues|divisions|problems`）。計算は `src/domain/analytics.ts`。閲覧数などのアクセス解析は GA4 の管理画面で見る（旧サイトのように GA4 の秘密鍵を Firestore に保存しない）。

**A4 POP**：`/admin/tools/pop-a4`。会場の Ranking 開催期間から地域別の開催スケジュール（A4 縦1枚＝1地域、ロゴ・期間・参加のポイント・公式サイトの QR）を作り、ブラウザで印刷／PDF 保存。ジム数に応じて行の大きさを変え、1地域およそ12ジムまで1枚に収まる。文言は `src/content/pop.ts`。ロゴは今は `src/content/gyms.ts` を名前で照合（データのコピーでロゴを新プロジェクトの Storage に複製したら会場データから読む）。

**年度更新（図B-7 1.5.1〜1.5.2）**：`/admin/rollover`。次シーズン（CURRENT_SEASON_ID+1）への切り替えで、Men‘s Division 4・5 と Women‘s Division 3・4 を UNDECIDED（divisionStatus undecided、Tryout を受け直し）、U カテゴリーは次シーズン末の4月1日時点の年齢で決め直し（16歳以上は UNDECIDED）。生年月日がない・おかしい U の人は変更せず「確認が必要」に出す。ロジックは `src/domain/rollover.ts`。プレビュー → 一括実行（実行前に当シーズンの ranking_cache を保存 → users 更新・本人通知・admin_logs）。実行を始めた時点（`rollover_${次シーズン}` の startedAt）で当シーズンの ranking_cache は凍結され、以後の承認などでも作り直さない（変更後の Division で最終ランキングが崩れるのを防ぐ。`src/server/ranking-cache.ts`）。年度更新はシーズンの提出・承認が終わってから行い、続けて CURRENT_SEASON_ID を次シーズンに切り替える。実行記録 `site_settings/rollover_${次シーズン}` があれば2回目は不可（途中で止まった場合だけ続きを実行できる）。本戦の昇格は先に反映する運用。

**編集できるページ**：`/rules` `/faq` `/prizes` `/sponsors` と `/schedule` のリード・注記は、事務局「ページ」（`/admin/pages`）で書き換える。保存すると `site_pages/{slug}`（lead・body、本文は NEWS と同じ書き方）に入り、公開ページにすぐ反映。保存がないあいだは `src/content/site-pages.ts` の初期の文章（今のサイト onebouldering.jp の大会ページ・FAQ をもとに作成）を表示し、「初期の文章に戻す」で保存分を消す。`/schedule` は TNFC 予選（`tnfc_rounds`）と会場の Tryout・Ranking 期間（`venues`）から自動で作り、`/results` は確定済みの予選・本戦のリザルト（順位・氏名・本戦出場権のみ）を出す。`/tnfc/apply` は新サイトのエントリーができるまで、今のサイトの TNFC エントリーページへ案内する。

**暗証番号の再設定**：`/reset-pin` はライセンスNo.・メールアドレス・**生年月日**がすべて登録内容と合うときだけ変更できる（ライセンスNo.はランキングで公開されているため）。生年月日は「2010-05-03」「2010/5/3」、旧データの Timestamp も読める。

**事務局メンバー**：`/admin/staff`。事務局 = Firebase Auth の custom claim `admin: true`。メールアドレスで追加（アカウントがなければパスワードなしで作成）→ パスワード設定メール（Auth の PASSWORD_RESET、日本語）を送信。再送・権限を外す（本人は外せない、refresh token 失効）も同じ画面。admin_logs に staff_add / staff_mail / staff_remove。本人が使う `/admin/login/password` は、登録の有無を明かさず、事務局アカウントにだけメールを送る（5回で15分ロック）。ロジックは `src/features/admin/staff.ts` と `actions.ts`。

**TNFC 本戦（図B-6 1.3〜1.4）**：`/admin/tnfc/finals`。予選（roundNumber < 90）の確定リザルトから本戦出場者を集め、同じ予選・カテゴリーの次点を表示。辞退は `cancelled_finals` にして台帳へ記録する。**辞退が出ても繰り上げ出場はない**（大会要項）。例外は出場権を持つ選手が BOULDER JAPAN CUP 出場で Division 1 に上がった場合だけで、そのときだけ次点を繰り上げる（チェックは既定オフ。繰り上げると `promotedToFinals` と通知）（予選リザルトを取り込み直しても繰り上げは残る）。本戦は1シーズン1つ（id `tnfc${season}_finals`、roundNumber 99）。「本戦エントリーを作る」で出場者のエントリーとゼッケン・グループを作る（出場者でなくなった人はキャンセル）。本戦リザルトは同じリザルト画面で取り込み（通過ラインなし。**本戦は Ranking ポイントに反映しない**：`competition_results` は書かず、以前の取り込み分は消す）、本戦ページで上位N位（既定3）の Division を1つ上げる（Division 1 と U はそのまま、通知・今季の TNFC エントリー同期・ランキング再構築）。本戦結果のお知らせ文もコピーできる。

**TNFC 予選後（図B-5）**：事務局「TNFC」→大会→「リザルト（予選後）」。TNFC Control のリザルト（順位・ID・氏名・カテゴリー。男子は「Division 3」表記でよい）を貼り付け→「内容を確認する」で本戦出場者と付与ポイントを確認（通過ラインは既定 上位3位、カテゴリーごとに変更可）→「リザルト確定＋Rankingポイント付与」。付与pt＝順位点（1位10000／2位8000／3位6000／4・5位5000／6〜10位3000／11位以下1000）×カテゴリー人数倍率（26人以上1.2／11〜25人1.0／3〜10人0.8／1〜2人0.5）。`tnfc_results` と `competition_results`（id はどちらも `${roundId}_${userId}`）に書き、ranking_cache を作り直す。取り込み直すとその大会の結果は置き換わり、いなくなった人の結果は消える（辞退 `cancelled_finals` と昇格リセット `reset_by_promotion` は引き継ぐ）。HP アップロード用リザルト CSV・全会員 CSV・本戦出場者のお知らせ文（NEWS 画面ができるまではコピーして投稿）を出せる。

---

## 6. デザイン方針

### 6-1. 基本の考え方
- **今のサイトの良いところを引き継ぐ**: 既存の色（`--ob-*` トークン、ブランドイエロー `#FACC15`）、ロゴ、Bento Grid 風のカード配置（`/prizes`）、角の丸み。
- そのうえで、**白を基調にした Apple 公式サイトのような、余白の多いミニマルデザイン**に整える。
- ダークグラス調は**写真の上（ヒーロー・TNFCセクション）だけ**に使う。
- 文字を詰め込まず、見出し・余白・コントラストで伝える。1画面に伝えることは1つ。

### 6-2. 質感
- **カードに強い影は付けない**。立体感は次の2つで出す:
  - `1px` の極細の線: `border border-gray-200/80`
  - わずかな背景のぼかし: `bg-white/70 backdrop-blur-md`
- 影を使う場合も `shadow-xs` 程度まで。
- 角の丸み: カード `rounded-2xl`（16px）、ボタン `rounded-full`。

```tsx
// 標準のカード
<div className="rounded-2xl border border-gray-200/80 bg-white/70 backdrop-blur-md p-6">
```

### 6-3. 動き（マイクロインタラクション）
- **スクロールに合わせた控えめなフェードイン**を Motion で共通部品化する（`components/motion/FadeIn.tsx`）。

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.5, ease: "easeOut" }}
/>
```
- 一度表示したら繰り返さない（`once: true`）。カードが並ぶ場合は 0.05〜0.08秒ずつずらす。
- ボタン・カードのホバーは「線の色が少し濃くなる」「背景が少し明るくなる」程度（0.2秒）。
- `prefers-reduced-motion` が有効な人には動きを出さない（Motion の `useReducedMotion` を使う）。

### 6-4. 禁止事項
- 情報過多な装飾（意味のないグラデーション、多すぎるアイコン、背景の柄）。
- チカチカする・跳ねる・回り続けるアニメーション、自動で切り替わるスライダー。
- 古い Bootstrap 風のボタン（角ばった濃い単色の塗り＋強い影、立体的なグラデーション）。
- 絵文字、根拠のない誇大表現、同じ意味の肩書きの重ね書き、「Coming Soon」の乱用。スポンサーの呼称は「協賛」「協賛企業」に統一し、イベントごとに分けて書く（TNFC と Ranking の協賛は別）。

### 6-5. カラー

| トークン | 用途 | 値 |
| :--- | :--- | :--- |
| `--bg` / `--bg-subtle` | 背景／交互のセクション | `#FFFFFF` / `#F5F5F7` |
| `--text` / `--text-2` / `--text-3` | 本文／補足／注釈 | `#1D1D1F` / `#515154` / `#86868B` |
| `--border` | 線 | `rgb(229 231 235 / 0.8)`（gray-200/80） |
| `--brand` | ONE Bouldering のイエロー | `#FACC15`（面・線・アクセントに使い、文字色には使わない） |
| `--event-tnfc` | TNFC | `#1D1D1F`（黒） |
| `--event-tryout` | Division Tryout | `#000000`（黒基調） |
| `--event-ranking` | Ranking | `#FF8C3F`（オレンジ基調・ロゴの色。文字には `--event-ranking-text` `#C2410C`） |
| 状態 | 承認済み／確認待ち／差し戻し | 緑 `#10B981` ／ 黄 `#CA8A04` ／ 赤 `#EF4444` |

- 文字と背景のコントラストは WCAG AA（4.5:1）以上。
- イベント色はバッジ・カード上の細い線・アイコンにだけ使い、面いっぱいには塗らない。
- Ranking を出す場所（トップのイベントカード・ランキングページ・Ranking のイベントページ）には公式ロゴ（`public/images/onebouldering_ranking_logo.png`、暗い背景は `_white`）を置く。部品は `RankingLogo`。
- 3つのイベントページの一番上にはポスター画像を置く。差し替えは事務局画面「ポスター」（画像は Firebase Storage、設定は site_settings/event_posters）。
- Division は画面・CSV とも現在のサイトの正式名称（"Men‘s Division 3" など）で表示する。MD3 などの短い記号は URL と保存データにだけ使う（`divisionName()`）。

### 6-6. ボタン
| 種類 | 見た目 |
| :--- | :--- |
| メイン | 黒 `#1D1D1F` の塗り＋白文字、`rounded-full`、影なし。ホバーで少し明るく |
| サブ | 白地＋`border-gray-200/80`、`rounded-full` |
| テキスト | 文字＋右向き矢印（`ChevronRight`） |
- 高さ 44px 以上。1画面にメインボタンは1つまで。

### 6-7. 文字
| 役割 | フォント |
| :--- | :--- |
| 英数字の大見出し・数値・ボタン・ナビ | Cabinet Grotesk（太字。大文字は見出しのみ） |
| 日本語すべて | Noto Sans JP（400 / 500 / 700） |
| 小さな飾りラベル | 筆記体1種（使う場所は見出し上のラベルに限定） |

- スマホの本文 16px・行間 1.8。見出しは `clamp()` で伸縮。1行は全角35文字前後まで。
- **不自然な改行の防止**: 見出しは BudouX で文節ごとに区切り `text-wrap: balance`。本文は `line-break: strict`。日付・数字・英単語の途中では改行させない。

### 6-8. レイアウト
- **モバイルファースト**。ブレークポイントは Tailwind 標準（640 / 768 / 1024 / 1280）。
- 余白は8の倍数。セクションの間はスマホ 80px、PC 128px が目安。横幅の上限 1200px、スマホの左右余白 20px。
- スマホは画面下にタブ（ホーム／イベント／日程／マイページ）。
- 外部サイト（TNFC Control、ZEUS決済）へ移るボタンには外部リンクのアイコンを付ける。

### 6-9. 表示速度・使いやすさの目安
- Lighthouse（スマホ）の Performance / Accessibility / SEO が **90以上**。
- キーボード操作と読み上げに対応（見出しの階層、`aria-*`、フォーカスの見た目）。

---

## 7. 実装ルール（AI・人間共通）

1. **進め方**: 承認 → 初期セットアップ（パッケージ導入、設定、デザイントークン、フォント、空のレイアウト、Emulator 起動確認）まで行って止まる。以降は **ページ／コンポーネントを1つずつ作り、毎回確認をもらってから次へ進む**。
2. **作る順番（案）**: 共通部品（ボタン・カード・FadeIn）→ ヘッダー/フッター → トップ → 3イベントのページ → はじめての方へ → ランキング → 認証 → 統一QR入口・Tryout・Ranking提出 → マイページ → 店舗画面 → 事務局画面 → データのコピー → 本番切り替え（直前にもう一度コピー）。
3. Firestore への書き込みは**サーバー側だけ**。権限チェックは必ずサーバーで行う。
4. 秘密情報（APIキーの値、パスワード、サービスアカウント）はコードに書かない。`.env.local` と App Hosting のシークレットに置き、Git に入れない。
5. 判定・計算ロジックは `src/domain/` に置き、必ず単体テストを書く（Tryout判定、pt計算、ゼッケン採番、年度末リセットなど）。既存の `integratedLogic.ts` / `tnfcLogic.ts` / `functions/src/domain.ts` の仕様とテストを引き継ぐ。
6. 外部URLは `src/content/links.ts`、サイトのURLは `NEXT_PUBLIC_SITE_URL` で一元管理（ドメインが仮のため）。
7. 会場の所在地はマスターデータ（`venueCoordinates.ts` / `verified_venues_database.md`）の値を使い、推測しない。
8. 既存アプリ `onebouldering-ranking-2027` は、新サイトの本番切り替えまで**触らずに動かし続ける**。

---

## 8. 承認前に確認したいこと

1. **ホスティング**: Firebase App Hosting（サーバー処理あり・Firestoreと同じ管理画面）でよいか。既存の Cloudflare Pages からは移ることになる。
2. **ステージング用の Firebase プロジェクト**を新しく作ってよいか（作成はご自身の Google アカウントで行ってもらう必要がある）。
3. **選手のログイン方式**: 今と同じ「LICENCE NO. ＋ 4桁PIN」を続けるか（PINはハッシュ化して安全にする）。
4. **素材の場所**: ロゴSVG・写真・Cabinet Grotesk のファイルがあるフォルダを教えてほしい（Cabinet Grotesk が手元にない場合は Fontshare から入手する）。
