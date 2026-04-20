# shadcn Storybook Registry Documentation

This is the documentation directory for the
[shadcn Storybook Registry](https://registry.lloydrichards.dev/) project.

## 📁 Folder Structure

```
docs/
├── README.md                    # This file
├── analyze/                     # Project analysis documents
│   ├── 2025-01-15-comprehensive-analysis.md
│   ├── 2025-01-15-storybook-best-practice-analysis.md
│   └── theme-apply.md
├── guide/                       # Development guides and tutorials
│   └── playwright-mcp-testing.md
├── plan/                        # Task planning documents
│   ├── active/                  # Ongoing tasks
│   │   ├── 2025-01-15-blue-theme-oklch-format-fix.md
│   │   └── 2025-01-15-storybook-figma-integration.md
│   └── complete/                # Completed tasks
│       ├── 2025-01-11-lint-typecheck-fix.md
│       ├── 2025-01-15-best-practice-93-achievement.md
│       ├── 2025-01-15-color-display-and-ref-examples.md
│       ├── 2025-01-15-project-structure-improvement-updated.md
│       ├── 2025-01-15-storybook-best-practice-figma-analysis.md
│       ├── 2025-01-15-storybook-best-practice-figma-independent.md
│       ├── 2025-10-11-storybook-code-improvement.md
│       └── react-18-19-dual-support-complete.md
├── storybook for daive/         # DAIVE-specific Storybook documentation
│   └── 2025-01-15-tailwind-v4-sass-migration-plan.md
├── storybook for vscode/        # VSCode-specific Storybook documentation
│   ├── 01-overview.md
│   ├── 02-constraints.md
│   ├── 03-performance.md
│   ├── 04-security.md
│   ├── 05-workflow.md
│   └── check-list-this-project.md
└── archive/                     # Archived/historical documents
    ├── AGENTS.md
    ├── CHANGELOG.md
    ├── CLAUDE.md
    ├── LICENSE
    ├── component-comparison.md
    └── test-strategy.md
```

## 📖 Document Categories

### `analyze/`

Project analysis and research documents, including:

- Comprehensive project analysis
- Storybook best practices analysis
- Theme system implementation analysis

### `guide/`

Development guides and tutorials for:

- Testing with Playwright and MCP
- Component development workflows
- Registry system usage

### `plan/`

Task planning and tracking documents:

- **`active/`**: Ongoing development tasks
- **`complete/`**: Completed task records with implementation details

### `storybook for daive/`

DAIVE project-specific documentation:

- Tailwind v4 + Sass migration strategies
- Integration plans

### `storybook for vscode/`

VSCode integration documentation:

- Overview and setup
- Constraints and limitations
- Performance optimization
- Security considerations
- Development workflow

### `archive/`

Historical documents no longer actively maintained:

- Old changelogs
- Legacy configuration guides
- Deprecated comparison documents

## 🔍 Finding Documentation

### For Developers

- **Getting started**: See project root `CLAUDE.md` (not in docs/)
- **Task planning**: Check `plan/active/` for ongoing tasks
- **Best practices**: Review `analyze/` for patterns and standards
- **Integration guides**: See `guide/` for specific tools

### For Contributors

- **Development workflow**: `storybook for vscode/05-workflow.md`
- **Project constraints**: `storybook for vscode/02-constraints.md`
- **Performance tips**: `storybook for vscode/03-performance.md`

### For Historical Reference

- **Old documentation**: Check `archive/` for deprecated docs
- **Completed tasks**: See `plan/complete/` for past implementations

## 🔗 Related Documentation

- **Main project README**: `../README.md` (project root)
- **Development guide**: `../CLAUDE.md` (project root)
- **Component registry**: `../registry.json` (project root)

## 📦 Archive Policy

Documents are moved to `archive/` when:

- They are no longer actively maintained
- They represent a specific point in time
- Newer versions exist in the project root
- They are superseded by updated documentation

---

**Last Updated**: 2025-10-13
