This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
   `conversation`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
