# txt2fit Web App

A modern React-based web application for creating FIT workout files for cycling computers and smart trainers.

**Live Demo:** (Coming soon - deploy to Vercel)

## Features

- ✅ Real-time workout text parsing with syntax highlighting
- ✅ Live preview with power/cadence calculations
- ✅ Client-side FIT file generation (no server needed)
- ✅ Download generated FIT files
- ✅ Dark theme with plasma pink accents (inspired by Scott Sports Plasma)
- ✅ Responsive design for desktop and tablet
- 🔄 Coming soon: User accounts, saved workouts, graphs, AI coach

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth + Database)
- **Hosting**: Vercel
- **Build**: Vite

## Getting Started

### Prerequisites

- Node.js 16+ or pnpm
- A Supabase account (optional - for user features)

### 1. Install Dependencies

```bash
cd web
npm install
```

or with pnpm:

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Optional: Add your Supabase credentials for auth features (you'll need to set these up):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## Usage

1. **Edit the workout text** in the left panel using the supported syntax
2. **Preview updates in real-time** on the right panel
3. **Download the FIT file** with the pink download button
4. **Upload to your device** (Hammerhead Karoo, Wahoo, Garmin, etc.)

### Workout Text Format

```
warmup 10min                          # Warmup block (40% → 75% FTP)
3x 5min 95% FTP @90rpm "Hold steady"  # Repeat 3 times: 5min at 95% FTP, 90 RPM target
2min 50% FTP                          # 2min recovery at 50% FTP
cooldown 5min                         # Cooldown block (65% → 40% FTP)
```

**Syntax:**
- `duration`: `30s`, `5min`, `1.5h`
- `power`: `80% FTP`, `85-95% FTP` (range), `50% - 80% FTP` (ramp)
- `cadence`: `@90rpm`, `@85-95rpm`
- `repeat`: `3x 5min 95% FTP`
- `special blocks`: `warmup`, `cooldown`, `recovery`, `open`
- `notes`: `"Hold steady"` (shown on device)
- `comments`: Lines starting with `#` or `//`

## Project Structure

```
web/
├── src/
│   ├── components/           # React components
│   │   ├── Editor.tsx       # Workout text input
│   │   ├── Preview.tsx      # Workout breakdown display
│   │   ├── DownloadButton.tsx
│   │   ├── Navbar.tsx
│   │   ├── AuthModal.tsx
│   │   └── Notifications.tsx
│   ├── lib/                 # Utilities and logic
│   │   ├── fit-generator.ts # FIT file generation
│   │   ├── fit-types.ts     # FIT protocol types
│   │   ├── workout-parser.ts # Text parsing
│   │   └── supabase.ts      # Supabase client
│   ├── store/               # Zustand stores
│   │   ├── authStore.ts
│   │   ├── workoutStore.ts
│   │   └── uiStore.ts
│   ├── types/               # TypeScript types
│   ├── styles/              # CSS
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Development

### Code Quality

```bash
# Run linter
npm run lint

# Format code
npm run format
```

### Build for Production

```bash
npm run build
```

Output goes to `dist/` folder.

## Deployment to Vercel

1. Push your code to GitHub
2. Connect the repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

```bash
# Or deploy directly
vercel
```

## Setting Up Supabase (Optional)

For user accounts and saved workouts:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your URL and anon key
3. Add them to `.env.local`
4. Database schema will be created when needed

## FIT Protocol Implementation

The FIT generator is a TypeScript port of the original Python `workout_creator.py`:

- **Power encoding**: 0-1000 scale (0-100% FTP)
- **Duration**: In seconds
- **Cadence**: RPM
- **Intensity classification**: Automatic based on power levels

For technical details, see `src/lib/fit-types.ts` and `src/lib/fit-generator.ts`.

## Testing

1. **Local testing**: Download generated `.fit` files and verify with cycling computers
2. **Example workouts**: Use the format examples in the Editor help section
3. **Device compatibility**: Test with your specific device (Karoo, Wahoo, Garmin, etc.)

## Troubleshooting

### App won't start

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run dev
```

### FIT file won't open on device

- Ensure file extension is `.fit`
- Try uploading via device's web interface (more reliable than USB copy)
- Check device compatibility (ANT+ FE-C smart trainers)

### Supabase not working

- Verify `.env.local` has correct credentials
- Check Supabase project is active
- Browser console may show detailed errors

## Contributing

Issues and PRs welcome! Please test locally before submitting.

## License

MIT - Same as parent project

## Next Steps

- [ ] Phase 2: User dashboard with saved workouts
- [ ] Phase 3: Graphs and analytics
- [ ] Phase 4: AI cycling coach
- [ ] Phase 5: Device direct integration
