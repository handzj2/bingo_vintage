// postcss.config.js
//
// FIX: Turbopack (Next.js 14 dev mode) fails to load tailwindcss when
// the plugin is specified as a bare string key in the plugins object.
// Error: "Failed to load external module tailwindcss: SyntaxError: Invalid or unexpected token"
//
// Root cause: uuid@13 and tailwindcss@3 ship as ES modules.
// Turbopack's PostCSS loader uses a different module resolution path
// than webpack and cannot resolve bare string plugin names the same way.
//
// Fix: Use require() to load the plugins explicitly, giving Turbopack
// a direct CommonJS-compatible handle to each plugin.
//
// This is the documented fix for Next.js 14 + Tailwind CSS v3 + Turbopack:
// https://nextjs.org/docs/app/guides/css#tailwind-css

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
