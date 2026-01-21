# FIT Workout Creator

A robust, production-ready Python tool for creating `.FIT` workout files for bike trainers from simple text input. Designed for **Hammerhead Karoo** + **Cycplus T3** (ANT+ FE-C) and compatible with most cycling computers.

## Features

| Feature | Description |
|---------|-------------|
| **Power Targets** | % FTP with ERG mode trainer control |
| **Cadence Targets** | Secondary target displayed alongside power |
| **Heart Rate Targets** | Absolute (bpm) or % of max HR |
| **Open Intervals** | Free ride sections for FTP tests |
| **Ramps** | Progressive power from start to end |
| **Power Ranges** | Target zone (e.g., 85-95% FTP) |
| **Step Notes** | Instructions displayed on device |
| **Repeat Blocks** | `3x` syntax for interval sets |
| **Auto Warmup/Cooldown** | Sensible defaults with one keyword |
| **Intensity Classification** | Proper FIT intensity tags |

## Installation

```bash
pip install fit-tool
```

Download `workout_creator.py` to your preferred location.

## Quick Start

1. Create a workout file (`my_workout.txt`):
```
warmup 10min
3x 5min 95% FTP @90rpm "Hold steady"
2min 50% FTP
cooldown 5min
```

2. Generate the FIT file:
```bash
python workout_creator.py my_workout.txt -o my_workout.fit --name "Threshold Intervals"
```

3. Upload to Hammerhead Dashboard or copy to device

---

## Input Format Reference

### Duration
| Format | Example | Result |
|--------|---------|--------|
| Seconds | `30s`, `45sec` | 30/45 seconds |
| Minutes | `5min`, `10m` | 5/10 minutes |
| Hours | `1h`, `1.5hr` | 1/1.5 hours |

### Power Targets
| Format | Example | Description |
|--------|---------|-------------|
| Steady | `80% FTP` | Constant power |
| Range | `85-95% FTP` | Target zone |
| Ramp | `50% - 80% FTP` | Progressive increase |

### Cadence Targets (Secondary)
| Format | Example | Description |
|--------|---------|-------------|
| Single | `@90rpm` | Target 90 RPM |
| Range | `@85-95rpm` | Target 85-95 RPM |

### Heart Rate Targets
| Format | Example | Description |
|--------|---------|-------------|
| Absolute | `150 bpm` | Target 150 BPM |
| Absolute range | `140-160 bpm` | Target 140-160 BPM |
| % Max HR | `75% HR` | 75% of max HR |
| % Range | `70-80% HR` | 70-80% of max HR |

### Step Notes
```
5min 100% FTP "Hold it steady!"
3min 120% FTP "Push through the burn"
```
Notes appear on the device display during the interval.

### Special Blocks
| Keyword | Power | Description |
|---------|-------|-------------|
| `warmup` | 40→75% FTP | Gradual ramp up |
| `cooldown` | 65→40% FTP | Gradual ramp down |
| `recovery` | 50% FTP | Easy spinning |
| `open` / `free` | No target | Free ride |

### Repeats
```
3x 5min 100% FTP    # Repeat 3 times
5x 1min 120% FTP    # 5 hard efforts
```

### Intensity Keywords
Add these to any line to override automatic classification:
- `warmup`, `cooldown` - Warm-up/cool-down
- `recovery`, `rest`, `easy` - Recovery
- `endurance`, `tempo`, `threshold`, `sweetspot` - Active
- `vo2`, `vo2max`, `interval`, `sprint`, `anaerobic` - High intensity

### Comments
```
# This is a comment
// This is also a comment
```

---

## Example Workouts

### Sweet Spot 3x15
```
warmup 10min
2min 60% FTP
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

### Cadence Pyramid (Leg Speed)
```
warmup 10min
2min 70% FTP @100rpm "Smooth"
2min 70% FTP @110rpm "Relax"
2min 70% FTP @120rpm "Quick feet!"
recovery 3min
2min 70% FTP @110rpm
2min 70% FTP @100rpm
cooldown 5min
```

### Low Cadence Force Work
```
warmup 10min
3x 5min 85% FTP @55-60rpm "Big gear, seated"
3min 50% FTP @90rpm
cooldown 5min
```

### FTP Test (20 minute)
```
warmup 20min
5min 100% FTP "Blow out the legs"
10min 50% FTP
5min open "Get ready"
20min open "All out effort!"
cooldown 15min
```

### Heart Rate Endurance
```
warmup 15min
45min 65-75% HR @85-95rpm "Zone 2 - conversational"
cooldown 10min
```

### Over-Under Threshold
```
warmup 15min
3x 8min 95% FTP @90rpm "Under"
2min 105% FTP @95rpm "Over"
recovery 5min
cooldown 10min
```

---

## CLI Usage

```bash
# Basic usage
python workout_creator.py workout.txt -o output.fit

# With workout name
python workout_creator.py workout.txt -o output.fit --name "My Workout"

# Verbose mode with FTP/HR reference
python workout_creator.py workout.txt -v --ftp 250 --max-hr 185

# From stdin
echo "10min 90% FTP @90rpm" | python workout_creator.py - -o quick.fit
```

### Arguments

| Argument | Description |
|----------|-------------|
| `input` | Input file path or `-` for stdin |
| `-o, --output` | Output .FIT file path |
| `-n, --name` | Workout name (shown on device) |
| `--ftp` | Your FTP in watts (for verbose display) |
| `--max-hr` | Your max HR in bpm (for verbose display) |
| `-v, --verbose` | Show detailed workout breakdown |

---

## Device Compatibility

### Tested
- ✅ Hammerhead Karoo 2/3
- ✅ Cycplus T3 (ANT+ FE-C)

### Should Work
- Garmin Edge series
- Wahoo ELEMNT/BOLT
- Any ANT+ FE-C smart trainer

### Karoo-Specific Notes
- Upload via [Hammerhead Dashboard](https://dashboard.hammerhead.io) → Workouts → Add Workout
- Or copy `.fit` file directly to device
- Power targets control ERG mode automatically
- Cadence shows as secondary target
- Notes display during intervals

---

## Technical Details

### FIT Protocol

**Power encoding**: FIT uses 0-1000 scale for % FTP
- 0 = 0% FTP
- 500 = 50% FTP  
- 1000 = 100% FTP

**Heart rate encoding**:
- % of max: 0-100 direct value
- Absolute: 100 + BPM (e.g., 150 BPM = 250)

**Repeat blocks**: Uses `REPEAT_UNTIL_STEPS_CMPLT` duration type

### File Structure
```
FIT Header
├── FileIdMessage (type=WORKOUT)
├── WorkoutMessage (name, sport, step count)
└── WorkoutStepMessage[] (intervals)
    ├── duration_type, duration_time
    ├── target_type (POWER/HEART_RATE/CADENCE/OPEN)
    ├── custom_target_*_low/high
    ├── custom_target_cadence_low/high (secondary)
    ├── intensity
    └── notes
```

---

## API Usage

```python
from workout_creator import create_workout_fit, Workout, WorkoutStep, StepType, TargetType

# From text
workout_text = """
warmup 10min
3x 5min 95% FTP @90rpm
cooldown 5min
"""
fit_bytes = create_workout_fit(workout_text, "My Workout", "output.fit")

# Programmatic
steps = [
    WorkoutStep(
        step_type=StepType.STEADY,
        duration_seconds=600,
        target_type=TargetType.POWER,
        power_low_pct=90,
        power_high_pct=90,
        cadence_low=90,
        cadence_high=95,
        name="Threshold",
        notes="Hold it!"
    ),
]
workout = Workout("Custom", steps)
builder = FitWorkoutBuilder(workout)
fit_bytes = builder.build()
```

---

## Project Structure

```
fit_workout_creator/
├── workout_creator.py      # Main application
├── requirements.txt        # Dependencies
├── README.md              # This file
└── examples/
    ├── sweetspot_3x10.txt/.fit
    ├── vo2max_5x3.txt/.fit
    ├── ramp_test.txt/.fit
    ├── over_under.txt/.fit
    ├── cadence_pyramid.txt/.fit
    └── hr_endurance.txt/.fit
```

---

## Troubleshooting

### Workout doesn't appear on Karoo
- Ensure file extension is `.fit`
- Upload via Dashboard, not direct file copy (more reliable)
- Check workout sport is "Cycling" not "Mountain Bike"

### ERG mode not controlling trainer
- Connect trainer as "Controllable" not just "Power"
- Verify ANT+ FE-C connection (not Bluetooth power)
- Check trainer is in ERG mode, not resistance/slope

### Cadence target not showing
- Karoo shows cadence as secondary target
- Primary must be power or HR
- Check workout has cadence values in FIT file

### Power seems wrong
- FIT uses % FTP, device calculates watts
- Verify FTP is set correctly on device
- Some trainers have ±5% tolerance

### Values 10x too large/small
If power, HR, or duration values appear significantly off by a factor of 10, check the FIT scaling constants in `workout_creator.py`:
```python
FTP_SCALE = 1              # multiply % by this to get FIT value
HR_ABSOLUTE_OFFSET = 100   # offset for absolute HR values
DURATION_MS_SCALE = 1000   # duration in milliseconds in FIT protocol
```
These map workout percentages/values to FIT protocol encoding. If values are consistently 10x off on your device, these constants may need adjustment for your specific trainer/device combination.

---

## Future Plans

This tool is part of a workout management system:

1. ✅ **Create workouts** - This tool
2. 🔄 **Upload to device** - Manual (Dashboard/USB)
3. 📊 **Analyze completed workouts** - Coming soon
4. 🤖 **AI workout recommendations** - Coming soon

---

## License

MIT License - free to use and modify.

## Contributing

Issues and PRs welcome!
