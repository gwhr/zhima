export interface ShowcaseProject {
  slug: string;
  title: string;
  summary: string;
  direction: string;
  stackTags: string[];
  highlights: string[];
  statusLabel: string;
}

export const showcaseProjects: ShowcaseProject[] = [
  {
    slug: "student-score-management",
    title: "学生成绩管理系统",
    summary: "面向学校教务场景的多角色管理平台，强调成绩录入、查询统计和预警分析。",
    direction: "管理信息系统 / 教务系统",
    stackTags: ["Spring Boot", "Vue 3", "MySQL"],
    highlights: ["管理员/教师/学生三角色", "成绩统计图表", "学期切换与预警"],
    statusLabel: "案例效果待补充",
  },
  {
    slug: "campus-second-hand-market",
    title: "校园二手交易平台",
    summary: "面向校园场景的商品发布与交易协同项目，适合电商/社区型毕设方向。",
    direction: "电商平台 / 校园社区",
    stackTags: ["Node.js", "Vue 3", "MySQL"],
    highlights: ["商品发布与审核", "订单与留言", "用户信用机制"],
    statusLabel: "案例效果待补充",
  },
  {
    slug: "canteen-order-miniapp",
    title: "食堂订餐小程序",
    summary: "围绕食堂点餐、商户管理和订单履约设计的小程序类毕设案例。",
    direction: "小程序 / 订餐平台",
    stackTags: ["UniApp", "Spring Boot", "MySQL"],
    highlights: ["菜品分类与购物车", "订单状态跟踪", "商户后台"],
    statusLabel: "案例效果待补充",
  },
  {
    slug: "graduation-topic-selection",
    title: "毕业设计选题管理系统",
    summary: "覆盖题目申报、双向选择、审核分配和过程管理的院系管理系统。",
    direction: "教学管理 / 审核流程",
    stackTags: ["Spring Boot", "React", "PostgreSQL"],
    highlights: ["教师题目申报", "学生双向选择", "管理员流程看板"],
    statusLabel: "案例效果待补充",
  },
  {
    slug: "community-health-service",
    title: "社区健康服务平台",
    summary: "适合医疗/民生方向的预约与健康档案管理案例，强调流程闭环与数据看板。",
    direction: "预约系统 / 健康管理",
    stackTags: ["Python", "Vue 3", "MySQL"],
    highlights: ["居民档案管理", "预约排班", "健康随访记录"],
    statusLabel: "案例效果待补充",
  },
  {
    slug: "enterprise-assets-management",
    title: "企业资产管理系统",
    summary: "面向企业内部资产台账、借还流程与维修管理的典型后台项目。",
    direction: "后台管理 / 企业数字化",
    stackTags: ["Spring Boot", "Vue 3", "MySQL"],
    highlights: ["资产入库与盘点", "借还审批", "维修与报废流程"],
    statusLabel: "案例效果待补充",
  },
];
