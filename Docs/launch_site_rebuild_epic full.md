Epic: Plumbing Agent Marketing Website (One-Page Landing)

This epic outlines the implementation of a fast, one-page marketing site for Plumbing Agent, a SaaS product targeting Dutch plumbers. The site will be built with our in-house stack (Next.js App Router, TailwindCSS, ShadCN UI, Magic UI) and follow simplicity-first landing page best practices. It must support Dutch and English (with Dutch as the primary locale) and deliver a smooth, responsive user experience that showcases the product’s value. The work is broken down into slices (S0–S4) with objectives, scope, and acceptance criteria for each.

S0 — Project Setup & Localization

📌 Objective: Initialize the Next.js 15 project with the required tech stack and establish internationalization (i18n) support for Dutch (nl) and English (en). Ensure all baseline configuration (Tailwind, ShadCN UI, Magic UI, etc.) is in place so development can proceed smoothly with server-first rendering and localized content.

📂 Scope:
CREATE:

package.json – Add dependencies: Next.js 15, next-intl for i18n, Tailwind CSS, shadcn/ui components, magic-ui animations, framer-motion, @headlessui/react, react-wrap-balancer, tailwind-variants, @radix-ui/react-scroll-area.

next.config.js – Configure Next.js with the next-intl plugin and define supported locales (nl, en) and default locale (nl)
next-intl.dev
. Enable App Router features (e.g., server components, edge runtime if appropriate).

app/[locale]/layout.tsx – Root layout component wrapping the app. Use <html lang={locale}> and include <NextIntlClientProvider> for i18n
next-intl.dev
next-intl.dev
. Set up a basic <body> with global Tailwind classes (e.g., min-h-screen bg-white text-gray-900 antialiased). This will serve as the shell for all page content.

app/[locale]/page.tsx – Homepage component for each locale. It will import and compose the sections (hero, features, CTA, etc.), using translations for text. For now, include placeholder content or import actual components as they are built.

messages/nl.json, messages/en.json – Translation files with keys for all text strings used in the site (hero title, feature headings, etc.). These will be filled with draft copy (see Content section).

tailwind.config.js – Tailwind configuration enabling TailwindCSS with our design tokens. Include ShadCN preset (if provided) and Magic UI if required. Configure motion-safe variants (default in Tailwind) for animations and any custom green gradient values.

postcss.config.js – PostCSS setup for Tailwind.

globals.css – Import Tailwind base styles (Tailwind preflight) and define any global styles (e.g., scroll-smooth behavior, font imports, body/font sizing). Possibly define the green gradient here as a CSS custom property or Tailwind utility.

EDIT:

README.md – Document setup instructions (how to run, how to add translations).

.eslintrc.json or similar – Ensure lint rules align with Next.js and our conventions.

.prettierrc – Code style if not already in place.

DON'T TOUCH:

Any backend or database code – this is a purely static marketing site (no user auth or data fetching needed).

No analytics/monitoring scripts – per requirements, skip adding Google Analytics or Sentry at this stage.

⚙️ Commands:

Use Create Next App with the latest version to bootstrap (pnpm create next-app@latest). Remove example boilerplate code.

Install and run ShadCN UI CLI to add components (if using their CLI) or set up the shadcn/ui according to docs (generate a components/ui folder with needed primitives).

Run pnpm install next-intl tailwindcss @headlessui/react framer-motion @radix-ui/react-scroll-area react-wrap-balancer tailwind-variants (and related types) to add libraries. Initialize Tailwind config (npx tailwindcss init -p).

Run pnpm shadcn-ui add accordion alert ... (as needed for any base components we anticipate, e.g., maybe add button, popover if required) – this will generate component files in the project.

Verify i18n: run pnpm dev and navigate to /en and /nl routes. They should load the same page with different locale (even if content is the same initially). Use a temporary text in messages/*.json to confirm the useTranslations hook works in a page component
next-intl.dev
.

Tailwind: Add the content paths in tailwind.config (including ./app/**/*.{js,ts,jsx,tsx} and any components paths). Enable JIT. Start the dev server to ensure Tailwind builds without errors and the basic page is styled.

Localization: Use next-intl’s example to link locale from request (could use top-level [locale] segment as created, which next-intl will use by default)
next-intl.dev
. Test switching locale by changing the URL.

🚨 Escalate:

If next-intl locale routing is not working as expected (e.g., pages not found under /nl), confirm the Next.js plugin setup in next.config.js
next-intl.dev
 and that the default locale is set. Escalate if unique pathname routing presents issues (maybe consider alternate approach like domain-based locales or a language switcher control).

Any conflicts or bugs from using shadcn/ui with Next 15 – check for compatibility with React 19 and Tailwind v4 (shadcn might need tweaks for App Router). If ShadCN’s setup script fails or components missing (like no built-in popover), decide whether to fallback to Headless UI or Radix for those components.

Performance concerns on initial load: If adding libraries (e.g., framer-motion, Calendly script later) significantly increases bundle size, consider code-splitting or loading some scripts only when needed. Raise this if the out-of-the-box performance (Lighthouse score) is below expectations for an empty page.

Styling issues: If the green gradient design or other style tokens aren’t easily replicable with Tailwind utility classes, consider adding custom CSS or Tailwind plugin. Escalate to design if the gradient spec is unclear. (The gradient should likely match Mintlify/Make.com style in hue and angle).

🔐 Rules:

Use Server Components by default for all static content sections (Next.js App Router best practice) to optimize performance and SEO. Only use Client Components for interactive parts (e.g., a language switch dropdown or the Calendly modal trigger if needed).

Keep dependencies lean: aside from the listed libraries, do not add others without review. The focus is simplicity and performance (each extra script can affect load times).

The site must be fully localized – all user-facing text goes through the i18n system. Do not hard-code strings in components; use translation keys and provide both Dutch and English text in JSON.

Accessibility from the start: Set HTML lang attribute properly for each locale
next-intl.dev
. Favor semantic elements (use <header>, <main>, <section>, <footer> appropriately) for better screen reader navigation.

Use TailwindCSS as much as possible for styling consistency. Utilize our design tokens (if any) or Tailwind’s default spacing/color scale for a cohesive look. Avoid inline styles.

Employ Tailwind Variants for any component that requires style variants (like Button size/color). This avoids repeated utility classes and keeps components consistent
tailwind-variants.org
. For example, define a Button variant for primary vs secondary style instead of manually toggling classes
tailwind-variants.org
tailwind-variants.org
.

All design should follow a mobile-first approach. Use responsive Tailwind utilities (e.g., md:text-xl) to scale up for larger screens, ensuring the default (no prefix) is optimized for mobile.

Set up the green gradient theme early: either via Tailwind config or CSS, define the gradient (e.g., from a teal-green to blue-green as in Mintlify/Make). This will be used in the hero section background. Gradients are a modern design trend that add depth and guide user attention
landingpageflow.com
, so implementing it correctly is key.

No data fetching is needed (the site is static), so disable or remove any unused API routes or example code from the Next.js template. This keeps the bundle smaller and the project simpler.

📋 Acceptance Criteria:

Environment Ready: The application runs locally without errors. Both /nl and /en routes render the homepage, and the locale can be switched by changing the URL (later via a UI toggle). Text from the JSON files is displayed via the translation hook (e.g., a sample title appears in the correct language).

Dependencies & Config: All required libraries are installed and configured. Tailwind builds correctly (no missing class issues), and ShadCN UI components can be added (verify by rendering a simple <Button> component from shadcn to ensure styles apply). Magic UI components are available to import (verify by importing one simple effect component, though not necessarily used yet).

Core Web Vitals (Initial): The blank starter page should load fast and score high on performance. With essentially no content, the Largest Contentful Paint (LCP) should be well under ~1s, Cumulative Layout Shift (CLS) ~0, and no significant console errors. The base setup introduces no blocking scripts.

Localization Structure: The project structure uses a locale-aware routing (with [locale] segment or equivalent) such that each language has a unique URL structure (e.g., /nl for Dutch homepage, /en for English)
next-intl.dev
. There is a clear default locale (Dutch) and fallback to English if needed. The approach should be compatible with Next.js 15 routing.

No Regressions: Linting (pnpm lint) and type-checking (pnpm typecheck) pass for the base project. The integration of next-intl and other libraries does not produce TypeScript errors. Any ESLint rules about unused vars or imports are satisfied by cleaning the boilerplate.

S1 — Layout & Navigation Shell

📌 Objective: Implement the overall page structure including a persistent navigation bar (for logo/branding and language switcher) and a consistent footer. This slice establishes the skeleton that wraps all content sections, ensuring that global elements (header, footer) are responsive and accessible. It also sets the stage for visual style (colors, fonts) and introduces the Dutch/English toggle for users.

📂 Scope:
CREATE:

components/NavBar.tsx – A responsive navigation bar component. Contains the product logo or name (left) and primary call-to-action and language switch (right). For simplicity, include a “Book Demo” button in the nav (which triggers the Calendly modal) and a locale toggle (could be a simple dropdown or two-button toggle for NL/EN). Use Headless UI’s <Menu> or <Listbox> for an accessible dropdown if needed (for example, a globe icon that opens language options) – ensure it’s keyboard navigable out of the box. The nav should have a transparent or light background overlaying the hero (design to be refined), and then become a solid color or sticky on scroll if needed (to be decided in scroll behavior).

components/Footer.tsx – A simple footer with minimal content: e.g., © 2025 Plumbing Agent, contact email or placeholder. Keep it low-profile to avoid distraction. Possibly include links like “Privacy Policy” or “Terms” (can be empty or # for now if content not available). Use semantic <footer> tag.

components/LanguageSwitcher.tsx – (Optional if not in NavBar directly) A small component that uses next-intl’s hooks to change locale. If a dropdown, use HeadlessUI <Listbox> to list “Nederlands” and “English”. Changing selection triggers a route change to the corresponding locale’s page (e.g., via Next router push or by constructing the URL). This component should only appear if both locales are available (always true here). On mobile, ensure it’s easily reachable (perhaps integrated into a hamburger menu if we had one, but since the site is one page, a full hamburger menu may be overkill; we might just show the two-letter language code buttons).

public/logo.png (or SVG) – Placeholder for the Plumbing Agent logo in the nav. Use a simple text if logo not ready (e.g., the brand name in a bold Tailwind font). The nav design should emphasize the company name clearly for branding.

EDIT:

app/[locale]/layout.tsx – Integrate <NavBar /> at the top and <Footer /> at bottom of the layout. The layout should wrap the children with these global components. Also add a <main> wrapper with appropriate styles (e.g., min-h-screen flex flex-col items-center) depending on design. The main container can be used to center the content and apply background if needed.

tailwind.config.js – Add any needed theme extensions (colors, font family). For example, define a brand green color if provided by design. Also, configure Tailwind’s fontFamily for headings (if a specific font is chosen) or use a system sans-serif for now. Possibly include container plugin or set default breakpoints if using Tailwind’s container class for content width.

globals.css – If not already done, import a webfont for the site if desired (e.g., an open-source font that fits – not specified, but ensure it’s legible). Also, define base styles for <a> links (hover underline or color), and set scroll-behavior: smooth globally for anchor links (if the nav will scroll to sections).

DON'T TOUCH:

Calendly script integration yet (it will be added in CTA slice). For now, the “Book Demo” nav button can be a placeholder that will later trigger the modal.

No heavy styling of sections content here – focus on nav and footer only.

Don’t implement a mobile menu with show/hide items since it’s a one-page site; the nav content is minimal (just a button and maybe language switch). It should collapse nicely on small screens (e.g., logo left, button and toggle icons shrink or stack). If needed, use a simple icon button for language on small screens.

⚙️ Commands:

Run pnpm dev and test the layout in a browser for both locales. Manually toggle the locale (if LanguageSwitcher is ready) or navigate to /en or /nl to see that NavBar and Footer show appropriately and the content area in between is rendering (even if placeholder).

Test responsiveness: use browser dev tools to emulate mobile width. Adjust the NavBar CSS (Tailwind classes) so that at small widths the layout still works (e.g., perhaps stack the language toggle below the demo button or use smaller text). Tailwind’s utility classes (like flex-col on sm: breakpoints if needed) will be used here.

Validate accessibility: using keyboard only, focus on the language switcher and demo button. Ensure you can open the dropdown with Enter/Space and change selection (Headless UI should handle focus management). Use Chrome a11y devtools or Lighthouse to scan for obvious issues (like missing alt on logo image, which should have alt text).

Check the <html lang> attribute is correctly set by layout for each locale (view page source to confirm <html lang="nl"> for Dutch, etc.). This is critical for SEO and accessibility.

If available, use a screen reader (VoiceOver/NVDA) to navigate the nav: it should announce the language menu and the demo button clearly (use aria-label on the language icon if it’s just a flag or icon).

🚨 Escalate:

If the language switching via next-intl is not straightforward (e.g., needs a reload vs. seamless), consider using a simple link to the other locale’s URL as a temporary measure. Escalate if a more complex solution (like cookies for locale) is needed beyond our timeline.

Any layout shift caused by the NavBar when the page loads (e.g., if the NavBar appears after content). Ideally, the NavBar is part of the initial HTML from SSR, so there should be no shift. If you notice layout jumping, ensure any images (like logo) have explicit width/height or use Next <Image> with priority for the logo to avoid CLS
patterns.dev
. Escalate if issues persist.

If the green gradient background for hero conflicts with having a transparent NavBar (e.g., white text logo might be hard to read on certain gradient positions), escalate to design for guidance (maybe add a subtle shadow behind nav text, or make nav a solid color on scroll).

Cross-browser issues: test the layout on modern Chrome, Firefox, Safari. If the sticky or positioning of the nav behaves inconsistently (especially iOS Safari with backdrop-filter or such if we use it), raise it. For now we may keep nav simple without advanced effects.

If additional links or sections are requested in nav (e.g., anchor links to “Features”), confirm with product if needed. We currently assume minimal nav, but if content grows, might need a collapsible mobile menu. Escalate scope change if so.

🔐 Rules:

The NavBar should use a semantic <header> element for accessibility (it’s the page header). Inside, use <nav> for the navigation area and list items if we had multiple links (not many here, but the structure is still <nav role="navigation">). This helps screen readers identify it as the site navigation.

Touch targets: All interactive elements in nav/footer must be easy to tap on mobile. Use at least py-2 px-4 (around 44px) for the clickable area of the “Book Demo” button and the language toggle
accessibilitychecker.org
. Even if an icon is used, wrap it in a button with adequate padding.

Ensure keyboard focus visibility: Tailwind resets often remove default focus outlines. Reintroduce a visible focus style (e.g., add focus:outline-none focus:ring-2 focus:ring-green-500 on buttons) to meet a11y guidelines. Users tabbing through nav should see where they are.

Sticky behavior: If decided to keep the NavBar on top during scroll, use CSS position: sticky; top: 0 on the header, instead of JavaScript, for optimal performance
motion.dev
. This keeps the nav visible without jank and is supported across modern browsers. If not sticky, ensure the nav remains at top of page only.

Use the brand’s green gradient or color sparingly in nav: possibly the “Book Demo” button can have the green gradient background for emphasis. Make sure contrast with white text meets WCAG AA (if using light green, might need dark text or a darker outline) – aim for a contrast ratio > 4.5:1 for text on buttons.

Footer text should also meet contrast guidelines (likely just dark text on white or light on dark if we invert it). Use <footer> tag and keep content minimal to avoid distraction.

No external scripts in nav: avoid any tracking pixels or external fonts that aren’t absolutely necessary. If a custom font is needed, use next/font to optimize loading (it can inline the font CSS and avoid layout shift)
patterns.dev
. Otherwise, system fonts are acceptable for performance.

The navigation and footer should be consistent across locales – ensure any text in them is localized (e.g., if the footer had “Contact Us”, translate it). The language switch itself should indicate the languages in their own language (“Nederlands” / “English” rather than “Dutch” when in Dutch locale).

📋 Acceptance Criteria:

Responsive Nav & Footer: On a desktop viewport, the header displays the logo, the demo button, and language selector clearly. On a narrow mobile screen (~375px width), the elements reflow appropriately (e.g., maybe the language toggle icon is next to the demo button or the texts become icons) without overflowing or horizontal scrolling. There is no overlap of elements and the content is still identifiable.

Accessible Interaction: Using only the keyboard, a user can focus and activate the “Book Demo” button and change the language. The language dropdown (if implemented) can be opened with Enter and each option can be selected with arrow keys/Enter, and it closes on selection. Focus returns logically (to the next element). Screen reader announces the menu and options (e.g., “Navigation, Language, menu collapsed, press Enter to expand” or similar from Headless UI’s ARIA attributes).

Localization Behavior: Switching locale via the UI immediately shows nav and footer texts in the new language (e.g., “Boek een demo” vs “Book a demo” on the button). The page does not reload completely (if using router push) or does so gracefully. The URL updates to the new locale. There are <link rel="alternate" hreflang="x"> tags in the head (provided by next-intl automatically or we will add later for SEO) so that search engines know about both languages.

Visual Consistency: The NavBar and Footer match the design style. The NavBar text (logo and buttons) is clearly visible over the hero background (if overlapping). If a gradient background is behind it, text has sufficient contrast or a subtle shadow. The footer is unobtrusive but present at the very bottom, anchored after all content. No huge empty space above/below it.

No Console Errors: There are no errors or warnings related to layout, e.g., no Next.js hydration errors for the NavBar or language switch. Using the language switch doesn’t produce 404s or state errors.

Quality Checks: Lint and type checks still pass after adding nav components. All props (like for Headless UI components) are correctly typed. Run pnpm check (assuming it runs build + typecheck) and ensure 0 errors. Also, run pnpm build to ensure the project compiles in production mode without issues (important before deployment).

S2 — Hero Section & Product Visuals

📌 Objective: Create a striking hero section that immediately grabs attention with a green-gradient background, a concise value proposition headline, supporting subtitle, and a strong call-to-action. The hero should visually showcase the product, e.g., with an iPhone and desktop mockup of the Plumbing Agent app UI side-by-side, conveying that the solution works on mobile and desktop. This section sets the tone for the site, so it must have sharp contrast, modern styling, and smooth performance (no janky animations).

📂 Scope:
CREATE:

components/HeroSection.tsx – Hero section component containing:

A background element with the green gradient (e.g., a full-width div with bg-gradient-to-br from-green-400 via-green-500 to-teal-500 or custom colors to mimic Mintlify/Make style). The gradient should be centered/focused to draw the eye behind the headline (consider using a radial gradient or angled linear gradient for effect).

A headline <h1> displaying the product tagline (localized via i18n). Use React Wrap Balancer on this text to prevent awkward line breaks and ensure a visually balanced appearance on different screen sizes
github.com
 (avoid a single word on its own line, etc.). The heading should be large and bold (e.g., text-4xl md:text-5xl font-extrabold) and in a color with high contrast against the gradient (likely white or very light gray).

A subheading <p> or <h2> for one sentence of support text, slightly smaller (text-lg or xl) that highlights the main value proposition in more detail (also localized).

CTA buttons: The primary CTA is “Book a Demo” which will open the Calendly modal. This can be a prominent button styled with the green gradient or a bright accent color. Also consider a secondary CTA for users on mobile: a “WhatsApp Chat” button (visible on mobile viewports) that deep-links to WhatsApp chat. For desktop, the WhatsApp option could be less prominent (maybe just an icon or in the footer), but on mobile, it can be shown as a second button. Use the WhatsApp icon with accessible label. The WhatsApp link should use the wa.me deep link format with the company number
faq.whatsapp.com
. (We will insert the actual number and a default message like “Hello, I’d like to learn more about Plumbing Agent.” via the text query param).

Mockup images: an image of a smartphone showing the app and an image of a desktop screen showing the web app. For now, use placeholders (like a device frame with a dummy screenshot) if actual designs are not ready. These images should be optimized using Next.js <Image> component for responsive loading
patterns.dev
. Place them to the right of the text on desktop (classic two-column layout) and above or below text on mobile (stacked). Possibly use an overlapping layout (e.g., phone slightly overlapping laptop) for a dynamic feel. Ensure alt text is provided (e.g., “Screenshot of Plumbing Agent app on phone and desktop”).

public/hero-phone.png & public/hero-desktop.png – Placeholder image files for the mockups (to be replaced with real screenshots when available). Use moderately sized images (e.g., ~100KB each) and modern format (WebP/AVIF) to keep load fast. If real designs are not available, create simple mock graphics (even a solid color with “App UI here” text) just to have something to show structure.

components/Button.tsx – A reusable button component (if not already made via ShadCN UI). Style it using Tailwind and/or ShadCN’s variant system. Support variants for “primary” (e.g., filled green gradient) and “secondary” (e.g., outline or subtle). This can be used for the CTA and any other buttons. Ensure it has motion-safe:hover:scale-105 transition etc. for a nice hover effect that respects reduced motion preferences
epicweb.dev
.

EDIT:

app/[locale]/page.tsx – Import and include <HeroSection /> at the top of the homepage (below the NavBar). Pass in or retrieve necessary props, such as localized strings for headline and subheadline (could use useTranslations('HomePage') inside HeroSection too). Also import any images via Next’s dynamic import if needed for optimization.

messages/en.json & messages/nl.json – Add keys for the hero text, e.g., heroTitle, heroSubtitle, and maybe CTA text. Fill with the copy from the Content suggestions (e.g., English: “The simplest way to run your plumbing business.” Dutch: “De eenvoudigste manier om uw loodgietersbedrijf te runnen.”). Do the same for heroSubtitle (a one-liner pitch) and CTA labels (“Book a demo” / “Boek een demo”).

components/NavBar.tsx – If the “Book Demo” button was placed here, ensure it scrolls to or triggers the Hero CTA properly. However, more likely the hero itself contains the primary CTA button (duplicate of nav’s if nav also has one). We might remove the nav CTA if it’s redundant with hero (or nav CTA could be an anchor link to hero section). Decide to avoid duplication: perhaps NavBar’s button is simply an anchor to the #hero’s button or opens the same modal directly. Keep consistency in labeling.

Styling: Adjust global styles if needed for the hero. For example, ensure body or main has no extra margin that would disrupt a full-bleed hero. Possibly add h-hero custom height for hero (e.g., min-height 80vh) if we want it to fill most of the first viewport.

DON'T TOUCH:

Don’t add scroll-triggered animations yet (those will be minimal or handled with framer-motion if any). No automatic carousels or videos in hero as it should be static for now (aside from possible subtle animations).

Avoid using heavy libraries for the device mockups. A simple <Image> with a PNG of the device is fine; we are not implementing a 3D device viewer or anything overly complex.

Do not implement a “play video” unless explicitly asked; no mention of video, so just static imagery.

Calendly integration script – will be added in CTA slice (S4). For now, the “Book demo” button can simply be a link or onClick stub. If easy, you can include Calendly’s widget script and configuration in this slice, but it’s optional to wait until S4.

⚙️ Commands:

Optimize images: If using placeholder images, run them through a compressor (or use an online tool) to ensure they are reasonably small. Place them in public/ and reference by relative path in Next <Image src="/hero-phone.png" ... />. Add the domain to next.config.js images config if needed (for remote images, but here local is fine).

Use framer-motion or Magic UI for any slight effect: for example, you might apply a gentle initial fade-up animation to the hero text and images when they enter viewport. If doing so, use the useReducedMotion hook or Tailwind’s motion-safe to disable it when user prefers no animation
epicweb.dev
. Keep the animation subtle and only play once. Alternatively, use a CSS transition-opacity for a simple fade-in with appear class. We want no scroll jank, so avoid continuous animations on scroll.

Test the hero on various screen sizes: ensure that on small devices the images resize (Next/Image will handle responsive sizing, but set appropriate sizes prop). The phone image might stack on top of the desktop image on mobile (or hide one of them if it’s too cluttered on a tiny screen). Possibly only show the phone on xs screens to keep it clear. Adjust via CSS or conditional rendering.

Check performance: run npm run build && npm run start to simulate production, then use Chrome DevTools Performance or Lighthouse. The hero is the largest content, so measure LCP. With optimized images and server-rendered text, we should hit LCP quickly. Ensure our gradient CSS isn’t causing a massive paint cost (it generally shouldn’t). If the images are the LCP, their loading priority might need to be high (Next automatically preloads images in the viewport). Use <Image priority> for the main mockup images to signal they should load immediately
patterns.dev
.

Cross-check design: ensure the gradient looks correct (compare with Mintlify/Make if needed). The green gradient should feel modern (perhaps a subtle diagonal direction). If it looks off, adjust the color stops in Tailwind config or use a custom background style in CSS.

🚨 Escalate:

If real product screenshots are unavailable, escalate to design/product team – perhaps use a temporary screenshot of an early prototype or dashboard. A convincing visual is key for the hero. If not ready, a fallback could be an illustration or icon until real UI is available.

If the gradient background combined with large text causes accessibility issues (e.g., text hard to read on certain parts of gradient), consider adding a slight overlay or tweaking colors. Escalate if unsure about altering brand colors. It's crucial the hero text has “sharp text contrast” as required.

Watch for performance issues: a common pitfall is applying a background gradient on a very large element causing slow paints, or using an SVG filter. If the gradient is causing slowness (unlikely with pure CSS linear gradient), escalate or simplify it. Also, if the images are too heavy, consider using Next’s blur placeholder or a different approach.

If using framer-motion leads to a large bundle or is tricky to use with Next App Router (it should be fine), and if just for a simple fade, consider using the built-in @framer/motion one-off usage or even CSS. Escalate if animations start to compromise performance or dev effort. We can drop non-essential animations to meet the “smooth and modern” goal without jank.

Ensure that adding images doesn’t break build (Next might require adding /** @type {import('next').NextConfig} */ for static image import support, but since we use <Image> with a path, it should be okay). If any Next/Image config issues arise (like domains needed or loader config), address or escalate.

🔐 Rules:

Content first, then polish: Focus on getting the correct text and images in place and responsive. Only then add animations or fancy effects. The hero must degrade gracefully – if animations don’t run (e.g., older browser or prefers-reduced-motion), it should still look good (text visible, images in place).

Use semantic HTML for text: The main tagline should be an <h1> (only one h1 on the page, which this will be, given hero is first section). The subtitle can be an <p> or <h2> depending on context (it’s supporting text, so a paragraph is fine). This helps SEO (the h1 will carry keywords like "plumbing business management software" if included).

Framer-motion constraints: Do not use animations that trigger on every scroll frame (no continuous parallax that is heavy). If we do a scroll-linked effect (like slight parallax on images), leverage CSS transform: translateY() with position: sticky or framer-motion’s ScrollTimeline for efficient handling
motion.dev
. Only animate properties that are cheap (opacity, transform) and avoid layout-thrashing animations (no constantly changing element size or causing reflow).

Motion-safe default: Any animation should be wrapped in Tailwind’s motion-safe: or a runtime check for prefers-reduced-motion
epicweb.dev
. This ensures users who disable motion get a static experience (which is fine).

Ensure the CTA buttons are accessible: use <button> elements for actions (with type="button"), or <a> with role="button" if linking. The Calendly “Book Demo” should be a real focusable element. Include aria-label if the text isn’t clear (e.g., if we had an icon-only WhatsApp button, label it “Chat on WhatsApp”). Also, buttons should have hover and focus states that meet contrast requirements (e.g., on focus, maybe outline or darken).

Balancing text: Utilize react-wrap-balancer by wrapping the hero heading text in <Balancer> component
github.com
. This will automatically distribute the text for optimal line breaks, avoiding single-word lines which can look odd on responsive layouts. This is a small, performance-friendly enhancement to improve readability on different screens.

Use the Next.js Image component for all static images. Set appropriate alt text that is descriptive for visually impaired users (e.g., “Plumbing Agent mobile and desktop interface example”). Define width/height or use layout="responsive" with given aspect ratio so Next can calculate space (this prevents layout shift as the image loads
patterns.dev
). Also leverage modern image formats; Next/Image will serve WebP automatically if possible.

No autoplay media: If later considering adding a background video or animated GIF, note that autoplaying videos or animated backgrounds are discouraged (not mentioned in requirements and often hurt Core Web Vitals). Stick to static or subtle animated illustrations.

Make the hero “smooth and modern”: this means perhaps adding a small touch like a drop shadow on the device mockups or a slight floating animation (e.g., devices subtly scale or bob on hover). If doing so, keep it subtle and disable on prefers-reduced-motion. No old-fashioned effects like typewriter text or flashing elements – keep it clean.

📋 Acceptance Criteria:

Visual Impact: When the homepage loads, the hero section immediately displays a clear value proposition. For Dutch locale, it shows (for example) “De eenvoudigste manier om uw loodgietersbedrijf te runnen.” and for English “The simplest way to run your plumbing business.” (Text may differ slightly based on final copy, but message is equivalent.) The text is centered (or aligned per design), highly readable (large font, good contrast with background). The background gradient covers the full width of the viewport and looks smooth (no banding or abrupt color jumps), providing a modern feel consistent with Mintlify/Make.com inspiration.

Product Showcase: The mockup images of the app are rendered clearly in the hero. On a desktop browser, the laptop/desktop screen image and phone image are both visible, giving a sense of multi-device use. They are arranged nicely (e.g., phone overlapping laptop at an angle or side-by-side) and do not obscure the text. On mobile view, the images resize or reflow such that the phone may appear above the text or only one image is shown if both cannot fit – in all cases, the hero still conveys a professional product image. There is no weird clipping or overflow of images; they scale down to fit small screens.

Calls to Action: The hero contains a prominent primary CTA button labeled “Boek een demo” (Dutch) / “Book a demo” (English). When clicked, it (will) trigger the Calendly scheduling modal (wire up in S4). For now, it might just be a no-op or link, but the button is present and styled. Additionally, on a small screen (simulate on a phone), a WhatsApp contact button is visible (e.g., a green WhatsApp icon button). When clicked on an actual device, it deep-links to WhatsApp with the preset message. This button might be hidden or de-emphasized on larger screens (that’s acceptable as desktop users can be encouraged to book a demo instead). The WhatsApp link follows the correct format (e.g., https://wa.me/15551234567?text=Hallo...) 
faq.whatsapp.com
 and opens WhatsApp chat when tested on a mobile.

Smooth Appearance: The hero section does not “pop in” abruptly; if an entrance animation is implemented, it should be subtle (e.g., a slight fade-up of text and images). There is no lag or stutter during page load – the content is visible quickly. If the user scrolls immediately, there’s no delay or blocking script (framer-motion animations run on the GPU and are lightweight). Also verify that any animation is one-time; scrolling back up doesn’t repeatedly trigger a heavy effect.

Core Web Vitals (Hero): The hero’s Largest Contentful Paint (LCP) element is likely the hero image or headline text. It should render quickly – ideally under 2.5s on slow 3G simulated (for a static site this is doable). Next.js optimizations (like image preloading and server rendering) should yield an LCP element that loads early. CLS should remain near 0; the hero images have reserved space (via explicit dimensions or CSS aspect ratio) so nothing jumps when they load
patterns.dev
. We’ll confirm via Lighthouse or web vitals tooling.

Localization & SEO: The hero text is fully translated when switching language. Check that important keywords appear in the h1 for each locale (Dutch keywords for NL, English for EN as appropriate). Also ensure the page <title> and meta description will be set accordingly (that is handled in SEO slice, but the content we have will feed into that). For now, no hard-coded English remains in hero when viewing Dutch, and vice versa.

No Clipping/Overflow: Even on very small screens or uncommon aspect ratios, the hero section’s content is accessible (no part of text cut off or images causing horizontal scroll). The layout uses flexbox or grid such that elements wrap or stack nicely. Test on an iPhone SE (small) and a large monitor – in both cases the hero looks centered and not too sparse or too crowded.

Code Quality: The HeroSection component is implemented cleanly – e.g., not thousands of lines in one file, but structured with sub-components if needed (like a <HeroCTAButtons> sub-component if it helps clarity). All strings are externalized for i18n. No console warnings (e.g., from missing image alt or a key). TypeScript shows no errors (types for useTranslations, framer-motion components, etc., are all correct).

S3 — Features & Benefits Sections

📌 Objective: Introduce a series of benefit/feature sections that communicate how Plumbing Agent helps plumbers in their business. Each section will be a distinct block focusing on a key value proposition (e.g., scheduling, invoicing, communication), using a heading, a short description, and a simple graphic or icon to illustrate it. The sections should stack vertically, creating a logical flow that “walks users through product value.” The style should be consistent (using the gradient or accent colors for icons or section headers) but each feature should stand out. These sections must be mobile-responsive and avoid heavy animations – perhaps a gentle reveal on scroll at most, but nothing janky.

📂 Scope:
CREATE:

components/FeatureSection.tsx – A reusable component to represent one feature/benefit. It could accept props like title, description, icon or image. This component will be used multiple times with different content. It includes:

An <h2> or <h3> for the feature title (use appropriate semantic level after the hero’s h1). Style as a bold sub-header (e.g., text-2xl md:text-3xl font-bold text-gray-900 or on dark background maybe white).

A <p> for a brief description (one or two sentences) elaborating the benefit.

An illustrative image or icon: For simplicity, use an icon or small graphic (e.g., a calendar icon for scheduling, an invoice icon for billing, a chat bubble for communication). We can use an icon set (Heroicons via ShadCN or any SVG in public). Alternatively, a small screenshot could work, but icons keep it simple. Use a consistent style for all feature icons (all color or all outline). Possibly apply the green gradient as a background or fill to these icons to tie in branding.

Layout: possibly alternate left-right for each section (to make the page visually interesting). E.g., Feature 1: icon on left, text on right; Feature 2: text on left, image on right; etc. This can be achieved with flex-row and flex-row-reverse on alternating sections (stacked column on mobile).

Specific instances of FeatureSection (or content objects): We plan for 3 key features/benefits to highlight. Tentatively:

Scheduling & Planning – e.g., “Effortless Scheduling” (NL: "Plan afspraken moeiteloos"). Icon: calendar or schedule.

Quotes & Invoices – e.g., “Instant Quotes and Invoices” (NL: "Offertes en facturen in één klik"). Icon: document or currency symbol.

Communication – e.g., “Real-time Communication” (NL: "Direct contact met klanten"). Icon: chat bubble/WhatsApp logo.
(The exact text will be in content suggestions; these are themes to implement.)

public/icons/... – Include or create SVG icons for the above (if using Heroicons or similar, we can directly embed SVG JSX). If using ShadCN UI, it might have some Lucide icons included; Magic UI also might have some animated icons we could leverage. E.g., Magic UI might have an animated chat bubble component – consider using if it adds flair without much work. However, ensure any animation in icons is subtle and “motion-safe”.

EDIT:

app/[locale]/page.tsx – Add the feature sections in order below the hero. This might be a simple list of <FeatureSection title={t('feature1.title')} ... /> for each. Ensure to wrap them in a container (maybe a <section> element each) and perhaps give alternating background colors or a slight variance for separation (e.g., white background for one, gray for next, or use a subtle top divider). Keep styling clean.

messages/en.json & messages/nl.json – Add translation entries for each feature title and description. For example: feature1Title, feature1Desc, etc., up to feature3. The Dutch translations should be clear and concise (avoid overly technical terms if plumbers are not tech-savvy; use simple language).

Global styles or Tailwind classes: If alternating backgrounds, add a Tailwind utility like bg-gray-50 to every other section container. Or define a custom class .section-alt if needed. Also define spacing – likely each section has padding y-axis (e.g., py-16 md:py-24) to give breathing room. If needed, extend Tailwind spacing scale for nice even spacing.

DON'T TOUCH:

Don’t implement complex carousels or slides within these sections. Each feature stands alone in a static block. No interactive accordions or videos here (unless a specific demo GIF is desired later, but none mentioned now).

Avoid excessive text: keep each feature’s description to 2-3 lines on desktop. If our suggestion copy is too long, we might trim it. The goal is scannability – a plumber should glance and get the point.

No separate pages for features – all stays on the one page. So do not create new routes; just sections on the homepage. The nav might not even need anchor links, but if we wanted, we could add internal IDs (e.g., <section id="features">) and nav link to it, but not required by prompt.

⚙️ Commands:

After implementing, test the layout with the alternating pattern. Use devtools to ensure that on large screens, the side-by-side layout looks good: images/icons are sized well (maybe 25-33% of row width for icon, 66-75% for text). On small screens, ensure the flex container becomes vertical (Tailwind flex-col) so icon is above text or vice versa. Possibly use md:flex-row and default to column on mobile. Use items-center or items-start appropriately to align content.

If using icons from a library, import them properly (e.g., import {CalendarIcon} from 'lucide-react';). Ensure tree-shaking so we don’t bloat bundle with unused icons. Or simply inline SVG for now.

If using Magic UI components (they have some effect components), try one for perhaps a small animated effect – e.g., Magic UI’s animated icon or scroll effect. But keep it minimal. Test any such component’s performance; Magic UI is built on framer-motion too, so should be fine.

Validate that the translations appear: e.g., temporarily console.log the t('feature1Title') to ensure keys are correct.

Check that each section’s text is understandable and free of typos or awkward phrasing in both languages. Possibly have a native Dutch speaker review the Dutch copy if possible. For now, we use our best effort.

Run Lighthouse again focusing on the Content Best Practices: It should flag if headings are not in order (we want an H1 then H2s or H3s – keep a logical hierarchy). Ensure we didn’t skip from h1 to h3. We can use multiple h2 for each main section since they are at same hierarchy level (that’s fine).

Also check accessibility: each section’s content should be reachable via keyboard (not that they have interactive elements beyond maybe a “Learn more” link if any). If icons are purely decorative, give them aria-hidden="true" or role="presentation". If they convey meaning, ensure the alt text or accompanying text covers it (e.g., if icon is labelled by the heading, that’s fine).

🚨 Escalate:

If some features seem too similar or one section feels weak, consult product team for any other benefit to highlight. For example, if Plumbing Agent also offers an Analytics dashboard or Inventory management, maybe that should replace one of the three if more compelling. The current three (scheduling, billing, comms) are assumptions. Confirm the top 3 selling points with stakeholders; adjust content if needed. Escalate if there’s uncertainty here.

Should any section include a testimonial or quote? The prompt doesn’t mention it, but some landing pages include social proof. If marketing wants a testimonial block, that could be another section. Currently out of scope; escalate if it’s requested so we can plan an additional slice.

Design tweaks: If the alternating layout doesn’t look right (some designs prefer all left-align text with image below on mobile), escalate or adjust. Possibly a simpler stacked layout for all might be better if alternating is too complex for responsive. We have discretion, but raise if it conflicts with “simplicity-first” principle.

If iconography usage is not consistent with branding (maybe they want only flat icons or only outline style), make sure to follow brand guide. If none provided, choose a neutral modern icon style (outline icons often work well). If in doubt, escalate for design approval on icon style.

Watch out for too much animation: If Magic UI temptingly provides fancy scroll-linked animations (like elements sliding in from sides), use caution. Only implement such reveal if it’s smooth. If any hint of jank or if it negatively impacts performance, either simplify or drop it. It’s better to have static sections than a jittery animated one. Escalate if guidance needed on trade-off.

🔐 Rules:

Each feature section should be wrapped in a <section> tag with an appropriate ARIA label or heading, so that screen reader users can navigate by sections. For example, <section aria-labelledby="feature1-title"> containing the h2. This helps structure the one-page for accessibility.

Consistent design: Use the same typography and color scheme across these sections. For example, all feature titles might use the brand green color or a dark gray – but be consistent. The descriptions might all use the same text color (e.g., text-gray-600 for secondary text). Consistency improves the polished feel.

Ensure each section focuses on one key idea. Keep the text short and benefit-oriented (address plumber’s pain points). The copy suggestions will reflect this (e.g., “No more paperwork – schedule jobs in a tap”). Use second person (“you/your”) in English and appropriate form in Dutch (we might use informal “je” to make it approachable, or “uw” for polite, but stay consistent with tone chosen in hero).

Spacing and separation: Provide enough padding between sections so they don’t run together. Possibly use a subtle divider line or differing background to delineate. For instance, if hero is on white, maybe the first feature section is on off-white background to separate visually. This guides the eye and improves flow.

Scroll behavior: If these sections are tall, ensure scrolling is not hindered. If using any sticky elements (like an icon that sticks as you scroll its text – probably overkill here, so likely not doing that), use CSS sticky not JS. Given simplicity, likely no sticky sub-elements here.

The implementation should not rely on heavy JavaScript. Use CSS for layout and responsive design. If doing any appear-on-scroll effect, prefer the IntersectionObserver API or a small utility rather than a large library. Possibly Magic UI has a ScrollAnimation component; if used, ensure it’s lightweight.

Translation: All headings and paragraphs in these sections must use i18n keys. Do not embed any untranslated strings. Verify even the smallest text (e.g., on icons if any text). The translations should be checked for length – if a Dutch text is much longer than English, ensure the layout still holds up (Dutch tends to be longer; our suggestions account for that somewhat). If needed, allow text wrapping and avoid fixed width that could break layout.

Mobile design: On small screens, likely the icon will sit above the text for each feature (a single column). That’s fine and expected. Make sure to center the icon above the text or left-align everything in a column – either can work, but generally center might look better for such short text blocks. Whichever looks cleaner, do that consistently.

Link or CTA in features: Not explicitly asked, but sometimes each feature might have a “Learn more” link. Currently, there’s nowhere to go (one-page site). So likely no extra links. If product team wants, maybe each feature could link to a blog or a docs page in future, but out of scope now. We will not add any links except the main CTA.

📋 Acceptance Criteria:

Clear Messaging: Each of the 3 feature sections presents a distinct benefit. For example, a user scrolling the page can identify: “Scheduling is easy (they have a calendar system), Invoicing is simple (they help with quotes/billing), and Communication is direct (WhatsApp integration).” The headings and icons make it obvious at a glance what each section is about. The short descriptions provide just enough detail to be convincing but not so much to overwhelm. For Dutch, the messaging is equivalently clear (using terms a plumber would use; e.g., “afspraak” for appointment, “factuur” for invoice, etc. – see content suggestions).

Design Cohesion: The feature sections visually feel part of the same site as the hero: they possibly use a bit of the green accent (maybe icon in green or heading underlines in gradient). Yet they maintain simplicity – plenty of white (or light background) space, easy on the eyes. The alternating layout (if applied) does not confuse the reading order: on mobile it naturally becomes one column in correct order, and on desktop the alternation adds visual variety. No section is cut off or oddly spaced.

Responsiveness: On mobile, each feature section stacks properly: icon (or image) above, then heading, then paragraph. There’s sufficient padding so that the transition from one section to next is clear. On desktop, check that when two columns, the image/icon and text align vertically nicely (e.g., middle of icon aligns with start of text block or so). Also verify that if one feature’s text is much longer than another’s, it doesn’t create an awkward gap in the two-column layout. (All text blocks should be roughly similar length to avoid a lot of empty space on one side on wide screens – if one is short, maybe add a second sentence or a line break to balance; content can be tweaked).

Smooth Scrolling: If any reveal-on-scroll animation is used, it works correctly. For example, if we choose to fade-in the feature sections as they enter viewport, test by scrolling slowly: each section should maybe fade in once. If prefers-reduced-motion is enabled in the OS, these animations should be disabled (sections already visible)
epicweb.dev
. There should be no performance stutter when these triggers happen (use light IntersectionObservers or Framer Motion’s whileInView with throttling). If we decided no animations at all (just static), that’s acceptable and then this point is moot, but performance is maximized.

No overlap: The sections do not overlap each other or the hero/footer. Each section’s bottom margin/padding ensures separation. Also ensure that if the user uses browser “jump to heading” shortcuts (or a ToC), each section is a distinct region.

Accurate Icons/Alts: Icons used are appropriate (e.g., not using a random symbol that doesn’t clearly connect to the text). Each image or icon has alt text (if informative) or is hidden from assistive tech if redundant. For example, if an icon is purely decorative next to a heading that says “Effortless Scheduling,” one might set aria-hidden="true" on the icon and rely on the heading text to carry meaning. No alt text that just repeats the heading.

Locale Consistency: All feature titles and descriptions appear in the selected language. If a user switches language mid-page scroll, the content re-renders to the other language seamlessly (Next’s routing remount might scroll to top by default; that’s fine). Check that Dutch text fits in the design – e.g., “Plan afspraken moeiteloos” fits in one or two lines nicely, not breaking layout. If any Dutch string was too long for the layout, it has been abbreviated appropriately.

Quality: Lint/TypeScript passes with these new components. No unused vars. The build doesn’t complain about oversized images (Next will warn if serving images without optimization or large sizes). Also test a production build to ensure no hydration mismatch (common if we accidentally use window in a server component – avoid that). All components here can be server components (no need for client-side unless we did in-view animations – in which case that part might need to be client). If so, ensure to mark those specific components as "use client". No unintended client bundling for purely static content.

S4 — Call-to-Action & Contact Integration

📌 Objective: Finalize the conversion points by implementing the primary Call-to-Action interactions: integrate Calendly for demo booking and add the WhatsApp contact link/modal for inquiries. This slice ensures that when a user clicks “Book a demo,” a Calendly scheduling dialog appears over the page (so they can schedule a demo without leaving the site). Additionally, provide a convenient WhatsApp chat link for quick questions (especially targeting mobile users). We will also finalize any global event handling needed for these (e.g., loading Calendly script on demand), and make sure these CTAs are prominent and working. This slice also includes any final adjustments to ensure the site can be deployed (no broken links, etc.).

📂 Scope:
CREATE:

components/CalendlyModal.tsx – A component to encapsulate the Calendly embed modal. This could simply load Calendly’s inline embed widget or use their provided script. Likely approach: include Calendly’s embed code as recommended: a script tag with src https://assets.calendly.com/assets/external/widget.js and an HTML element that triggers it. We might not need a custom React component if Calendly provides a snippet – but we will create one to manage opening/closing if needed. E.g., a component that renders nothing until activated, then injects an iframe modal. Alternatively, use the Calendly pop-up text or pop-up widget option
help.calendly.com
. The simplest: use the popup widget which is a floating button – but we want our own button to trigger, so use the pop-up text method (which in our case will be a hidden link or programmatic open). Calendly’s documentation suggests adding an anchor link with href="https://calendly.com/your-account" and a special onclick that calls Calendly.initPopupWidget({...}). We can incorporate that. The component can handle including the script (perhaps via a lazy load using Next’s dynamic import of a small script loader).

public/calendly.js (optional) – If we need a custom script to init Calendly widget, we can add a small script file. For instance, define a function openCalendly() that calls the Calendly API. We will ensure this script is only loaded on user interaction (to not delay initial load).

WhatsApp link – This might not require a new component; we can use a normal <a> with the href as the wa.me link. But we should ensure it opens correctly on mobile (likely just works). We may create a ContactButtons component that includes both the Calendly button and WhatsApp button for use in hero or footer.

EDIT:

components/HeroSection.tsx – Hook up the “Book Demo” button to actually open Calendly. For example, give it an onClick={openCalendly}. The openCalendly function can be provided via context or imported from calendly script. Alternatively, instead of custom, use an anchor: <a href="your-calendly-link" onClick={e => { e.preventDefault(); Calendly.initPopupWidget(...); }}>Book Demo</a>. The Calendly script needs to be loaded for this to work. We can include the script tag either in _app (for older pages) or as a lazy load. Possibly place a <Script> component in layout.tsx with strategy: 'lazyOnload' to load Calendly script after the main content (since it’s not critical for initial render). That script will attach the Calendly object to window. Ensure it’s loaded by the time user clicks. If not, we may need to load on first click.

components/NavBar.tsx – If a “Book Demo” button exists here as well, ensure it triggers the same Calendly popup. Possibly by onClick calling the same function or by making it a link that the Calendly script catches (Calendly can auto-bind if you give the link data-calendly-popup). We can also duplicate the onClick logic. Test both hero and nav CTAs.

components/Footer.tsx – Optionally, add a small note or link: maybe a secondary CTA like “Or message us on WhatsApp” with the link. On mobile, the hero already has it, but on desktop maybe footer can have it. Up to design – but to ensure the WhatsApp contact is visible on mobile primarily.

app/[locale]/page.tsx – Possibly add a final CTA section above the footer as a conclusion. Some landing pages reiterate the call to action at the bottom (“Ready to get started? [Book demo]”). If deemed useful, implement a small section that mirrors the hero CTA. It could simply be a centered text “Klaar om te beginnen? Boek een gratis demo.” and the button. If not, at least ensure the hero CTA is accessible (maybe user scrolls back up or the nav button is always there). The prompt suggests a one-page, presumably short enough that scrolling back up is fine. We can include this if time permits. (We have copy suggestions for a closing line as well.)

SEO meta tags (if not done elsewhere): It might be logical to include here final touches like setting the page <title> and <meta description> for each locale, and linking alternate locales. Possibly in app/[locale]/layout.tsx head. E.g., <title>Plumbing Agent – Manage Your Plumbing Business Easily</title> and Dutch equivalent, plus <meta name="description" content="...">. Also <link rel="alternate" hreflang="nl" href="/nl" /> and same for en
next-intl.dev
. These details might also fit under SEO slice if separate, but since we’re wrapping up for deployment, include them here.

DON'T TOUCH:

The actual Calendly account or event details (we assume a Calendly link is available). Use a placeholder link if unknown (like Calendly’s own demo link, or leave the onClick broken but with a TODO). Preferably get the correct URL from product manager.

Don’t attempt to store any form data; Calendly handles scheduling completely. We just embed it.

No additional analytics or conversion tracking as per requirements (so we won’t include Google Analytics event tracking for the button – not in scope now).

⚙️ Commands:

Insert Calendly embed script: In layout.tsx or custom Document, add: <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" /> (using Next/script). This will load Calendly code in background. Verify in Network tab that it loads after main content.

Implement the onClick for demo: For example, in HeroSection’s button:

onClick={() => Calendly.initPopupWidget({ url: 'https://calendly.com/your-org/demo-meeting' })}


and make sure to prevent default if it’s an <a>. You might need to declare /* global Calendly */ for TypeScript or use window.Calendly. There’s also an official react component for Calendly, but adding that may be overkill; our approach is fine.

Test the flow: Run pnpm build && pnpm start (production mode) to ensure everything including script loading works in a real scenario. Click “Book demo” – the Calendly scheduler UI (an iframe) should appear as a popup over the page. Test that you can interact with it (select date/time) up until the point of confirmation (you can cancel before final submit since this is test). If it doesn’t appear, debug whether Calendly script is loaded (window.Calendly exists). If not loaded in time, consider changing script strategy to beforeInteractive (but that might slow initial load). Alternatively, explicitly load on first click: e.g., if window.Calendly undefined, create a script element on the fly then call init after onload. But likely lazyOnload will suffice.

Test WhatsApp link: On desktop, clicking it should ideally open WhatsApp Web (if user has it, or prompt to use WhatsApp desktop). On mobile, it should switch to WhatsApp app. If testing on desktop without WhatsApp, it might just open a WhatsApp web page prompting to use phone – that’s okay. The link format must follow WhatsApp guidelines (we have it)
faq.whatsapp.com
. Also ensure the phone number used is correct and in international format (no + or dashes in the URL).

Multi-language: Calendly might have a scheduling page in English by default. Since target is Dutch plumbers, if Calendly supports locale or if you have a separate Calendly for NL, use that link. If not, it’s fine (not much we can do, outside scope to localize Calendly widget itself). Just note it.

If a secondary CTA section is added at bottom, test that its button also opens Calendly. Possibly reuse the same component or function.

Ensure no conflicts: e.g., the Calendly script should not conflict with any other script (we have none others). It should also not produce console errors. If it does (like missing styles), include their CSS if needed (Calendly might need a line <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet"> – check docs). Add similarly with lazy or in head.

Validate SEO tags: View source of /en and /nl pages. Ensure the <title> is appropriate (maybe “Plumbing Agent | [Short tagline]”). Ensure meta description is present and in the correct language (should summarize product and include keywords like “loodgieter software” in Dutch, “plumbing business software” in English). Confirm alternate links for languages are present: e.g., in /nl page source, we have <link rel="alternate" hreflang="en" href="/en" /> and vice versa, plus hreflang="x-default" if needed. This can be manually added or next-intl might handle domain routing if configured; we might do it manually for completeness.

🚨 Escalate:

If Calendly’s embed significantly drags performance (maybe its script is hundreds of KB and loads many assets), consider alternatives: e.g., using a simple link to an external Calendly page instead of popup. The trade-off is losing on-page convenience vs performance. If Google Lighthouse shows a big drop from including Calendly, bring this up. Perhaps loading the script only when user clicks (on first click, inject script then open after short delay) – slight UX delay but only if they click. If needed, implement that approach and escalate decision on whether that’s acceptable.

If WhatsApp link is not desired on desktop (some might argue it looks unprofessional to have a WhatsApp chat link on a desktop view), confirm with stakeholder. Possibly hide on large screens. Escalate if there’s disagreement. Alternatively, show on all screens but that’s a business choice.

Should any contact form be needed as well? The prompt only mentions Calendly and WhatsApp, so no email or phone number explicitly given. If during review someone asks “where’s a contact email/phone?”, we might add it in footer. Escalate if scope creeps to include an email link or phone. Those are trivial to add but just to confirm if needed.

If integrating these CTAs uncovers any CORS or other issues (unlikely, since Calendly widget should just work and WhatsApp is just a link), escalate accordingly. E.g., if the site is served on HTTPS (it will on Railway), ensure all assets (Calendly script) are loaded via https (it is).

SEO escalate: if more SEO work is needed (like structured data JSON-LD for local business), mention it but likely out of scope for this landing page MVP.

🔐 Rules:

Calendly integration should not block the main thread on load. That’s why we choose lazy loading. We want a good Lighthouse performance score. Ideally, Calendly’s script loads after initial paint. If possible, only load it upon user interaction (this ensures zero impact unless needed). Implementing a dynamic import of Calendly on click could be an approach: e.g., use import('calendly-popup-module') on demand. But given time, the provided script is fine. Just abide by performance: set defer or Next’s lazyOnload.

The demo scheduling process should feel part of our site branding: Calendly allows some customization. At minimum, ensure the popup shows our meeting title and uses our branding (set that up in Calendly settings, outside dev scope). On dev side, ensure the backdrop of the popup covers the page to focus user. The site under should not scroll when modal open (Calendly likely handles that). Test that closing the modal (via Calendly’s close button) returns control properly.

WhatsApp deep link should use the official format
faq.whatsapp.com
. Do not use any third-party linking service. Also, consider privacy: clicking it will reveal our number to user and vice versa. That’s fine because it’s an intended contact method. Just be sure to use the business number. Possibly encode a default message like “I’d like a demo of Plumbing Agent” in Dutch for NL locale (Calendly covers scheduling, but WhatsApp might be used for quick questions). We can have the text param also localized: e.g., in Dutch link include Dutch greeting. Keep it short.

Ensure touch-friendly design for these CTAs: the Calendly modal button is large, but if user has to click small times in the calendar, not our concern (Calendly UI handles it). The WhatsApp button on mobile should probably be a floating button or a clearly tappable element. Possibly we can make it a sticky “Chat via WhatsApp” at bottom of screen on mobile. But that might conflict with Calendly’s floating widget if we had that. Instead, we integrated it in hero which is visible immediately. That’s okay. Just ensure it’s easily tappable (we did in hero criteria).

SEO meta: Set an informative title and meta description in each language. Use Next’s Head component or new metadata API in layout (if using Next 13 app, we can export metadata from layout or use a head.tsx file under locale). Follow best practices: title ~ 50-60 chars with branding, description ~ 150 chars including target keywords naturally. For example, Dutch description might mention “Software voor loodgieters om planning, offertes en communicatie te vereenvoudigen.” The page should also have <meta property="og:title"> etc. We can mirror title/description to OG tags for social sharing. Also add an <meta name="viewport" content="width=device-width, initial-scale=1"> if not already in place (Next app usually has that by default).

Before deploying, remove any debug code (console.log, etc.). Ensure the site runs in production mode with no references to localhost or dev assets.

Deployment to Railway: The project should be configured with a railway.json or just rely on detection. Next.js will typically work on Railway using pnpm build && pnpm start. Ensure environment variables (if any, none needed for static site) are set. Because no serverless functions aside from Next internal, should be fine. Confirm that output: 'standalone' in next.config if needed for optimal deployment (optional).

No part of the site should break if JavaScript is disabled. Important: since it’s mostly static, even with JS off, the content (hero text, features, etc.) should all render (they do, via SSR). The only thing that won’t work without JS is Calendly popup trigger and maybe language switch if that uses router. But that’s acceptable (we can mention “enable JS to use scheduling” if needed). The core marketing message is still delivered without JS, which is good for SEO. This aligns with the server-first approach.

📋 Acceptance Criteria:

Calendly Demo Booking: Clicking the “Book a demo” button opens a modal overlay with our Calendly scheduling interface. The user can pick a date/time and submit the form without leaving our page
help.calendly.com
. The background page is dimmed/disabled while modal open, preventing interaction until closed or submitted. When the modal is closed (either after scheduling or if the user clicks X), it disappears cleanly and the user can continue browsing the site. This should work on both desktop and mobile (UI might adjust, but Calendly’s responsive widget should handle that). There are no console errors when opening or during usage of the widget. The scheduling process works (tested with a dummy appointment).

WhatsApp Contact: On a mobile device, tapping the WhatsApp contact opens the WhatsApp app (or prompts to if not installed) with a pre-filled message (in the correct language greeting). On desktop, clicking it either opens WhatsApp Web or shows a QR code (WhatsApp’s behavior) – either way, it’s the expected behavior for a WhatsApp link. The phone number and message are correct (we verify the number is ours and message says something like “Hello, I’m interested in Plumbing Agent.” in the appropriate language). The link should be tested – on a phone emulator or actual phone if possible. There is no error; if WhatsApp isn’t available on a device, the link should at least navigate to a page instructing to use phone.

CTA Visibility: The primary CTA (demo) is easily visible at both the top (hero) and via nav if present, and possibly repeated at bottom if we added a final section. A user who scrolls through the features and is convinced doesn’t have to scroll all the way back up – if we included a bottom CTA section, it appears with text like “Ready to get started?” and the button. If not, the sticky nav could suffice (the nav “Book demo” is always at top if sticky). Either approach, by the end of page, a CTA is accessible. Check on a long scroll that the user isn’t left without a CTA in view.

SEO & Metadata: The page source contains correct meta tags:

<title> shows the product name and a tagline. For Dutch page, something like “Plumbing Agent – Dé software voor loodgieters” (if we choose that tagline) or similar; for English, “Plumbing Agent – Simplify Your Plumbing Business”.

<meta name="description" content="..."> is present and localized (no English description on Dutch page).

<link rel="alternate" hreflang="en" href="/en" /> and <link rel="alternate" hreflang="nl" href="/nl" /> are included in the <head> (ensuring search engines know these are two versions of same content). Optionally an <hreflang="x-default"> pointing to default (nl) or just the base domain.

The HTML is semantic (we have header, main, sections, footer with proper heading hierarchy as covered). Search engine bots can easily parse the content. We’ve included keywords like “software for plumbers” in headings or description which helps SEO targeting.

Performance Budget: The final site when built and deployed should still load fast: measure Google Lighthouse Performance score 90+ on desktop and high 80s or 90 on mobile. Core Web Vitals specifically: LCP under ~2.5s (the hero image or heading), CLS ~0 (no unexpected shifts thanks to our careful image sizing
patterns.dev
), and Time to Interactive quick since minimal JS (aside from Calendly which loads late). The addition of Calendly script and images did not drop performance below acceptable range. If it did, we implemented mitigation (like on-demand loading) to correct it.

A11y Audit: Run Lighthouse Accessibility audit – should score high (ideally 100 or close). Any issues flagged (like contrast, missing labels) have been addressed. For example, if it flags low contrast on some text over gradient, we either fixed the color or added a text-shadow. If it flags missing alt on images, we added them. The site should be navigable by screen reader: tested by reading through using rotor (the headings sequence: Hero h1, then feature h2s, etc., should make sense). The language of page is correctly set to Dutch or English in each version (screen reader will use correct pronunciation). All interactive controls (buttons, links) announce their purpose (the WhatsApp link might announce as “Chat on WhatsApp, link”). No element is inaccessible.

Compliance & Cleanliness: The project passes pnpm check which runs all checks: typecheck, ESLint, build. Deployment to Railway is successful – the site is accessible via the Railway-provided URL (or custom domain) and everything works there as in dev. No environmental differences cause breakage (Calendly and WhatsApp links work on production URL too).

Content & Localization Draft

(The following copy is proposed for each section in both Dutch and English. These should be reviewed by a copywriter and can be adjusted, but serve as a starting point for implementation.)

Hero Title:

EN: “The simplest way to run your plumbing business.”

NL: “De eenvoudigste manier om uw loodgietersbedrijf te runnen.”
(A bold tagline emphasizing ease of use. “Run your business” implies handling scheduling, billing, etc., which is key. Dutch version uses formal “uw” for professionalism.)

Hero Subtitle:

EN: “Save time on paperwork and scheduling – let Plumbing Agent organize your jobs, quotes, and customer chats in one app.”

NL: “Bespaar tijd op papierwerk en planning – laat Plumbing Agent al uw klussen, offertes en klantcontact in één app organiseren.”
(Highlights key values: time saving, all-in-one solution. Dutch translation keeps it direct.)

Hero CTA Button:

EN: “Book a Demo”

NL: “Boek een demo”
(Action to schedule a demo.)

Hero Secondary CTA (mobile):

EN: “Chat via WhatsApp” (or simply a WhatsApp icon with aria-label "Chat on WhatsApp")

NL: “Chat via WhatsApp”
(Invites quick contact. Using English "WhatsApp" as it’s a proper noun; that’s common in Dutch as well.)

Feature 1 – Scheduling:

Title EN: “Effortless Scheduling”

Title NL: “Plan afspraken moeiteloos”

Desc EN: “Drag-and-drop your appointments into a shared calendar. Get automatic reminders so you and your customers never miss a booking.”

Desc NL: “Sleep afspraken in een gedeelde kalender en krijg automatische herinneringen. Zo mist niemand een afspraak – u niet en uw klant ook niet.”
(Emphasizes easy planning. Dutch version addresses user formally and conveys the same idea.)

Feature 2 – Quotes & Invoicing:

Title EN: “Instant Quotes & Invoices”

Title NL: “Offertes en facturen in één klik”

Desc EN: “Generate professional quotes and invoices with one click. Track payments and send paperwork digitally – no more chasing clients with paper bills.”

Desc NL: “Genereer professionele offertes en facturen met één klik. Volg betalingen en stuur alles digitaal – nooit meer achter klanten aan met papieren facturen.”
(Focus on speed and convenience of financial paperwork. Dutch translated accordingly.)

Feature 3 – Communication:

Title EN: “Real-time Communication”

Title NL: “Direct klantcontact”

Desc EN: “Keep your clients in the loop. Plumbing Agent integrates WhatsApp messaging, so you can send updates and get approvals instantly from anywhere.”

Desc NL: “Houd uw klanten op de hoogte. Plumbing Agent integreert met WhatsApp, zodat u altijd en overal updates kunt sturen en direct bevestiging krijgt.”
(Stresses immediate customer comms via WhatsApp. Dutch uses formal form.)

Closing Section Prompt (if used):

EN: “Ready to transform your plumbing business? Schedule a free demo today and see how Plumbing Agent can work for you.”

NL: “Klaar om uw loodgietersbedrijf te transformeren? Plan vandaag een gratis demo en ontdek wat Plumbing Agent voor u kan betekenen.”
(Encourages final action. “Transform”/“transformeren” to imply improvement.)

Footer (if any text aside from copyright):

EN: “© 2025 Plumbing Agent – All rights reserved.” (and maybe a link to “Privacy Policy”)

NL: “© 2025 Plumbing Agent – Alle rechten voorbehouden.”
(Standard footer line, translated.)

All the above copy should be reviewed and adjusted to ensure it resonates with Dutch plumbers (e.g., we chose formal tone “u”; if a friendly tone is preferred, switch to “je/jouw” consistently in Dutch texts). Once finalized, these strings go into the translation JSON files and are used in the components as outlined in the epic.