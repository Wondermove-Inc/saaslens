<p align="center">
  <a href="https://github.com/Wondermove-Inc/saaslens"><img src="docs/screenshots/hero-banner.svg" alt="saaslens" /></a>
</p>
<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">中文</a>
</p>
<p align="center">
  <strong>开源SaaS支出智能平台。</strong><br/>
  发现未使用的订阅，将付款匹配到应用，管理席位和成本 — 全部自托管。
</p>
<p align="center">
  <a href="https://github.com/Wondermove-Inc/saaslens/actions/workflows/ci.yml"><img src="https://github.com/Wondermove-Inc/saaslens/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/Wondermove-Inc/saaslens/stargazers"><img src="https://img.shields.io/github/stars/Wondermove-Inc/saaslens" alt="GitHub Stars" /></a>
  <a href="https://github.com/Wondermove-Inc/saaslens/graphs/contributors"><img src="https://img.shields.io/github/contributors/Wondermove-Inc/saaslens" alt="Contributors" /></a>
</p>
<p align="center"><a href="#快速开始">快速开始</a> · <a href="#主要功能">主要功能</a> · <a href="docs/guide/">文档</a> · <a href="#路线图">路线图</a> · <a href="CONTRIBUTING.md">贡献</a></p>

---

<p align="center"><sub>如果您觉得saaslens有用，请考虑给它一个<a href="https://github.com/Wondermove-Inc/saaslens">star</a>。这有助于更多人发现这个项目。</sub></p>

https://github.com/user-attachments/assets/47632ce2-cef5-4e8d-90a1-d4c6627099b3

## 为什么选择saaslens

中小型团队通常使用数十种SaaS工具，但没有一个地方能同时回答以下三个问题：

- **我们在为哪些应用付费？**
- **哪些席位仍在使用，哪些未使用？**
- **企业卡上的付款是否真的与这些应用匹配？**

Zylo、Productiv、Cleanspend等商业工具可以解决，但它们锁定数据并按席位收费。

**saaslens**是开源替代方案。将支付流与SaaS应用匹配，跟踪席位利用率，发现未使用席位和异常支出 — 全部**自托管**，**数据保留在您的基础设施上**。

## 主要功能

<table>
<tr><td width="50%">

### 订阅和应用清单

维护组织使用的每个SaaS应用的单一信息源。通过支付流、SSO和浏览器扩展自动发现应用。

</td><td width="50%">

### 付款-应用匹配

自动将企业卡和ERP付款明细与已知SaaS应用匹配。支持区域预设（如韩国发卡机构）。

</td></tr>
<tr><td width="50%">

### 席位和使用跟踪

跟踪谁有权访问什么。识别离职员工的未使用席位，在下一个计费周期前回收许可证。

</td><td width="50%">

### 部门成本分析

按部门、团队或成本中心分析SaaS支出。发现趋势，标记异常，生成财务审查报告。

</td></tr>
<tr><td width="50%">

### 浏览器扩展

被动捕获SaaS登录活动的可选Chrome扩展。发现影子IT — 通过个人卡支付且未集中跟踪的应用。

</td><td width="50%">

### AI驱动洞察

分析SaaS组合并推荐优化的内置AI代理：整合重叠工具、重新谈判合同或回收未使用席位。

</td></tr>
</table>

<p align="center"><img src="docs/screenshots/subscriptions.png" alt="saaslens 订阅管理" width="800" /><br/><sub>包含付款匹配和席位跟踪的订阅管理</sub></p>
<p align="center"><img src="docs/screenshots/cost-analytics.png" alt="saaslens 成本分析" width="800" /><br/><sub>异常检测和成本分布分析</sub></p>

## 工作原理

<p align="center"><img src="docs/screenshots/architecture.svg" alt="saaslens 架构" width="800" /></p>

1. **支付采集** — 通过CSV/ERP导入或银行/卡连接器。
2. **使用捕获** — Google Workspace SSO、Chrome扩展或手动输入。
3. **对账** — 将支付、席位和部门统一到一个规范模型中 — 从第一天起多租户。
4. **行动** — 从仪表板标记未使用应用、回收席位，或向AI代理请求建议。

## 竞争对比

| 功能       | saaslens |  Zylo  | Productiv | Cleanspend |
| ---------- | :------: | :----: | :-------: | :--------: |
| 开源       |  **是**  |   否   |    否     |     否     |
| 自托管     |  **是**  |   否   |    否     |     否     |
| 数据所有权 | **100%** | 供应商 |  供应商   |   供应商   |
| 付款匹配   |  **是**  |   是   |   有限    |     是     |
| 席位跟踪   |  **是**  |   是   |    是     |     否     |
| AI推荐     |  **是**  |   是   |    是     |     否     |
| 按席位定价 | **免费** |  $$$   |    $$$    |     $$     |

## 技术栈

| 层级 | 技术                                            |
| ---- | ----------------------------------------------- |
| 前端 | Next.js 15 (App Router) + React 19 + TypeScript |
| UI   | Shadcn/ui + Radix + Tailwind CSS 4              |
| 数据 | Refine 5 + TanStack React Query/Table           |
| 认证 | NextAuth 5 + Prisma Adapter                     |
| ORM  | Prisma 6 / PostgreSQL                           |
| AI   | Anthropic AI SDK + Vercel AI SDK                |
| 缓存 | Upstash Redis                                   |

## 快速开始

### 选项A：Docker（推荐）

```bash
git clone https://github.com/Wondermove-Inc/saaslens.git && cd saaslens
docker compose up -d
# → http://localhost:3000
```

### 选项B：本地（Node.js 20+、PostgreSQL 14+）

```bash
git clone https://github.com/Wondermove-Inc/saaslens.git && cd saaslens
npm install --legacy-peer-deps  # React 19 peer dep兼容性。不影响功能。
cp .env.example .env.local      # 设置 DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npx prisma migrate deploy && npx prisma generate
npm run dev                     # → http://localhost:3000
```

## 路线图

- [ ] **v0.1** — 首次公开发布（2026年Q2）
- [ ] **v0.2** — 支付集成插件系统（2026年Q3）
- [ ] **v0.3** — 自托管Docker Compose快速启动（2026年Q3）
- [ ] **v1.0** — 稳定API、多语言支持扩展（2026年Q4）

有想法？[开启Discussion](../../discussions)。

## 社区

- [GitHub Discussions](../../discussions) — 提问和分享想法
- [GitHub Issues](../../issues) — 报告Bug和功能请求
- [CONTRIBUTING.md](CONTRIBUTING.md) — 如何贡献

## 许可证

MIT © 2026 Wondermove-Inc. 参见[LICENSE](LICENSE)。
