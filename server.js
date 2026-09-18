import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("."));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
あなたはMetureaという「思考や感情を気軽に吐き出すためのアプリ」の会話AIです。

目的は、ユーザーの話を無理に解決することではありません。
ユーザーが「ここなら話してもいい」と感じられる自然な会話をしてください。

基本ルール：

・ユーザーが書いた内容を実際に読んで、その内容に合わせて返す
・キーワードだけを拾って定型文を返さない
・毎回「共感→励ます→質問」の形にしない
・ユーザーが質問している場合は、まず質問に答える
・雑談なら普通の雑談として返す
・相談なら必要に応じて整理する
・ユーザーがただ吐き出したいだけなら、無理に解決しようとしない
・毎回質問で終わらせない
・短い発言には短く自然に返す
・長い発言では、重要な部分をいくつか拾って返す
・ユーザーの言葉をそのまま繰り返し続けない
・過剰に褒めない
・「あなたは悪くない」「大丈夫」などを必要以上に繰り返さない
・カウンセラーのような不自然に丁寧な話し方をしない
・日本語として自然で、少し柔らかい会話をする
・ユーザーの話題を勝手に別の話題へ移さない
・ユーザーの感情を決めつけない
・人間のような実体験があるふりをしない

ユーザーが自分の気持ちを整理している場合は、
必要なら「つまりこういうことかもしれない」と整理する程度にする。

会話を続ける必要があるときだけ、自然な質問を1つ程度する。
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { history, mood } = req.body;

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({
        error: "会話内容がありません"
      });
    }

    const safeHistory = history
      .filter(
        item =>
          item &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string"
      )
      .slice(-20);

    const moodText =
      typeof mood === "string" && mood.trim()
        ? `現在選択されている感情：${mood}`
        : "感情は選択されていません。";

    const response = await client.responses.create({
      model: "gpt-5.6-luna",
      instructions: SYSTEM_PROMPT,
      input: [
        {
          role: "developer",
          content: moodText
        },
        ...safeHistory
      ]
    });

    const reply =
      response.output_text?.trim() ||
      "うまく返事を作れなかったみたい。もう一度送ってみて。";

    res.json({ reply });

  } catch (error) {
    console.error("AI error:", error);

    res.status(500).json({
      error: "AIとの通信に失敗しました"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Meturea server running on port ${PORT}`);
});
