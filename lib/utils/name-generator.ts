const adjectives = [
  "聪明的", "快乐的", "勤奋的", "飞翔的", "闪亮的",
  "奔跑的", "沉思的", "温暖的", "灵动的", "优雅的",
  "安静的", "勇敢的", "可爱的", "自由的", "创意的",
];

const nouns = [
  "小码农", "攻城狮", "毕业生", "开发者", "极客",
  "学霸", "研究僧", "程序猿", "代码侠", "架构师",
  "设计师", "梦想家", "探索者", "创造者", "思考者",
];

export function generateNickname(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${adj}${noun}${num}`;
}
