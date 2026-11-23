# 新サイトを公開する手順（Firebase App Hosting）

新プロジェクト `one-bouldering` に新サイトを載せて、`https://〜.hosted.app` の URL で誰でも開けるようにする手順です。
今のアプリ（`one-bouldering-ranking`）には一切さわりません。

「あなた」はFirebase コンソールでの作業、「AI」は Claude などに頼める作業です。

---

## 1. Firebase プロジェクトの準備（あなた・最初の1回だけ）

[Firebase コンソール](https://console.firebase.google.com/) で `one-bouldering` を開いて、次を順に行います。

1. **料金プランを Blaze（従量課金）にする**
   左下の「アップグレード」から。App Hosting に必要です。小さなサイトならほぼ無料の範囲ですが、念のため Google Cloud の「予算とアラート」で月1,000円などの通知を設定しておくと安心です。
2. **Firestore Database を作る**
   「構築 → Firestore Database → データベースを作成」。場所は `asia-northeast1（東京）`、モードは「本番環境モード」。
3. **Authentication を有効にする**
   「構築 → Authentication → 始める」→「メール / パスワード」を有効に（事務局のログインに使います）。
4. **Storage を作る**
   「構築 → Storage → 始める」。場所は `asia-northeast1`。
5. **ウェブアプリを登録する**
   「プロジェクトの設定（歯車）→ 全般 → マイアプリ → `</>`（ウェブ）」。名前は `onebouldering-web` など。Hosting のチェックは不要です。
   ※ これがあると App Hosting がログイン用のキーを自動でサイトに渡します。

## 2. ログイン用の秘密の文字列を登録する（あなた・最初の1回だけ）

PowerShell で、リポジトリのフォルダに移動してから実行します。

```powershell
cd C:\Users\murakamieisuke\dev\onebouldering
```

```powershell
npx firebase-tools login
```

ランダムな文字列を作ります（表示された文字列をコピー。どこにも保存・共有しないでください）。

```powershell
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
```

登録します。値を聞かれたら、さっきの文字列を貼り付けます。

```powershell
npx firebase-tools apphosting:secrets:set session-secret --project one-bouldering
```

## 3. データベースのルールを反映する（あなた or AI）

ブラウザからの直接の読み書きをすべて禁止するルール（`firestore.rules` / `storage.rules`）と、検索用のインデックスを反映します。

```powershell
npx firebase-tools deploy --only firestore,storage --project one-bouldering
```

## 4. App Hosting でサイトを作る（あなた）

1. Firebase コンソール「構築 → App Hosting → 始める（バックエンドを作成）」。
2. リージョン：一覧に `asia-northeast1（東京）` があればそれ、なければ `asia-east1（台湾）`。
3. GitHub と接続して、リポジトリ **`sukesanaug18-lgtm/onebouldering`** を選ぶ。
4. ライブブランチ：`main`、ルートディレクトリ：`/`、自動ロールアウト：オン。
5. バックエンドの名前：**`onebouldering`**。
6. 作成すると最初のビルドが始まります（5〜10分）。

最初のビルドで「session-secret にアクセスできない」と出たら、次を実行してから「ロールアウトを作成」でやり直します。

```powershell
npx firebase-tools apphosting:secrets:grantaccess session-secret --backend onebouldering --project one-bouldering
```

完了すると、`https://onebouldering--one-bouldering.<リージョン>.hosted.app` のような URL が表示されます。**これが触れる URL です。**

## 5. URL をサイトに設定する（AI）

表示された URL を AI に伝えてください。`apphosting.yaml` の `NEXT_PUBLIC_SITE_URL`（QR コードや共有リンクに使う）を書き換えて GitHub に push すると、自動でもう一度公開されます。

以後は、`main` に push するたびに自動でサイトが更新されます。

## 6. 事務局のアカウント（済み・追加は画面から）

最初の事務局アカウント（sukesanaug18@gmail.com）は作成済みです。パスワードはまだありません。

1. `https://onebouldering--one-bouldering.us-east4.hosted.app/admin/login/password` でメールアドレスを入れて「パスワード設定のメールを送る」。
2. 届いたメールのリンクからパスワードを決めて、`/admin/login` でログイン。
3. ほかの人を追加するときは、事務局画面の「事務局メンバー」でメールアドレスを入れて追加します。相手にパスワード設定のメールが届きます。外すときも同じ画面から。

## 7. データを入れる（決めてから）

公開したばかりのサイトはデータが空です（会場・ランキング・NEWS は「まだありません」と表示されます）。

- **今のデータをコピーする**：`npm run copy-data -- --source one-bouldering-ranking --target one-bouldering`（まず件数確認、`--apply` で書き込み）。今のアプリ側は読むだけです。本物の会員情報が入るので、URL の扱いに注意してください。
- コピーしたデータは、サイトのキャッシュ（最大1時間）が切れると表示されます。すぐに見たいときは App Hosting で「ロールアウトを作成」してください。

---

### うまくいかないとき

- ビルドのログは App Hosting の画面 → ロールアウト → 「ログを表示」で見られます。内容を AI に貼ってください。
- サイトは開くが事務局ログインで「エラー」：手順1-3（メール/パスワード）と1-5（ウェブアプリ登録）を確認。
- 選手ログインなどで 500 エラー：手順2の `session-secret` と、4 の grantaccess を確認。
