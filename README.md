## The steps taken to setup the project

1. pnpm create next-app@latest kbm <!-- accept default choices -->
1. cd kbm <!-- add ai-sdk -->
1. pnpm add ai @ai-sdk/react zod <!-- freeze node version for fnm, write node version in .node-version file -->
1. node --version > .node-version
1. add below configs to package.json

   ```json
   "engines": {
       "node": "24.20.0",
       "pnpm": "12.3.4"
   },
   "packageManager": "pnpm@12.3.4"
   ```

1. pnpm dlx shadcn@latest init --preset b7C9v3ZEu --template next --pointer <-- install shadcn in the project with preset as in the install command and default Base UI (Icon library - phospor icons)>
1. Create github repo on logintotrystuff@gmail.com account (without readme, license, and .gitignore)
1. Initialize git in the local repo.
1. add git remote as the repo created above
   ```pwsh
   git remote add origin https://github.com/na-lovable/kbm.git
   ```
1. git push to the github repo
   ```pwsh
   git push -u origin main
   ```
1. Install the required backend libraries for this knowledge base management project
   1. `dotenv` and `dotenv-expand` for environment variables management

      ```bash
      pnpm add dotenv dotenv-expand
      ```

   1. `openrouter` provider for `ai-sdk`
      ```bash
      pnpm add @openrouter/ai-sdk-provider
      ```

1. Install frontend libraries
   1. `gray-matter`
   2. `react-markdown` React component to render markdown.
      ```bash
      pnpm add react-markdown
      ```
   3. `rehype-raw`
   4. `mermaid`
   5. `@xyflow/react` graph visualizer for react
      ```pwsh
      pnpm add @xyflow/react
      ```
   6. `hh`
1. Copy application code files and update imports
1. Add the required `ui` components from `shadcn`
   ```bash
   pnpm dlx shadcn@latest add [component]
   ```
   `tooltip` `alert` `badge` `label` `scroll-area` `popover` `alert-dialog` `resizable`
   `collapsible` `tabs`
1. Add the required `ai-elements` components using shadcn CLI
   ```bash
   pnpm dlx shadcn@latest add @ai-elements/[component]
   ```
   `conversation` `message` `prompt-input` `shimmer`

## Project Progress

1. Initial developemnt with basic working app
2. Create branch knowledge

## Prompt for moving knowledge base to github

- I'm using OpenCode
- Prompts

1. Intial prompt
   > This web app built on nextjs and ai-sdk from vercel perform different file read write operations on the knowledge concept files stored as markdown files in a folder in the local repository. Now, the app is deployed on vercel. But, to perform crud operations on the files an editable file storage is required. Also, the app need to track the changes made to files. That is why I have decided to keep files on github so that the app can crud on the files and at the same time versions of files can be maintained. Before it is implemented, your task is to make plan for moving the file storage to a github repo from the current static files.
1. Follow-up prompt to sum things up
   > I have tested the functionalities added in the local run. Things are working fine. I want to save the steps we have taken to move the knowledge base to a github repo so that anyone else can understand the development of the project. Append them to this readme file at appropriate location.

## Steps to migrate knowledge base to github

**Approach:** `@octokit/rest` with a separate repo (`na-lovable/kbm-knowledge-base`), fine-grained PAT auth, read-through/write-through sync, and Git Data API for atomic batch commits.

**New files:**
- `lib/github/file-store.ts` — Octokit wrapper (`listFiles`, `readFile`, `writeFile`, `deleteFile`, `renameFile`, `batchCommit`, `getFileHistory`, `healthCheck`)
- `lib/github/index-manager.ts` — Index management (`readIndex`, `writeIndex`, `rebuildAllIndexes`, `appendToLog`)
- `scripts/migrate-to-github.ts` — One-time migration script

**Refactored (fs → GitHub API):** `knowledge-engine.ts`, `knowledge-writer.ts`, `knowledge-linter.ts`, `env.ts`, `app/page.tsx`

**Unchanged:** `knowledge-actions.ts`, `lib/tools/*.ts`, `app/api/chat/route.ts`, `use-knowledge-graph.ts`, `draft-storage.ts`, all UI components — they call the same core functions.

**Environment variables** (add to `.env` and Vercel):
```
GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_REPO_BRANCH
```

**Migration steps:**
1. Created repo `na-lovable/kbm-knowledge-base` and a fine-grained PAT with `Contents: Read and write`
2. Installed `@octokit/rest` and `tsx` (dev)
3. Built `file-store.ts` and `index-manager.ts`
4. Refactored the three core modules to use GitHub API instead of `fs`
5. Ran `pnpm tsx scripts/migrate-to-github.ts` — **29/29 files** migrated, **7 indexes** rebuilt
6. Verified all CRUD operations via UI and AI chat interface

**Data flow:** UI/AI tools → `knowledge-actions.ts` → `knowledge-engine.ts` / `knowledge-writer.ts` → `file-store.ts` → GitHub API. Every write creates a Git commit; `log.md` tracks app-level operations.
