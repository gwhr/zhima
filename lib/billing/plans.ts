export const plans = {
  BASIC: {
    name: "点数包-基础",
    price: 990, // 分
    priceYuan: 9.9,
    points: 12_000,
    description: "适合轻量体验，含基础 AI 生成点数",
  },
  STANDARD: {
    name: "点数包-标准",
    price: 2990,
    priceYuan: 29.9,
    points: 42_000,
    description: "主力推荐，满足日常项目多轮生成与修改",
  },
  PREMIUM: {
    name: "点数包-高阶",
    price: 9990,
    priceYuan: 99.9,
    points: 160_000,
    description: "适合重度使用，覆盖代码/论文高频生成场景",
  },
} as const;

export type PlanType = keyof typeof plans;
