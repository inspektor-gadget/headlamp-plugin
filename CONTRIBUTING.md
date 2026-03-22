# Contributing to the Inspektor Gadget Headlamp plugin

Thanks for taking the time to contribute. This document explains how to set up a development environment, run checks before you open a pull request, and what we look for in reviews.

## What this project is

This repository is the official [Headlamp](https://headlamp.dev/) plugin for [Inspektor Gadget](https://inspektor-gadget.io/). It is a TypeScript and React frontend. Local scripts call the `headlamp-plugin` CLI from the [`@kinvolk/headlamp-plugin`](https://www.npmjs.com/package/@kinvolk/headlamp-plugin) package (build, lint, format, tests, and packaging).

## Prerequisites

- **Node.js** - Use a current LTS or newer (the release workflow uses Node 22).
- **npm** - For installing dependencies and running scripts.
- **Headlamp (for local UI testing)** - To exercise the plugin in a real Headlamp session, follow the [Headlamp quickstart](https://github.com/headlamp-k8s/headlamp?tab=readme-ov-file#quickstart) so you have a dev instance running.
- **Kubernetes + Inspektor Gadget (optional)** - For end-to-end testing against real gadgets, install Inspektor Gadget on a cluster per the [project documentation](https://inspektor-gadget.io/docs/latest/quick-start#kubernetes).

## Getting started

1. Fork the repository and clone your fork (or clone directly if you have write access).

2. Install dependencies:

   ```bash
   npm install
   ```

3. For day-to-day UI development with live reload, start Headlamp first, then run:

   ```bash
   npm start
   ```

   This builds the plugin and connects it to your local Headlamp instance. See the [README](README.md#development-local-testing) for details.

## Checks to run before opening a PR

Run these from the repository root so your change matches what maintainers expect:

| Command | Purpose |
|--------|---------|
| `npm run lint` | ESLint (and accessibility rules via jsx-a11y). Use `npm run lint-fix` to auto-fix where possible. |
| `npm run format` | Formatting via the Headlamp plugin toolchain (Prettier config from `@headlamp-k8s/eslint-config`). |
| `npm run tsc` | TypeScript typecheck. |
| `npm test` | [Vitest](https://vitest.dev/) via `headlamp-plugin test`. Add files such as `Something.test.tsx` or `Something.spec.ts` when you introduce or change behavior worth covering. If no matching files exist yet, Vitest exits with “No test files found”. |

Also run `npm run build` when your change touches the build or anything that must ship in `dist/` (including the `main.wasm.gz` copy step in `package.json`). For UI work in isolation, `npm run storybook` is available.

If a command fails, fix the reported issues before submitting. That keeps review focused on your change rather than on tooling noise.

## Pull requests

- **One topic per PR**: Easier to review and revert if needed. If you are fixing a bug and refactoring unrelated code, split into separate PRs when practical.
- **Describe the change**: What problem it solves, how you tested it (e.g. “Headlamp desktop + `npm start`”, “Storybook”, “against cluster X”), and any user-visible behavior changes.
- **Link issues**: If there is an open issue, reference it (e.g. “Fixes #123”) so context stays traceable.

Maintainers may ask for small follow-ups (naming, tests, or UX polish). That is normal; we aim to merge work that fits the plugin and keeps the codebase consistent.

## Questions and problems

- **Bug or feature idea?** Open an issue with steps to reproduce (for bugs) or a short use case (for features).
- **Unclear docs or dev setup?** Open an issue or a PR to improve this file or the README.

Thank you again for helping improve the Inspektor Gadget experience in Headlamp.
