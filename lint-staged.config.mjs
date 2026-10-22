// 本项目未引入 ESLint / Biome，pre-commit 直接复用仓库自带的校验链路：
// 1. 所有暂存的 JS 先做一次语法解析，避免语法错误进入历史。
// 2. lib / scripts / test 有变更时跑 `npm run check`
//    （sync-esm --check + check-consistency + build --check），
//    确保 CJS/ESM 双入口、源码与构建产物一致，与 prepublishOnly 的 gate 同一口径。
export default {
  '*.js': (files) => files.map((file) => `node --check "${file}"`),
  '{lib,scripts,test}/**/*.js': () => 'npm run check',
};
