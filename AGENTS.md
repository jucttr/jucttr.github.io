# AGENTS.md

Astro 7.3 静态博客（主题 Kanade），三语（zh-CN / en / ja），Vue 岛屿 + Tailwind CSS 4，`output: "static"`，无后端。

## 命令

- 安装依赖：`pnpm install`（CI 用 `pnpm install --frozen-lockfile`）
- 本地开发：`pnpm dev`
- 类型检查：`pnpm check`（astro sync + astro check + vue-tsc）
- 构建：`pnpm build`（内部先跑 check）
- 端到端测试：`pnpm test`（先构建，再自行拉起 `127.0.0.1:4173` 预览）
- 只跑测试：`pnpm test:e2e`（不重新构建，要求 dist 已是新的）
- 格式化：`pnpm format` / 校验 `pnpm format:check`
- 首次跑浏览器测试前：`pnpm exec playwright install chromium`

**完成判据**：`pnpm format:check && pnpm build` 全绿。动了页面、组件或样式就补跑 `pnpm test`。

## 红线

- 只用 pnpm，不要用 npm / yarn。`engines` 锁 pnpm 10.33.0、node >= 22.12（推荐 24）。
- 不要手改 `dist/` 和 `.astro/`：都是生成物，已 gitignore。
- 不要把 `SITE_URL` 留成默认的 `http://localhost:4321` 就部署——canonical、Open Graph、RSS、sitemap 全部取自它。默认值仅供本地开发。
- 不要把子路径写进 `SITE_URL`：它必须是无路径的域名根地址，构建时会校验并直接报错。子路径部署改用 `SITE_BASE`，例如 GitHub Pages 的 `/blog`。
- 不要把 TypeScript 升到 7：`@astrojs/check@0.9.10` 的 peer 只支持 `^5 || ^6`。
- 不要删 `pnpm.overrides` 里的 `postcss-selector-parser@^7.1.6`：那是 `@tailwindcss/typography` 已知漏洞的临时覆盖，等上游发修复版才能移除。
- 不要提交 `.env`。`SITE_URL` 和 `PUBLIC_SITE_LANGUAGE` 走环境变量，参考 `.env.example`。
- 不要写只有开 JavaScript 才能读到的正文：关闭 JS 仍要能从首页打开所有文章，这是测试项。
- 站内链接一律带尾斜杠：`trailingSlash: "always"`，漏了就是 404 或重定向。

## 内容约定

- 新文章的 frontmatter 由 `src/content.config.ts` 的 zod schema 硬校验：`title`、`description`、`category`、`tags`、`cover` 缺一个就构建失败。
- `category` 只能是 `frontend` / `notes` / `life`，`cover` 只能是 9 个预设名。枚举统一定义在 `src/data/post-options.ts`，要扩先改那里，不要在 frontmatter 里写中文分类。
- 只有 `lang` 与站点语言一致、且 `draft: false` 的文章会发布。**缺翻译不会回退到中文**，只会不显示。
- 语言目录前缀不进 URL：`en/foo.md` 与 `foo.md` 都产出 `/posts/foo/`，同一语言下文件名不要重复。
- 新增界面文案要同时补齐 `src/i18n/` 三份字典的同一个 key；类型以 `zh-CN.json` 为准，少一个就编译失败。
- 新图标前缀必须先装对应的 `@iconify-json/{prefix}`：项目只装了当前用到的 8 个集，未安装的前缀不会渲染。

## 路由：什么时候去读别的文件

| 你要做的事                                             | 去读                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| 写文章、查 frontmatter 字段全表                        | `README_backup.md` → 文章写作                                |
| 改站点名、作者、导航、显示语言                         | `src/site.config.json` + `src/i18n/`                         |
| 升级依赖、想知道某处为何这样写                         | `docs/astro-7.3-audit.md`                                    |
| 部署（Docker / nginx / Netlify）                       | `README_backup.md` → 部署指南                                |
| GitHub Pages 与 `SITE_BASE`                            | `README_backup.md` → GitHub Pages 部署                       |
| 增删分类、封面、标签枚举                               | `src/data/post-options.ts`                                   |
| 改文章列表、排序、阅读时间逻辑                         | `src/lib/posts.ts`                                           |
