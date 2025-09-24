Epic: Build a Modern SaaS Website with Codex and Shadcn UI

Overview and Goals

In this epic, we will guide Codex (an AI coding assistant) to build a modern SaaS marketing website from scratch. The goal is to use free and open-source tools and libraries exclusively, ensuring high-quality design, smooth animations, and responsive behavior. We will leverage Shadcn UI components for the base design system, Tailwind CSS for styling, and Framer Motion (Motion) for animations – all integrated via Codex's Model Context Protocol (MCP) tools for efficient code generation. By the end, Codex should produce a polished, responsive SaaS landing page with interactive components and animations, similar in quality to premium templates (like Magic UI’s SaaS template) but using only free resources.

Key Objectives:

Free & Open-Source Stack: Use free frameworks (e.g. Next.js/React, Tailwind CSS) and libraries (Shadcn UI, Magic UI, Framer Motion) to avoid any paywalls.

MCP-Enabled Workflow: Configure Codex’s MCP integration so it can pull in UI components and templates from libraries (e.g. Magic UI, Shadcn UI) with minimal errors. This gives Codex “full autonomy” to retrieve needed component code.

High-Quality Design: Achieve a professional, modern UI design on par with paid templates (for example, Magic UI’s SaaS template) by utilizing open-source component kits. We’ll incorporate elements like hero sections, feature grids, pricing tables, and CTAs that are commonly needed for SaaS sites.

Smooth Animations: Implement rich animations and interactive effects (using Framer Motion or pre-built Magic UI effects) to enhance UX. Codex will be guided to produce clean animation code for dynamic, engaging elements (e.g. fade-ins, hover effects, scroll animations).

Responsive & Polished: Ensure the site is fully responsive (mobile-friendly) and polished. Codex will be instructed to use Tailwind’s responsive utilities and best practices so the layout works on all screen sizes. No “diff outputs” – we want complete code files from Codex for each component/section, focusing on building rather than showing patches.

Tools and Setup (Free Tech Stack)

1. Development Framework: We will use React (with Next.js if needed for a quick setup) as the foundation. Next.js provides an easy dev server (npm run dev) and is free/open-source. This gives us a robust environment for building the site.

2. Styling – Tailwind CSS: Install and configure Tailwind CSS for rapid utility-based styling. Tailwind is free and will allow Codex to apply modern, responsive styles without writing custom CSS from scratch. We’ll ensure Codex sets up Tailwind (including a config file and PostCSS) early on.

3. UI Components – Shadcn UI: Leverage shadcn/ui, an open-source component library, for base UI elements (navigation menu, buttons, forms, etc.). Shadcn UI provides 200+ free copy-paste components built with TypeScript, Tailwind, and Radix UI. It’s essentially a collection of accessible, un-styled or minimally styled components that we can integrate and customize. We’ll have Codex use Shadcn UI’s components (via their CLI or copy-pasting from docs) to avoid reinventing common UI patterns. This gives us a solid design foundation without any cost (Shadcn UI is MIT-licensed).

4. Animated Components – Magic UI: For more visually rich sections and effects, we will use Magic UI, a library of animated React components. Magic UI offers 150+ free and open-source animated components and effects built with React, TypeScript, Tailwind CSS, and Motion. It’s a perfect companion to Shadcn UI – we can pull in Magic UI’s pre-built animations (like animated text, backgrounds, or interactive effects) to enhance the site’s look. We’ll only use the free components (since Magic UI’s templates are behind a pro paywall), but that’s fine because the individual components (e.g. animated hero, marquee, etc.) are open-source.

5. Animation Library – Framer Motion: For any custom animations not covered by Magic UI components, we will use Framer Motion (now just called Motion). Framer Motion is a free, production-grade animation library for React that makes it straightforward to create smooth interactive animations. We’ll instruct Codex to utilize Framer Motion’s <motion> components and APIs for things like element fade-ins, slide transitions, and interactive hover animations. This library is robust and open-source, ideal for adding that “wow factor” to our site. (Note: Magic UI’s components themselves are built on Motion, so the two integrate well.)

6. Codex MCP Integration: A crucial part of our workflow is enabling Codex to use these libraries effectively through MCP (Model Context Protocol). MCP allows our AI IDE to fetch and incorporate external code context. We will:

Install Shadcn/MagicUI MCP Servers: Set up the official Shadcn UI MCP server (via shadcn mcp init) and Magic UI’s MCP server (via Magic UI’s CLI) in the dev environment. This gives Codex quick access to component snippets.

Ensure MCP connectivity: After installation, restart Codex so it recognizes the new MCP servers. Test by asking Codex to list available components (e.g. “List Magic UI components”).

Project Planning (Section Breakdown)

Before coding, we map the sections Codex needs to build. This ensures Codex works incrementally, focusing on one part at a time.

Section Plan:

1. Navigation & Hero – Shadcn layout with CTA buttons and hero copy.

2. Feature Grid – Magic UI (e.g. animated icons) or custom cards for four feature callouts.

3. How It Works – Timeline layout; potentially use Magic UI animated timeline.

4. Pricing – Highlight card (Shadcn card with CTA button).

5. Testimonials & Logos – Simple cards/rows (Shadcn cards, Magic UI background effects).

6. CTA Banner + Footer – final call-to-action and basic footer.

We will remind Codex to keep it responsive (stack columns on mobile, etc.).

Responsive Design: Throughout these sections, we will stress that all components must be responsive.

Use Tailwind’s responsive prefixes (like md:flex or sm:text-center) to adapt layouts. For example, the navbar should collapse on mobile, the feature grid should stack in one column on narrow screens, etc.

We’ll test Codex’s output in a mobile viewport. If Codex misses something (like a section not wrapping properly), we will refine by explicitly asking for the fix (e.g., “Make sure the features grid becomes a single column on small screens”).

No fixed pixel widths; use flex, grid, or max-width containers for content so it fluidly adjusts.

By planning these sections and design guidelines up front, Codex will have a clear roadmap to follow.
