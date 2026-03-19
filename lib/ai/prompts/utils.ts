export function injectVariables(
  template: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template
  );
}

export function generateRandomFactor(): string {
  const styles = ["简洁注释风格", "详细注释风格", "函数式编程倾向", "面向对象风格", "RESTful 风格"];
  const varNames = ["驼峰命名", "下划线命名"];
  const structures = ["按功能模块分目录", "按层级分目录（MVC）", "扁平目录结构"];

  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  return `代码风格要求：${pick(styles)}，变量命名：${pick(varNames)}，目录结构：${pick(structures)}。`;
}
