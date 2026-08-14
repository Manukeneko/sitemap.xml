// 市場調査AIが扱う「シグナル」の共通型。
// 新しい調査ソースを追加する場合は SignalSource を実装したファイルを
// lib/research/sources/ に追加し、aggregator.ts の SOURCES に登録するだけでよい。

export interface Signal {
  source: string; // 例: "youtube", "google_trends"
  label: string; // 何についてのシグナルか（検索語・動画タイトル等）
  score?: number; // 0-100 の目安スコア（ソースにより意味が異なる）
  detail?: string;
  url?: string;
}

export interface SignalSource {
  name: string;
  /** APIキー等が未設定なら false を返し、fetchSignalsは呼ばれない想定 */
  isConfigured(): boolean;
  fetchSignals(seed?: string): Promise<Signal[]>;
}
