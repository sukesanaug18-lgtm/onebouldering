import { divisionName } from "@/domain/division";
import type { EventPageContent } from "@/features/events/types";

// Event page copy. Facts come from the current site (guide / ranking / tnfc pages) and the
// 2027 workflow doc (all_business_workflows_2027.md, figures B-2, B-5, B-6).
// Dates and venues per round come from Firestore in the data step; they are not written here.

// Official names as on the current site ("Men‘s Division 3"); short codes are never shown.
const names = (codes: string[]) => codes.map(divisionName);
const DIVISIONS_MEN = names(["MD1", "MD2", "MD3", "MD4", "MD5"]);
const DIVISIONS_WOMEN = names(["WD1", "WD2", "WD3", "WD4"]);
const U_CATEGORIES = ["U-8", "U-10", "U-12M", "U-12W", "U-15M", "U-15W"];

const POINT_TABLE = {
  caption: "公認大会のポイント",
  head: ["順位", "TNFC 予選", "その他の公認大会"],
  rows: [
    ["1位", "10,000", "5,000"],
    ["2位", "8,000", "4,000"],
    ["3位", "6,000", "3,000"],
    ["4・5位", "5,000", "2,500"],
    ["6〜10位", "3,000", "1,500"],
    ["11位〜", "1,000", "500"],
  ],
};

const MULTIPLIER_TABLE = {
  caption: "参加人数による倍率",
  head: ["そのDivisionの参加人数", "倍率"],
  rows: [
    ["26名以上", "× 1.2"],
    ["11〜25名", "× 1.0"],
    ["3〜10名", "× 0.8"],
    ["1〜2名", "× 0.5"],
  ],
  note: "順位のポイントに、出場したDivisionの参加人数に応じた倍率を掛けます。",
};

export const TNFC_PAGE: EventPageContent = {
  key: "tnfc",
  name: "THE NORTH FACE CUP",
  kind: "全国大会",
  lead: "全国の予選ラウンドを勝ち抜いて、本戦へ。Divisionごとに競う、国内最大級のボルダリングコンペです。",
  primary: { label: "予選にエントリーする", href: "/tnfc/apply" },
  secondary: { label: "リザルトを見る", href: "/results" },
  facts: [
    { value: "全国", label: "各地で予選ラウンドを開催" },
    { value: "本戦", label: "予選の上位選手が出場" },
    { value: "×1.2", unit: "倍", label: "成績は Ranking のポイントに加算（最大）" },
  ],
  overview: [
    "全国の加盟ジムで予選ラウンドを行い、各Divisionの上位選手が本戦に進みます。",
    "エントリーはこのサイトから。出場するDivisionは、Division Tryout の結果と自動でつながります。予選の成績は ONE bouldering Ranking の公認大会ポイントとして加算されます。",
  ],
  categories: [
    { title: "Men's Division", items: DIVISIONS_MEN },
    { title: "Women's Division", items: DIVISIONS_WOMEN },
    {
      title: "Uカテゴリー（ジュニア）",
      items: U_CATEGORIES,
      note: "生年月日から自動で決まります。",
    },
    {
      title: "Divisionが決まっていない方",
      items: ["Division Tryout"],
      note: "エントリーの前に Division Tryout を受けて、出場するDivisionを決めてください。",
    },
  ],
  steps: [
    { title: "選手登録", text: "無料で登録します。登録済みの方はログインします。" },
    { title: "Divisionを決める", text: "まだの方は参加ジムで Division Tryout を受けます。" },
    {
      title: "予選にエントリー",
      text: "出場する予選を選び、クレジットカードかコンビニで支払います。",
    },
    { title: "予選・本戦に出場", text: "ゼッケンと本戦出場権はマイページで確認できます。" },
  ],
  schedule: {
    text: "予選ラウンドの開催日・会場・申込締切は、日程ページで発表します。",
    places: [{ label: "本戦", value: "Climb Park Base Camp 入間" }],
  },
  rules: [
    {
      title: "エントリー",
      items: [
        "このサイトからエントリーし、クレジットカード（即時確定）またはコンビニ（後日確認）で支払います。",
        "締切までに Division Tryout でDivisionが変わった場合、エントリーのDivisionも自動で変わります。",
      ],
    },
    {
      title: "予選から本戦へ",
      items: [
        "予選の結果は、当日 TNFC Control でリアルタイムに確認できます。",
        "予選の上位選手が本戦に進みます。本戦出場権はマイページと日程ページに表示されます。",
      ],
    },
    {
      title: "Division 1",
      items: [
        "Men's / Women's Division 1 は、本戦の順位で決まります。",
        "本戦の結果をもとに、次の年度のDivision昇格者を発表します。",
      ],
    },
    {
      title: "Ranking とのつながり",
      items: [
        "予選の順位に応じたポイントが、ONE bouldering Ranking の総合ポイントに加算されます。",
      ],
    },
  ],
  tables: [POINT_TABLE, MULTIPLIER_TABLE],
  faq: [
    {
      q: "Divisionが決まっていなくてもエントリーできますか？",
      a: "先に Division Tryout を受けて、Divisionを決めてからエントリーしてください。参加ジムで受けられます。",
    },
    {
      q: "エントリー後にDivisionが変わったら？",
      a: "締切までに Division Tryout で昇格・降格した場合、エントリーのDivisionも自動で変わります。手続きは不要です。",
    },
    {
      q: "支払い方法は？",
      a: "クレジットカードとコンビニ払いに対応しています。クレジットカードはその場で支払いが確定します。",
    },
    {
      q: "キャンセルや会場の変更はできますか？",
      a: "お問い合わせフォームからご連絡ください。事務局で対応します。",
    },
  ],
};

export const TRYOUT_PAGE: EventPageContent = {
  key: "tryout",
  name: "Division Tryout",
  kind: "クラス認定",
  lead: "参加ジムで指定の6課題に挑戦して、自分のDivision（クラス）を決めます。結果はその場で決まり、TNFC のエントリーにも自動で反映されます。",
  primary: { label: "Tryout を受ける", href: "/tryout" },
  secondary: { label: "参加ジムを探す", href: "/schedule" },
  facts: [
    { value: "6", unit: "課題", label: "Divisionごとに決められた課題" },
    { value: "即時", label: "完登数でその場で判定" },
    { value: "何度でも", label: "挑戦できます" },
  ],
  overview: [
    "Division Tryout は、ONE Bouldering の3つのイベントで使うDivision（クラス）を決める認定です。",
    "挑戦するDivisionの指定6課題を登り、完登した数で昇格・残留・降格が決まります。決まったDivisionは、マイページ・Ranking・THE NORTH FACE CUP のエントリーに自動で反映されます。",
  ],
  categories: [
    { title: "Men's（挑戦できるDivision）", items: names(["MD2", "MD3", "MD4", "MD5"]) },
    { title: "Women's（挑戦できるDivision）", items: names(["WD2", "WD3", "WD4"]) },
  ],
  steps: [
    { title: "選手登録", text: "無料で登録します。Divisionは「未確定」のままで大丈夫です。" },
    { title: "会場のQRを読む", text: "参加ジムの QR コードを読むと、Tryout の画面が開きます。" },
    {
      title: "挑戦するDivisionを選ぶ",
      text: "事前チェックの結果からおすすめのDivisionを表示します。自分で選ぶこともできます。",
    },
    {
      title: "6課題に挑戦して送信",
      text: "完登した課題を選んで送信すると、その場でDivisionが決まります。",
    },
  ],
  schedule: {
    text: "Division Tryout は、参加ジムでいつでも受けられます。受けられるジムは日程ページで確認できます。",
  },
  rules: [
    {
      title: "判定のしかた",
      items: [
        "6課題すべて完登：1つ上のDivisionに昇格（Men‘s Division 2・Women‘s Division 2 からは Division 1 へ）。",
        "4〜5課題：そのまま。初めての方は挑戦したDivisionに決まります。",
        "0〜3課題：1つ下のDivisionに降格。Men‘s Division 5・Women‘s Division 4 の方はそのままです。",
      ],
    },
    {
      title: "ポイントとエントリー",
      items: [
        "昇格しても、ジムで獲得した Ranking のポイントはそのまま引き継ぎます。",
        "昇格したときは、公認大会のポイントがリセットされます。",
        "同じ年度の THE NORTH FACE CUP のエントリーも、新しいDivisionに自動で変わります。",
      ],
    },
    {
      title: "Ranking とあわせて",
      items: [
        "同じジムで Ranking も開催中なら、完登した課題をそのまま Ranking のスコアとして入力できます。",
      ],
    },
  ],
  tables: [
    {
      caption: "Divisionごとの指定課題",
      head: ["Division", "課題番号"],
      rows: [
        [divisionName("MD2"), "No.9〜14"],
        [divisionName("MD3"), "No.7〜12"],
        [divisionName("MD4"), "No.5〜10"],
        [divisionName("MD5"), "No.3〜8"],
        [divisionName("WD2"), "No.5〜10"],
        [divisionName("WD3"), "No.3〜8"],
        [divisionName("WD4"), "No.1〜6"],
      ],
    },
  ],
  faq: [
    {
      q: "何回でも受けられますか？",
      a: "はい、何度でも挑戦できます。最後に送信した結果で判定します。",
    },
    {
      q: "どのDivisionから挑戦すればいいですか？",
      a: "事前チェックの結果から、おすすめのDivisionを表示します。迷ったらおすすめから始めてください。",
    },
    {
      q: "結果はいつ反映されますか？",
      a: "送信するとすぐに、マイページと THE NORTH FACE CUP のエントリーに反映されます。",
    },
    {
      q: "店舗スタッフの確認は必要ですか？",
      a: "Tryout は送信した時点で確定します。Ranking のスコア提出とは違い、スタッフの承認はいりません。",
    },
  ],
};

export const RANKING_PAGE: EventPageContent = {
  key: "ranking",
  name: "ONE bouldering Ranking",
  kind: "全国ランキング",
  lead: "全国の参加ジムに設定される40課題に挑戦して、スコアで競う年間ランキングです。公認大会の成績もポイントになります。",
  primary: { label: "スコアを提出する", href: "/score" },
  secondary: { label: "ランキングを見る", href: "/ranking" },
  facts: [
    { value: "40", unit: "課題", label: "各参加ジムに設定" },
    { value: "上位3", unit: "会場", label: "＋公認大会の成績で総合順位" },
    { value: "無料", label: "参加費（施設利用料のみ）" },
  ],
  overview: [
    "参加ジムに設定される40課題を登り、完登した課題の番号に応じたポイントを集めます。期間中は何度でも挑戦でき、いちばん高いスコアが記録されます。",
    "総合ランキングは、ポイントの高い上位3会場の合計に、THE NORTH FACE CUP などの公認大会の成績を加えて決まります。Divisionごとに順位を発表し、年度末に最終成績を発表します。",
  ],
  categories: [
    { title: "Men's Division", items: DIVISIONS_MEN },
    { title: "Women's Division", items: DIVISIONS_WOMEN },
    { title: "Uカテゴリー（ジュニア）", items: U_CATEGORIES },
    {
      title: "開催地域",
      items: ["北海道", "東北", "関東", "東海", "関西", "九州"],
    },
  ],
  steps: [
    { title: "選手登録", text: "無料で登録します。Divisionが未確定の方は先に Tryout を受けます。" },
    { title: "参加ジムで登る", text: "ジムに設定された40課題に挑戦します。何度でもOKです。" },
    { title: "スコアを入力", text: "会場の QR コードから、完登した課題を入力して送信します。" },
    {
      title: "スタッフの承認",
      text: "帰る前に店舗スタッフに声をかけて承認を受けると、正式なスコアになります。",
    },
  ],
  schedule: {
    text: "参加ジムごとに開催期間があります。開催中のジムと期間は日程ページで確認できます。",
  },
  rules: [
    {
      title: "スコアの記録",
      items: [
        "40課題は番号ごとにポイントが決まっています。",
        "送信しただけでは反映されません。店舗スタッフの承認で正式なスコアになります。",
        "開催期間中は、登れた課題が増えるたびにスコアを更新できます。",
      ],
    },
    {
      title: "3つのランキング",
      items: [
        "総合：上位3会場のポイント＋公認大会のポイント。",
        "地域別：その地域のジムで獲得したポイントをすべて合計（会場数の上限なし・公認大会は含まない）。地域は選手の住まいではなく、ジムの所在地で決まります。",
        "店舗別：ジムごとの順位。",
      ],
    },
    {
      title: "表彰と参加賞",
      items: [
        "総合・地域別の1〜3位に、オリジナルトロフィーを贈ります。",
        "参加賞として、会場ごとにデザインの違うオリジナルステッカーを1会場1枚お渡しします（先着順）。",
      ],
    },
    {
      title: "Divisionの昇格",
      items: [
        "年度末の順位に応じて、上位の選手はDivisionが昇格します。対象Divisionと人数は要項で発表します。",
      ],
    },
  ],
  tables: [POINT_TABLE, MULTIPLIER_TABLE],
  faq: [
    {
      q: "参加費はかかりますか？",
      a: "無料です。ジムの施設利用料のみ必要です。",
    },
    {
      q: "スコアを送信したのに反映されません。",
      a: "店舗スタッフの承認が必要です。当日承認を受けられなかった場合は、事務局までお問い合わせください。",
    },
    {
      q: "同じジムで何度も参加できますか？",
      a: "はい。開催期間中は何度でも挑戦でき、いちばん高いスコアが記録されます。",
    },
    {
      q: "地域別ランキングはどこで集計されますか？",
      a: "登ったジムの所在地で集計します。たとえば関東の方が北海道のジムで登ったスコアは、北海道のランキングに入ります。",
    },
  ],
};
