/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./studio.html",
    "./studio-editor.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./features/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Dashboard colors as requested
        autopilot: '#3B82F6',
        idea: '#8B5CF6', 
        scripting: '#F59E0B',
        rendering: '#10B981',
        scheduled: '#F97316',
        published: '#06B6D4',
        failed: '#EF4444'
      }
    },
  },
  plugins: [],
  safelist: [
    // Safelist common patterns to prevent purging
    { pattern: /^(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{1,3}$/ },
    { pattern: /(w|h)-\d+|col-span-\d+|row-span-\d+/ },
    { pattern: /^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr)-\d+$/ },
    { pattern: /^(flex|grid|block|inline|hidden|visible)$/ },
    { pattern: /^(justify|items|content|self)-(start|end|center|between|around|evenly)$/ },
    { pattern: /^(space|divide)-(x|y)-\d+$/ },
    // Dashboard color patterns
    { pattern: /^(bg|text|border)-(autopilot|idea|scripting|rendering|scheduled|published|failed)$/ }
  ]
}
