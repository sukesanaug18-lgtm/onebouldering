// Pages the office can rewrite from the admin screen (/admin/pages). The text here is shown
// until the office saves its own version (site_pages/{slug}); "初期の文章に戻す" returns to it.
// First drafts follow the current site (onebouldering.jp competition pages and FAQ).
// Body syntax: the same as NEWS (src/domain/news.ts).

export const SITE_PAGE_SLUGS = ["rules", "faq", "prizes", "sponsors", "schedule"] as const;
export type SitePageSlug = (typeof SITE_PAGE_SLUGS)[number];

export type SitePageDefault = {
  slug: SitePageSlug;
  /** Public path of the page. */
  path: string;
  eyebrow: string;
  title: string;
  lead: string;
  body: string;
};

const CONTACT = "[お問い合わせフォーム](https://www.onebouldering.jp/contact/)";

const RULES = `## THE NORTH FACE CUP
主催：株式会社BaseCamp ／ 協賛：THE NORTH FACE（株式会社ゴールドウイン）
ビギナーからプロレベルまで参加できる国内最大規模のボルダリング大会です。全国の予選会で勝ち抜いた上位の選手が本戦に出場し、Division（カテゴリー）ごとのチャンピオンが決まります。大会の結果によって Division の昇格を行います。

## 大会参加条件
- Division をお持ちの方（Uカテゴリーは年齢で自動的に決まります）は、すぐにエントリーできます。
- Division が決まっていない方は、予選会のエントリー締切日までに Division Tryout を受けて Division を決めてください。
- Tryout の結果がエントリー中の Division と違う場合は、Tryout で決まった Division にエントリーが変わります。変更後の Division の定員が埋まっていても出場できます。
- 大会に出場した結果は、その後に Tryout を受けても変わりません。
- 予選会へのエントリーは1回のみです。会場は自由に選べます。
- Division の変更を希望する方は、ライセンスNo.・お名前・変更希望の理由（最近の大会結果など）を書いて${CONTACT}からご連絡ください。運営で判断します。

## Men's Division 1 / Women's Division 1 と本戦招待選手
Division 1 には予選会がなく、本戦予選からエントリーできます。次のどれかにあてはまる方が Division 1 になります。
- 過去3年以内に BOULDER JAPAN CUP に出場した方
- Division Tryout で Division 1 に昇格した方
- BOULDER JAPAN CUP の出場権を獲得した方
予選会にエントリー済みの方が上の条件を満たした場合、エントリーは本戦予選（Division 1）に自動で切り替わります。追加の費用はかかりません。
前年の本戦ファイナリストと、BOULDER JAPAN CUP の上位3名は、本戦準決勝からシード選手として出場できます。該当の方には事務局からご連絡します。

## 本戦出場条件
各予選会の上位の選手が本戦予選に出場できます。出場権の数は、Division ごとの参加人数で決まります。
**Men's Division / Women's Division**
- 2名以下：1位まで
- 4名以下：2位まで
- 10名以下：3位まで
- 15名以下：4位まで
- 20名以下：5位まで
- 25名以下：6位まで
- 30名以下：7位まで
- 35名以下：8位まで
- 40名以下：9位まで
- 41名以上：10位まで

**Uカテゴリー（U-8 / U-10 / U-12 / U-15）**
- 2名以下：1位まで
- 10名以下：2位まで
- 25名以下：3位まで
- 35名以下：4位まで
- 36名以上：5位まで

本戦出場をキャンセルした方が出ても、繰り上げ出場はありません。本戦出場権を持つ選手が BOULDER JAPAN CUP への出場が決まって Division 1 に上がった場合は、その選手が出場した予選会の出場権が繰り上がります。

## 募集カテゴリー
- U-8（小学2年以下）・U-10（小学3・4年）：男女合わせて募集し、競技と成績は男女別です。
- U-12 男子・女子（小学5・6年）
- U-15 男子・女子（中学生）
- Women's Division 1〜4
- Men's Division 1〜5

## 大会の成績による Division 昇格
本戦出場権を獲得した次の選手は、翌年度の4月1日から Division が昇格します。
- Women's Division 3 → Women's Division 2
- Men's Division 4 → Men's Division 3
- Men's Division 3 → Men's Division 2
年度の切り替えで、一部の Division はリセットされます。昇格・降格を希望する方は Division Tryout を受けてください。

## 競技ルール
予選会・本戦予選・本戦準決勝はセッション方式です。決められた時間内に課題（コース）にトライし、完登数・ゾーン数で順位を決めます。各 Division でトライする課題は8課題です。

## エントリー費
- 11,000円（税込）。予選を通過して本戦に出場するときに、追加の参加費はかかりません。
- ノベルティーあり（申し込み先着順）。大会当日の受付でお渡しします。
- お支払いはクレジットカードまたはコンビニ決済。エントリー後にマイページからお支払いください。
- お支払い期限は、参加する予選会の7日前（エントリー締切日）までです。遅れる場合は必ず事前にご連絡ください。締切までに支払いがなくても自動ではキャンセルになりません。
- 本戦出場権を獲得した方で、主催者の都合で本戦が中止（延期を除く）になった場合は、エントリー費のうち2,000円を返金します。

## エントリー後の変更・キャンセル
- 日程の変更・キャンセルは、マイページの変更フォームからご連絡ください。
- 他の会場への変更は、対応に2日ほどかかることがあります。その間に希望の会場の定員が埋まった場合は変更できません。
- 大会日の7日前（エントリー締切後）から当日までのキャンセルは、キャンセル料として参加費の100％をいただきます。
- 当日の無断欠席と、大会参加後のキャンセルはお受けできません。予選会に参加した後は、本戦出場権の有無にかかわらず返金できません。

## エントリー方法と締切
- エントリーは、このサイトの THE NORTH FACE CUP のページからお申し込みください。会員登録（無料）が必要です。
- エントリー締切は、各予選会の7日前までです（例：大会が20日（土）なら13日（土）までエントリーできます）。

## Division Tryout・ONE bouldering Ranking
Tryout の判定のしかたは [Division Tryout のページ](/tryout/about)、Ranking のポイントと集計は [ONE bouldering Ranking のページ](/ranking/about) をご覧ください。`;

const FAQ = `## ONE bouldering からのメールが届きません
- フォームを送るとすぐにメールが届きますが、混み合っていると時間がかかることがあります。しばらく待ってからご確認ください。
- 迷惑メールフォルダに入っていないかご確認ください。noreply@onebouldering.jp と info@onebouldering.jp からのメールを受け取れるように設定してください。
- メールボックスの容量がいっぱいだと受け取れません。不要なメールを削除してください。

## 「エントリー不可」と表示されてエントリーできません
- **エントリー期間外**：大会のエントリー開始日をご確認ください。
- **定員オーバー**：大会には定員があります。キャンセル待ちや繰り上がりエントリーはありません。
- **Division が違う**：ご自身の Division と違う Division にはエントリーできません。年度ごとに Division が変わることがあるので、マイページで今の Division をご確認ください。
Division の変更を希望する方は、ライセンスNo.・お名前・変更希望の理由を書いて${CONTACT}からご連絡ください。運営の判断でご希望に添えない場合があります。

## エントリー費を支払ったのに、マイページに反映されません
お支払いからマイページへの反映まで、4〜7日ほどかかることがあります。しばらくお待ちください。

## コンビニ決済の期限を過ぎてしまいました
マイページからもう一度お支払いに進み、コンビニ決済を選び直してください。コンビニ決済の画面に出る期限は、大会のお支払い期限とは違うことがあります。大会のお支払い期限までに支払いが終われば大丈夫です。

## ライセンスNo. や暗証番号を忘れました
ライセンスNo. はマイページや登録時のメールで確認できます。暗証番号は [暗証番号の再設定](/reset-pin) から、ライセンスNo.・メールアドレス・生年月日を入れて決め直せます。わからない場合は${CONTACT}からご連絡ください。

## Ranking のスコアを送ったのに反映されません
スコアは店舗スタッフの承認で正式なスコアになります。当日承認を受けられなかった場合は、事務局までお問い合わせください。

## サイトがうまく表示されません
- 「503 Service Unavailable」と出る場合は、エントリー開始直後などでアクセスが集中しています。時間をおいてもう一度お試しください。
- ページが正しく表示されない場合は、ブラウザのキャッシュを削除してからもう一度お試しください（Cookie を削除すると、ほかのサイトのログインも外れることがあります）。`;

const PRIZES = `## 協賛景品
今シーズンの協賛景品は準備中です。決まりしだい、このページでお知らせします。

協賛のご相談は${CONTACT}からご連絡ください。`;

const SPONSORS = `THE NORTH FACE CUP と ONE bouldering Ranking では、協賛していただいている企業が違います。各イベントのページにもロゴを載せています。

## THE NORTH FACE CUP
- THE NORTH FACE（株式会社ゴールドウイン）
- Jazzy Sport
- New-HALE
- LA SPORTIVA
- Vibram

## ONE bouldering Ranking
- New-HALE
- re:white
- SAVAS

## 主催
- 株式会社BaseCamp

スポンサーのご相談は${CONTACT}からご連絡ください。`;

const SCHEDULE = `開催会場と期間は、決まりしだい更新します。最新の情報は [NEWS](/news) と公式 Instagram でもお知らせします。`;

export const SITE_PAGES: Record<SitePageSlug, SitePageDefault> = {
  rules: {
    slug: "rules",
    path: "/rules",
    eyebrow: "Rules",
    title: "ルール・大会要項",
    lead: "THE NORTH FACE CUP の参加条件・本戦出場条件・エントリー費・キャンセルについて。",
    body: RULES,
  },
  faq: {
    slug: "faq",
    path: "/faq",
    eyebrow: "FAQ",
    title: "よくある質問",
    lead: "お問い合わせの前に、こちらをご確認ください。",
    body: FAQ,
  },
  prizes: {
    slug: "prizes",
    path: "/prizes",
    eyebrow: "Prizes",
    title: "協賛景品",
    lead: "ONE Bouldering のイベントを応援してくださる企業からの景品です。",
    body: PRIZES,
  },
  sponsors: {
    slug: "sponsors",
    path: "/sponsors",
    eyebrow: "Sponsors",
    title: "協賛企業",
    lead: "ONE Bouldering のイベントを支えてくださる企業の皆さまです（イベントごとに異なります）。",
    body: SPONSORS,
  },
  schedule: {
    slug: "schedule",
    path: "/schedule",
    eyebrow: "Schedule",
    title: "日程・会場",
    lead: "THE NORTH FACE CUP の予選、Division Tryout と ONE bouldering Ranking の開催ジムをまとめています。",
    body: SCHEDULE,
  },
};
