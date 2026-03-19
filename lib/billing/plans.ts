export const plans = {
  BASIC: {
    name: "基础版",
    price: 9900, // 分
    priceYuan: 99,
    description: "适合简单的管理系统类选题",
    features: ["AI 代码生成", "AI 论文生成", "3 次修改机会", "1 次预览"],
    opusBudget: 2,
    modifyLimit: 3,
    previewLimit: 1,
  },
  STANDARD: {
    name: "标准版",
    price: 19900,
    priceYuan: 199,
    description: "适合中等复杂度选题，推荐",
    features: ["AI 代码生成", "AI 论文生成", "10 次修改", "3 次预览", "答辩辅导"],
    opusBudget: 5,
    modifyLimit: 10,
    previewLimit: 3,
  },
  PREMIUM: {
    name: "高级版",
    price: 39900,
    priceYuan: 399,
    description: "适合复杂选题，含全部功能",
    features: ["AI 代码生成", "AI 论文生成", "无限修改", "10 次预览", "答辩辅导", "1v1 问答"],
    opusBudget: 15,
    modifyLimit: 999,
    previewLimit: 10,
  },
} as const;

export type PlanType = keyof typeof plans;
