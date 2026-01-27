# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WattScript** is a dual-platform tool for creating FIT workout files for cycling computers and smart trainers. It features:
- Web application (React + TypeScript) for creating workouts with real-time preview
- Python CLI tool for programmatic/automated workout generation
- Custom text-based workout format that compiles to FIT binary files

## Common Commands

### Web App Development
```bash
cd web
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run preview      # Preview production build
```

### Python CLI
```bash
pip install fit-tool                                  # Install dependency
python workout_creator.py input.txt -o output.fit    # Generate FIT file
python workout_creator.py input.txt -v --ftp 250     # Verbose with FTP reference
```

## Architecture

### Dual Implementation Pattern

This project has **two parallel implementations** of the same workout parsing and FIT generation logic:

1. **Python CLI** (`workout_creator.py`) - Standalone script using `fit-tool` library
2. **TypeScript Web** (`web/src/lib/`) - Browser-based implementation

**When modifying workout format or FIT encoding:**
- Changes must be synchronized between both implementations
- Test both Python CLI and web app outputs for compatibility
- The text format parser logic exists in both `workout_creator.py` (Python) and `web/src/lib/workout-parser.ts` (TypeScript)
- The FIT encoding logic exists in both `workout_creator.py` (using fit-tool) and `web/src/lib/fit-generator.ts` (custom implementation)

### Core Workflow

```
User Text Input → Parser → Workout Model → FIT Generator → Binary FIT File
```

1. **Parser** - Converts text format to structured workout steps
2. **Workout Model** - Common data structure (steps, targets, durations)
3. **FIT Generator** - Encodes workout to FIT binary protocol

### Web App Architecture

```
web/
├── src/
│   ├── components/     # UI components (Editor, Preview, WorkoutGraph, Navbar)
│   ├── lib/            # Core business logic (isolated from UI)
│   │   ├── workout-parser.ts    # Text → Workout object
│   │   ├── fit-generator.ts     # Workout → FIT binary
│   │   ├── fit-types.ts         # FIT protocol constants/types
│   │   └── supabase.ts          # Optional auth backend
│   ├── store/          # Zustand state management
│   │   ├── workoutStore.ts      # Workout text, parsed workout, FTP
│   │   ├── authStore.ts         # User authentication
│   │   └── uiStore.ts           # UI state (modals, notifications)
│   └── types/          # Shared TypeScript types
```

**State Management:**
- Uses Zustand (not Redux or Context)
- `workoutStore` persists workout text and FTP to localStorage
- State updates trigger re-parsing and re-rendering

**UI Structure:**
- Split-pane layout: Editor (left) + Preview (right)
- Editor shows raw text with live validation
- Preview shows parsed steps, power graph, and download button
- Graph component renders workout power profile with zone coloring

### Python CLI Architecture

Single-file implementation in `workout_creator.py`:

```python
WorkoutParser      # Parses text → WorkoutStep objects
  ↓
Workout            # Container for steps + metadata
  ↓
FitWorkoutBuilder  # Builds FIT file using fit-tool library
```

### Workout Text Format

The parser accepts a custom text format:

```
<duration> <power_target> [cadence] ["notes"] [repeat]

Examples:
warmup 10min                    # Auto 40-75% FTP ramp
5min 85-95% FTP                 # Progressive ramp
3x 5min 95% FTP @90rpm         # Repeat with cadence
cooldown 5min                   # Auto 65-40% FTP ramp
recovery 3min                   # 50% FTP easy spin
```

**Duration formats:** `10s`, `5min`, `5m`, `1h`, `1.5hr`
**Power formats:** `90% FTP` (steady), `85-95% FTP` (ramp/range)
**Cadence:** `@90rpm`, `@85-95rpm`
**Special keywords:** `warmup`, `cooldown`, `recovery`
**Repeats:** `3x` prefix

### FIT Protocol Implementation

**Critical details:**
- Power is encoded as 0-100 scale (50% FTP = 50 in FIT file, NOT 0.5)
- Duration is in **seconds** for Python, **milliseconds** for messages in TypeScript
- Ramps use `custom_target_value_low` and `custom_target_value_high`
- CRC16 checksum required at end of file
- Message structure: FileIdMessage → WorkoutMessage → WorkoutStepMessage[]

**TypeScript Implementation:**
- Custom binary encoder in `fit-generator.ts` (does not use external library)
- Manual byte-level encoding with proper endianness
- CRC16 calculation in `fit-types.ts`

**Python Implementation:**
- Uses `fit-tool` library for message encoding
- Builder pattern in `FitWorkoutBuilder` class

### Supabase Integration (Optional)

Authentication is **optional** and gracefully degrades if not configured:

```typescript
// web/src/lib/supabase.ts
export const isSupabaseConfigured = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

To enable:
```bash
# web/.env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

All auth features are wrapped in `isSupabaseConfigured` checks.

## Development Workflow

### Adding a New Workout Feature

If adding support for a new feature (e.g., heart rate targets, new special keywords):

1. **Update Parser** - Modify both:
   - `workout_creator.py` (Python regex patterns and parsing logic)
   - `web/src/lib/workout-parser.ts` (TypeScript parsing)

2. **Update Types** - Ensure data models match:
   - Python: `WorkoutStep` dataclass
   - TypeScript: `WorkoutStep` interface in `web/src/types/index.ts`

3. **Update FIT Generator**:
   - Python: `FitWorkoutBuilder._create_single_step()`
   - TypeScript: `FitGenerator.writeWorkoutStepMessage()`

4. **Update UI** (web only):
   - Preview component to display new feature
   - Graph component if visual representation needed

5. **Test Both Platforms**:
   - Generate same workout from Python CLI
   - Generate same workout from web app
   - Compare binary output if possible

### Styling and Theme

- **Framework:** Tailwind CSS
- **Color scheme:** Carbon/plasma pink theme
  - Background: `carbon-950`, `carbon-900`, `carbon-800`
  - Accent: `plasma-pink` (custom colors in tailwind.config.js)
- **Layout:** Split-pane with fixed-width preview panel (600px)
- **Zone colors:** Purple → Pink → Hot Pink → Red based on % FTP

### Testing Devices

Confirmed working:
- Hammerhead Karoo 2/3
- Cycplus T3 (ANT+ FE-C)

Should work (FIT protocol compliant):
- Garmin Edge series
- Wahoo ELEMNT/BOLT
- Any ANT+ FE-C smart trainer

## File Locations

**Core logic (web):**
- `web/src/lib/workout-parser.ts` - Text parsing
- `web/src/lib/fit-generator.ts` - FIT encoding
- `web/src/lib/fit-types.ts` - FIT protocol constants

**Core logic (Python):**
- `workout_creator.py` - Complete CLI implementation

**State management:**
- `web/src/store/workoutStore.ts` - Workout state
- `web/src/store/authStore.ts` - Auth state
- `web/src/store/uiStore.ts` - UI state

**UI Components:**
- `web/src/App.tsx` - Main layout
- `web/src/components/Editor.tsx` - Text input
- `web/src/components/Preview.tsx` - Parsed workout display
- `web/src/components/WorkoutGraph.tsx` - Power profile visualization
- `web/src/components/DownloadButton.tsx` - FIT file generation

**Examples:**
- `examples/sweetspot_3x10.txt`
- `examples/cadence_pyramid.txt`

## Important Constraints

1. **No backwards compatibility needed** - FIT files are device-consumed, not version-controlled
2. **Parser must be permissive** - Users type freeform text, handle variations gracefully
3. **FIT encoding must be exact** - Binary protocol requires precise byte alignment
4. **Web app runs client-side** - All FIT generation happens in browser (no server needed)
5. **Python CLI is standalone** - Single file with minimal dependencies (just fit-tool)

## Common Pitfalls

- **Duration units:** TypeScript duration_seconds should stay in seconds for the model, only convert to milliseconds when writing FIT messages
- **Power scaling:** Don't multiply % FTP by 10 or 1000, use raw percentage (0-100 scale)
- **Message ordering:** FIT requires FileId → Workout → WorkoutSteps in exact order
- **CRC calculation:** Must calculate over entire file except CRC itself
- **String encoding:** FIT strings are null-terminated, account for extra byte
- **Repeat blocks:** Both implementations handle repeats differently (Python uses FIT repeat messages, TypeScript currently expands repeats into individual steps)

## Build Output

**Web:** `web/dist/` - Static files for deployment (Vite build)
**Python:** FIT files in current directory or specified output path
