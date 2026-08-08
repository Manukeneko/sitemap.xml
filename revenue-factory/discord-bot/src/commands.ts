import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import * as api from "./api.js";

export interface BotCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

function fmtJpy(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`;
}

const start: BotCommand = {
  data: new SlashCommandBuilder().setName("start").setDescription("AI収益工場の状態を表示します"),
  async execute(interaction) {
    const stats = await api.getStats();
    await interaction.reply(
      [
        "AI収益工場 — Phase 1〜7 稼働中です。",
        "スケジュール実行（毎日自動でテーマ発掘〜制作まで行う完全自動ループ）はPhase9未実装のため、",
        "`/create` コマンドで手動トリガーしてください。",
        "",
        `今日のテーマ発掘数: ${stats.topicsToday}`,
        `今日の企画コンテンツ数: ${stats.contentsToday}`,
      ].join("\n")
    );
  },
};

const status: BotCommand = {
  data: new SlashCommandBuilder().setName("status").setDescription("現在の状態を表示します"),
  async execute(interaction) {
    const [stats, reviewList, scheduledList] = await Promise.all([
      api.getStats(),
      api.getContentsByStatus("review"),
      api.getContentsByStatus("scheduled"),
    ]);
    await interaction.reply(
      [
        "【現在の状態】",
        `今日のテーマ発掘数: ${stats.topicsToday} ／ 今日の企画コンテンツ数: ${stats.contentsToday}`,
        `今日のAIコスト: $${stats.aiCostTodayUsd.toFixed(4)} ／ 累計AIコスト: $${stats.aiCostTotalUsd.toFixed(4)}`,
        `承認待ち（review）: ${reviewList.contents.length}件 ／ 投稿予定（scheduled）: ${scheduledList.contents.length}件`,
        stats.topTopic ? `最も収益期待値が高いテーマ: ${stats.topTopic.title}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  },
};

const report: BotCommand = {
  data: new SlashCommandBuilder().setName("report").setDescription("今日・累計の収益レポートを表示します"),
  async execute(interaction) {
    const [stats, roi] = await Promise.all([api.getStats(), api.getRoi()]);
    const totalRevenue = roi.roi.reduce((sum, r) => sum + r.revenueJpy, 0);
    const totalCost = roi.roi.reduce((sum, r) => sum + r.aiCostJpy, 0);
    const lossTopics = roi.roi.filter((r) => r.isLoss);

    await interaction.reply(
      [
        "【収益レポート】",
        `今日のAIコスト: $${stats.aiCostTodayUsd.toFixed(4)}`,
        `累計AIコスト: $${stats.aiCostTotalUsd.toFixed(4)}（約${fmtJpy(totalCost)}）`,
        `累計収益（手動登録分）: ${fmtJpy(totalRevenue)}`,
        `損益: ${fmtJpy(totalRevenue - totalCost)}`,
        lossTopics.length > 0
          ? `赤字テーマ: ${lossTopics.map((t) => t.title).join(", ")}`
          : "赤字テーマなし",
        "",
        "※各媒体の分析APIとの自動連携は未実装のため、収益は `/api/revenue` への手動登録分のみを集計しています。",
      ].join("\n")
    );
  },
};

const trends: BotCommand = {
  data: new SlashCommandBuilder().setName("trends").setDescription("AIが発見した最新テーマ（収益期待値順）を表示します"),
  async execute(interaction) {
    const { topics } = await api.getTopics();
    if (topics.length === 0) {
      await interaction.reply("まだテーマがありません。`/create` で市場調査AIを実行してください。");
      return;
    }
    const lines = topics
      .slice(0, 10)
      .map((t, i) => `${i + 1}. [${t.totalScore.toFixed(1)}] ${t.title}（${t.category}）`);
    await interaction.reply(["【テーマランキング TOP10】", ...lines].join("\n"));
  },
};

const create: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("create")
    .setDescription("市場調査AIを実行してコンテンツ制作を開始します")
    .addStringOption((opt) =>
      opt.setName("genre").setDescription("ジャンル（例: AI, gadget）").setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const genre = interaction.options.getString("genre") ?? undefined;
    try {
      const { topics } = await api.runResearch(genre);
      const lines = topics.map((t) => `[${t.totalScore.toFixed(1)}] ${t.title}`);
      await interaction.editReply(
        [`市場調査AIを実行しました${genre ? `（ジャンル: ${genre}）` : ""}。`, ...lines].join("\n")
      );
    } catch (err) {
      await interaction.editReply(`失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

const approve: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("approve")
    .setDescription("投稿待ちコンテンツを承認します（IDを省略すると承認待ち一覧を表示）")
    .addStringOption((opt) => opt.setName("content_id").setDescription("承認するコンテンツID").setRequired(false)),
  async execute(interaction) {
    const contentId = interaction.options.getString("content_id");
    if (!contentId) {
      const { contents } = await api.getContentsByStatus("review");
      const passed = contents.filter((c) => c.qualityStatus === "passed");
      if (passed.length === 0) {
        await interaction.reply("品質チェック合格済みで承認待ちのコンテンツはありません。");
        return;
      }
      const lines = passed.map((c) => `- \`${c.id}\` [${c.platform}] ${c.title}（${c.topic.title}）`);
      await interaction.reply(
        ["承認待ちコンテンツ一覧（`/approve content_id:<ID>` で承認）:", ...lines].join("\n")
      );
      return;
    }
    try {
      const { content } = await api.approveContent(contentId);
      await interaction.reply(`承認しました: [${content.platform}] ${content.title}`);
    } catch (err) {
      await interaction.reply(`承認に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

const schedule: BotCommand = {
  data: new SlashCommandBuilder().setName("schedule").setDescription("投稿予定のコンテンツを確認します"),
  async execute(interaction) {
    const { contents } = await api.getContentsByStatus("scheduled");
    if (contents.length === 0) {
      await interaction.reply("投稿予定のコンテンツはありません。");
      return;
    }
    const lines = contents.map((c) => `- [${c.platform}] ${c.title}（${c.topic.title}）`);
    await interaction.reply(["【投稿予定】", ...lines].join("\n"));
  },
};

const top: BotCommand = {
  data: new SlashCommandBuilder().setName("top").setDescription("最も稼いだコンテンツを表示します"),
  async execute(interaction) {
    const { revenues } = await api.getRevenue();
    if (revenues.length === 0) {
      await interaction.reply("収益記録がまだありません。");
      return;
    }
    const totals = new Map<string, { title: string; platform: string; amount: number }>();
    for (const r of revenues) {
      if (!r.contentId || !r.content) continue;
      const cur = totals.get(r.contentId) ?? { title: r.content.title, platform: r.content.platform, amount: 0 };
      cur.amount += r.revenueAmount;
      totals.set(r.contentId, cur);
    }
    const ranked = [...totals.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
    if (ranked.length === 0) {
      await interaction.reply("コンテンツに紐づく収益記録がまだありません。");
      return;
    }
    const lines = ranked.map((r, i) => `${i + 1}. ${fmtJpy(r.amount)} - [${r.platform}] ${r.title}`);
    await interaction.reply(
      ["【最も稼いだコンテンツ（直近の収益記録から集計）】", ...lines].join("\n")
    );
  },
};

const stop: BotCommand = {
  data: new SlashCommandBuilder().setName("stop").setDescription("自動処理を停止します（現状は手動運用のため参考情報を表示）"),
  async execute(interaction) {
    await interaction.reply(
      "現在のPhaseでは常時稼働する自動処理（スケジューラ）自体が未実装のため、停止対象がありません。個別のテーマは `/approve` を使わず放置すれば投稿されません。"
    );
  },
};

const pause: BotCommand = {
  data: new SlashCommandBuilder().setName("pause").setDescription("一時停止します（現状は手動運用のため参考情報を表示）"),
  async execute(interaction) {
    await interaction.reply(
      "現在のPhaseでは常時稼働する自動処理（スケジューラ）自体が未実装のため、一時停止の概念はありません（Phase9でFULL AUTOを実装する際に対応します）。"
    );
  },
};

export const commands: BotCommand[] = [start, status, report, trends, create, approve, schedule, top, stop, pause];
