# WattScript

**Script power-based cycling workouts and download FIT files for Garmin, Wahoo, and Hammerhead devices.**

WattScript is a modern workout creation platform for cyclists. Write workouts in simple text format and generate industry-standard FIT files compatible with all major cycling computers and smart trainers.

---

## 🌐 Web App (Recommended)

**Live at:** [wattscript.vercel.app](https://wattscript.vercel.app) *(or your deployed URL)*

- 🎨 Modern React interface with real-time preview
- 📊 Interactive power profile graph with zone visualization
- 💾 Download FIT files instantly
- 🔄 Progressive power ramps (85-95% FTP)
- 🎯 Full power zone support with color coding
- 📱 Responsive design for desktop and mobile

### Quick Start (Web)

1. Visit the web app
2. Set your FTP (Functional Threshold Power)
3. Write your workout using the text format:
   ```
   warmup 10min
   5min 85-95% FTP "ramp up"
   3x 5min 95% FTP @90rpm
   cooldown 5min
   ```
4. Download the FIT file
5. Upload to your cycling computer

---

## 🐍 Python CLI (Advanced)

For automation, scripting, or programmatic workout generation.

### Installation

```bash
pip install fit-tool
```

### Usage

```bash
python workout_creator.py my_workout.txt -o output.fit --name "Threshold Intervals"
```

See [Python CLI Documentation](#python-cli-reference) below for full details.

---

## 📝 Workout Text Format

### Basic Structure

```
<duration> <power> [cadence] ["notes"] [repeats]
```

### Duration
- `30s`, `45sec` - Seconds
- `5min`, `10m` - Minutes
- `1h`, `1.5hr` - Hours

### Power Targets
- `90% FTP` - Steady power
- `85-95% FTP` - Progressive ramp (increases from 85% to 95%)
- `@90rpm` - Optional cadence target

### Special Keywords
- `warmup 10min` - Auto 40→75% FTP ramp
- `cooldown 5min` - Auto 65→40% FTP ramp
- `recovery 3min` - 50% FTP easy spin

### Repeats
- `3x 5min 95% FTP` - Repeat 3 times
- `5x 1min 120% FTP` - 5 hard efforts

### Notes
- `5min 100% FTP "Hold it steady!"` - Shows on device display

---

## 📊 Example Workouts

### Sweet Spot 3x15
```
warmup 10min
3x 15min 88% FTP @85-95rpm "Stay smooth"
2min 50% FTP
cooldown 5min
```

### VO2max Intervals
```
warmup 15min
5x 3min 120% FTP @95-100rpm "All out!"
3min 50% FTP
cooldown 10min
```

### Progressive Ramp
```
warmup 10min
10min 70-95% FTP "Build gradually"
5min 50% FTP
cooldown 5min
```

More examples in [`examples/`](./examples/)

---

## 🏗️ Project Structure

```
WattScript/
├── web/                    # React web application
│   ├── src/
│   │   ├── components/     # UI components (Navbar, Editor, Preview, Graph)
│   │   ├── lib/            # Core logic (parser, FIT generator)
│   │   ├── store/          # Zustand state management
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── README.md           # Web app setup guide
│
├── examples/               # Example workout files
│   ├── sweetspot_3x10.txt
│   ├── cadence_pyramid.txt
│   └── *.fit               # Pre-generated FIT files
│
├── docs/                   # Documentation
│   ├── VERCEL_SETUP.md     # Deployment guide
│   ├── creation_task.json  # Initial design spec
│   └── future_functions_task.json  # Roadmap
│
├── workout_creator.py      # Python CLI tool
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

---

## 🚀 Development

### Web App

```bash
cd web
npm install
npm run dev
```

Visit `http://localhost:5173`

### Environment Variables

Create `web/.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

See [`web/README.md`](./web/README.md) for details.

---

## 📱 Device Compatibility

### Tested & Working
- ✅ Hammerhead Karoo 2/3
- ✅ Cycplus T3 (ANT+ FE-C)
- ✅ Vercel deployment

### Should Work
- Garmin Edge series
- Wahoo ELEMNT/BOLT
- Any ANT+ FE-C smart trainer

---

## 🛠️ Tech Stack

### Web App
- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Carbon/plasma pink theme
- **Zustand** - State management
- **Supabase** - Authentication (optional)
- **Vercel** - Deployment

### FIT File Generation
- TypeScript port of Python FIT encoder
- Binary protocol implementation
- CRC16 validation
- Supports power, HR, cadence targets

---

## 🎯 Power Zones

WattScript uses standard cycling power zones with custom color coding:

| Zone | % FTP | Color | Intensity |
|------|-------|-------|-----------|
| Recovery | < 55% | Light Purple | Easy spin |
| Endurance | 55-75% | Purple-Pink | Zone 2 |
| Tempo | 75-90% | Light Pink | Zone 3 |
| Threshold | 90-105% | Plasma Pink | FTP |
| VO2max | 105-120% | Hot Pink | Hard |
| Anaerobic | > 120% | Red | Max effort |

---

## 🐍 Python CLI Reference

### Installation
```bash
pip install fit-tool
```

### Basic Usage
```bash
# Generate FIT file
python workout_creator.py workout.txt -o output.fit

# With workout name
python workout_creator.py workout.txt -o output.fit --name "My Workout"

# Verbose mode with FTP reference
python workout_creator.py workout.txt -v --ftp 250 --max-hr 185
```

### Command Line Arguments

| Argument | Description |
|----------|-------------|
| `input` | Input file path or `-` for stdin |
| `-o, --output` | Output .FIT file path |
| `-n, --name` | Workout name (shown on device) |
| `--ftp` | Your FTP in watts (for display only) |
| `--max-hr` | Your max HR in bpm (for display only) |
| `-v, --verbose` | Show detailed workout breakdown |

### Python API

```python
from workout_creator import create_workout_fit

workout_text = """
warmup 10min
3x 5min 95% FTP @90rpm
cooldown 5min
"""

fit_bytes = create_workout_fit(workout_text, "My Workout", "output.fit")
```

---

## 🔧 Technical Details

### FIT Protocol Encoding

**Power (% FTP):**
- Uses 0-100 scale directly
- `50% FTP` = 50 in FIT file
- `100% FTP` = 100 in FIT file

**Ramps:**
- Encoded as `custom_target_value_low` and `custom_target_value_high`
- Device interpolates between values over duration
- `85-95% FTP` = low: 85, high: 95

**Duration:**
- Stored in seconds
- `5min` = 300 seconds in FIT file

### File Structure
```
FIT Header (14 bytes)
├── FileIdMessage (workout type)
├── WorkoutMessage (name, sport, step count)
└── WorkoutStepMessage[] (intervals)
    ├── duration_type, duration_value
    ├── target_type (POWER/HEART_RATE/CADENCE)
    ├── custom_target_value_low/high
    ├── intensity
    └── notes
CRC16 (2 bytes)
```

---

## 🗺️ Roadmap

See [`docs/future_functions_task.json`](./docs/future_functions_task.json) for detailed roadmap.

**Phase 1 (Current):**
- ✅ Text-to-FIT conversion
- ✅ Web interface
- ✅ Power ramps
- ✅ Interactive graph visualization
- ✅ Download FIT files

**Phase 2 (Planned):**
- 🔄 Save workouts to database
- 🔄 Heart rate targets
- 🔄 Workout library/templates
- 🔄 User accounts

**Phase 3 (Future):**
- 🤖 AI workout recommendations
- 📊 Training plan builder
- 📈 Performance analytics
- 🔗 Device sync integration

---

## 📄 License

MIT License - Free to use and modify.

---

## 🤝 Contributing

Issues and PRs welcome! Please:
- Check existing issues first
- Follow the existing code style
- Add tests for new features
- Update documentation

---

## 📚 Documentation

- [Web App Setup](./web/README.md)
- [Vercel Deployment](./docs/VERCEL_SETUP.md)
- [Design Spec](./docs/creation_task.json)
- [Future Features](./docs/future_functions_task.json)

---

## 🙋 Support

Having issues? Check:
1. [GitHub Issues](https://github.com/grint0uc/txt2fit/issues)
2. Ensure FTP is set on your device
3. Verify FIT file uploaded correctly
4. Check device compatibility list

---

**Made with ❤️ for cyclists by cyclists**
