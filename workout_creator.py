#!/usr/bin/env python3
"""
FIT Workout Creator for Bike Trainers
=====================================

A robust, production-ready tool for creating .FIT workout files from simple text input.
Designed for Hammerhead Karoo and compatible with most cycling computers.

Features:
- Power targets (% FTP) with ERG mode support
- Cadence targets (secondary target)
- Heart rate targets (absolute or % max HR)
- Open/free ride intervals
- Ramps and power ranges
- Step notes/instructions
- Repeat blocks
- Automatic intensity classification

Usage:
    python workout_creator.py workout.txt -o my_workout.fit --name "Sweet Spot"
    python workout_creator.py workout.txt --ftp 250

Author: FIT Workout Creator
License: MIT
"""

import argparse
import datetime
import re
import sys
from dataclasses import dataclass, field
from enum import Enum, auto
from pathlib import Path
from typing import Optional

from fit_tool.fit_file_builder import FitFileBuilder
from fit_tool.profile.messages.file_id_message import FileIdMessage
from fit_tool.profile.messages.workout_message import WorkoutMessage
from fit_tool.profile.messages.workout_step_message import WorkoutStepMessage
from fit_tool.profile.profile_type import (
    FileType,
    Intensity,
    Manufacturer,
    Sport,
    WorkoutStepDuration,
    WorkoutStepTarget,
)


class StepType(Enum):
    """Type of workout step."""
    STEADY = auto()      # Constant power target
    RAMP = auto()        # Power ramp from low to high
    RANGE = auto()       # Power range (target zone)
    OPEN = auto()        # Free ride, no target
    WARMUP = auto()      # Warmup (auto-calculated ramp)
    COOLDOWN = auto()    # Cooldown (auto-calculated ramp)
    RECOVERY = auto()    # Recovery interval
    REPEAT = auto()      # Repeat block marker


class TargetType(Enum):
    """Type of target metric."""
    POWER = auto()       # Power in % FTP
    HEART_RATE = auto()  # Heart rate (absolute or % max)
    CADENCE = auto()     # Cadence in RPM
    OPEN = auto()        # No target


@dataclass
class WorkoutStep:
    """Represents a single workout step."""
    step_type: StepType
    duration_seconds: float

    # Primary target (usually power)
    target_type: TargetType = TargetType.POWER
    power_low_pct: float = 0.0      # % of FTP (e.g., 80 = 80%)
    power_high_pct: float = 0.0     # % of FTP for ramps/ranges

    # Heart rate target (can be primary or used with power)
    hr_target_type: Optional[TargetType] = None
    hr_low: float = 0.0             # BPM or % max HR
    hr_high: float = 0.0
    hr_is_percentage: bool = False  # True if % of max HR

    # Cadence target (secondary)
    cadence_low: Optional[int] = None
    cadence_high: Optional[int] = None

    # Metadata
    name: str = ""
    notes: str = ""                 # Instructions shown on device
    intensity: Optional[Intensity] = None  # Manual override

    # Repeat support
    repeat_count: int = 1
    repeat_steps: list = field(default_factory=list)

    def __post_init__(self):
        # For steady state, high = low if not specified
        if self.step_type == StepType.STEADY and self.power_high_pct == 0.0:
            self.power_high_pct = self.power_low_pct
        # For cadence, set high = low if only one value
        if self.cadence_low is not None and self.cadence_high is None:
            self.cadence_high = self.cadence_low


@dataclass
class Workout:
    """Represents a complete workout."""
    name: str
    steps: list[WorkoutStep]
    sport: Sport = Sport.CYCLING

    @property
    def total_duration_seconds(self) -> float:
        """Calculate total workout duration."""
        total = 0.0
        for step in self.steps:
            if step.step_type == StepType.REPEAT:
                step_duration = sum(s.duration_seconds for s in step.repeat_steps)
                total += step_duration * step.repeat_count
            else:
                total += step.duration_seconds
        return total

    @property
    def total_duration_formatted(self) -> str:
        """Format total duration as HH:MM:SS."""
        total = int(self.total_duration_seconds)
        hours, remainder = divmod(total, 3600)
        minutes, seconds = divmod(remainder, 60)
        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        return f"{minutes}:{seconds:02d}"


class WorkoutParseError(Exception):
    """Raised when workout text cannot be parsed."""
    pass


class WorkoutParser:
    """
    Parses text-based workout definitions into structured WorkoutStep objects.

    Supported formats:
        Duration: Xs, Xmin, Xm, Xh (seconds, minutes, hours)
        Power: X% FTP, X%-Y% FTP, X-Y% FTP (steady, ramp, or range)
        Cadence: @Xrpm, @X-Yrpm (secondary target)
        Heart Rate: X bpm, X-Y bpm, X% HR, X-Y% HR
        Notes: "text in quotes"
        Special: warmup, cooldown, recovery, open, free
        Repeat: Nx (e.g., 3x means repeat 3 times)
        Intensity: warmup, cooldown, recovery, tempo, threshold, interval
    """

    # Regex patterns for parsing
    DURATION_PATTERN = re.compile(
        r'(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)',
        re.IGNORECASE
    )

    POWER_STEADY_PATTERN = re.compile(
        r'(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?ftp',
        re.IGNORECASE
    )

    POWER_RAMP_PATTERN = re.compile(
        r'(\d+(?:\.\d+)?)\s*%?\s*[-–—]+\s*(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?ftp',
        re.IGNORECASE
    )

    POWER_RANGE_PATTERN = re.compile(
        r'(\d+(?:\.\d+)?)\s*[-–—]+\s*(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?ftp',
        re.IGNORECASE
    )

    CADENCE_PATTERN = re.compile(
        r'@\s*(\d+)(?:\s*[-–—]+\s*(\d+))?\s*rpm',
        re.IGNORECASE
    )

    HR_ABSOLUTE_PATTERN = re.compile(
        r'(\d+)(?:\s*[-–—]+\s*(\d+))?\s*bpm',
        re.IGNORECASE
    )

    HR_PERCENTAGE_PATTERN = re.compile(
        r'(\d+)(?:\s*[-–—]+\s*(\d+))?\s*%\s*(?:max\s*)?hr',
        re.IGNORECASE
    )

    NOTES_PATTERN = re.compile(
        r'"([^"]+)"',
        re.IGNORECASE
    )

    REPEAT_PATTERN = re.compile(
        r'^(\d+)\s*x\s+',
        re.IGNORECASE
    )

    # Special keywords and their step types
    SPECIAL_KEYWORDS = {
        'warmup': StepType.WARMUP,
        'warm-up': StepType.WARMUP,
        'warm up': StepType.WARMUP,
        'cooldown': StepType.COOLDOWN,
        'cool-down': StepType.COOLDOWN,
        'cool down': StepType.COOLDOWN,
        'recovery': StepType.RECOVERY,
        'rest': StepType.RECOVERY,
        'open': StepType.OPEN,
        'free': StepType.OPEN,
        'free ride': StepType.OPEN,
        'freeride': StepType.OPEN,
    }

    # Intensity keywords (can be combined with power targets)
    INTENSITY_KEYWORDS = {
        'warmup': Intensity.WARMUP,
        'warm-up': Intensity.WARMUP,
        'cooldown': Intensity.COOLDOWN,
        'cool-down': Intensity.COOLDOWN,
        'recovery': Intensity.RECOVERY,
        'rest': Intensity.RECOVERY,
        'easy': Intensity.RECOVERY,
        'endurance': Intensity.ACTIVE,
        'tempo': Intensity.ACTIVE,
        'threshold': Intensity.ACTIVE,
        'sweetspot': Intensity.ACTIVE,
        'sweet spot': Intensity.ACTIVE,
        'vo2': Intensity.INTERVAL,
        'vo2max': Intensity.INTERVAL,
        'interval': Intensity.INTERVAL,
        'sprint': Intensity.INTERVAL,
        'anaerobic': Intensity.INTERVAL,
    }

    def parse(self, text: str) -> list[WorkoutStep]:
        """
        Parse workout text and return list of WorkoutStep objects.

        Args:
            text: Multi-line workout definition

        Returns:
            List of WorkoutStep objects

        Raises:
            WorkoutParseError: If text cannot be parsed
        """
        steps = []
        lines = [line.strip() for line in text.strip().split('\n') if line.strip()]

        for line_num, line in enumerate(lines, 1):
            # Skip comments
            if line.startswith('#') or line.startswith('//'):
                continue

            try:
                step = self._parse_line(line)
                if step:
                    steps.append(step)
            except Exception as e:
                raise WorkoutParseError(
                    f"Line {line_num}: Failed to parse '{line}' - {e}"
                )

        if not steps:
            raise WorkoutParseError("No valid workout steps found")

        return steps

    def _parse_line(self, line: str) -> Optional[WorkoutStep]:
        """Parse a single line into a WorkoutStep."""
        original_line = line

        # Extract notes first (text in quotes)
        notes = ""
        notes_match = self.NOTES_PATTERN.search(line)
        if notes_match:
            notes = notes_match.group(1)
            line = line[:notes_match.start()] + line[notes_match.end():]

        # Check for repeat pattern (e.g., "3x 2min 100% FTP")
        repeat_match = self.REPEAT_PATTERN.match(line)
        repeat_count = 1
        if repeat_match:
            repeat_count = int(repeat_match.group(1))
            line = line[repeat_match.end():].strip()

        # Check for intensity keywords
        manual_intensity = None
        lower_line = line.lower()
        for keyword, intensity in self.INTENSITY_KEYWORDS.items():
            if keyword in lower_line:
                manual_intensity = intensity
                break

        # Check for special keywords (open, warmup, etc.)
        for keyword, step_type in self.SPECIAL_KEYWORDS.items():
            if keyword in lower_line:
                duration = self._parse_duration(line)
                if duration is None:
                    raise WorkoutParseError(f"No duration found in: {original_line}")

                step = self._create_special_step(step_type, duration, notes)
                if manual_intensity:
                    step.intensity = manual_intensity

                if repeat_count > 1:
                    return WorkoutStep(
                        step_type=StepType.REPEAT,
                        duration_seconds=0,
                        repeat_count=repeat_count,
                        repeat_steps=[step],
                        name=f"{repeat_count}x {step.name}"
                    )
                return step

        # Parse duration (required for all other steps)
        duration = self._parse_duration(line)
        if duration is None:
            raise WorkoutParseError(f"No duration found in: {original_line}")

        # Parse cadence target (secondary)
        cadence_low, cadence_high = None, None
        cadence_match = self.CADENCE_PATTERN.search(line)
        if cadence_match:
            cadence_low = int(cadence_match.group(1))
            cadence_high = int(cadence_match.group(2)) if cadence_match.group(2) else cadence_low

        # Parse heart rate target
        hr_low, hr_high, hr_is_pct = 0.0, 0.0, False
        hr_target_type = None

        hr_pct_match = self.HR_PERCENTAGE_PATTERN.search(line)
        hr_abs_match = self.HR_ABSOLUTE_PATTERN.search(line)

        if hr_pct_match:
            hr_low = float(hr_pct_match.group(1))
            hr_high = float(hr_pct_match.group(2)) if hr_pct_match.group(2) else hr_low
            hr_is_pct = True
            hr_target_type = TargetType.HEART_RATE
        elif hr_abs_match:
            hr_low = float(hr_abs_match.group(1))
            hr_high = float(hr_abs_match.group(2)) if hr_abs_match.group(2) else hr_low
            hr_is_pct = False
            hr_target_type = TargetType.HEART_RATE

        # Parse power target (ramp, range, or steady)
        ramp_match = self.POWER_RAMP_PATTERN.search(line)
        range_match = self.POWER_RANGE_PATTERN.search(line)
        steady_match = self.POWER_STEADY_PATTERN.search(line)

        step = None

        if ramp_match:
            power_low = float(ramp_match.group(1))
            power_high = float(ramp_match.group(2))
            step = WorkoutStep(
                step_type=StepType.RAMP,
                duration_seconds=duration,
                target_type=TargetType.POWER,
                power_low_pct=power_low,
                power_high_pct=power_high,
                name=f"Ramp {power_low:.0f}%-{power_high:.0f}%",
                notes=notes,
                cadence_low=cadence_low,
                cadence_high=cadence_high,
                hr_target_type=hr_target_type,
                hr_low=hr_low,
                hr_high=hr_high,
                hr_is_percentage=hr_is_pct,
            )
        elif range_match:
            power_low = float(range_match.group(1))
            power_high = float(range_match.group(2))
            step = WorkoutStep(
                step_type=StepType.RANGE,
                duration_seconds=duration,
                target_type=TargetType.POWER,
                power_low_pct=power_low,
                power_high_pct=power_high,
                name=f"{power_low:.0f}-{power_high:.0f}% FTP",
                notes=notes,
                cadence_low=cadence_low,
                cadence_high=cadence_high,
                hr_target_type=hr_target_type,
                hr_low=hr_low,
                hr_high=hr_high,
                hr_is_percentage=hr_is_pct,
            )
        elif steady_match:
            power = float(steady_match.group(1))
            step = WorkoutStep(
                step_type=StepType.STEADY,
                duration_seconds=duration,
                target_type=TargetType.POWER,
                power_low_pct=power,
                power_high_pct=power,
                name=f"{power:.0f}% FTP",
                notes=notes,
                cadence_low=cadence_low,
                cadence_high=cadence_high,
                hr_target_type=hr_target_type,
                hr_low=hr_low,
                hr_high=hr_high,
                hr_is_percentage=hr_is_pct,
            )
        elif hr_target_type:
            # HR-only step (no power target)
            if hr_is_pct:
                name = f"{hr_low:.0f}%-{hr_high:.0f}% HR" if hr_low != hr_high else f"{hr_low:.0f}% HR"
            else:
                name = f"{hr_low:.0f}-{hr_high:.0f} bpm" if hr_low != hr_high else f"{hr_low:.0f} bpm"
            step = WorkoutStep(
                step_type=StepType.STEADY,
                duration_seconds=duration,
                target_type=TargetType.HEART_RATE,
                hr_target_type=hr_target_type,
                hr_low=hr_low,
                hr_high=hr_high,
                hr_is_percentage=hr_is_pct,
                name=name,
                notes=notes,
                cadence_low=cadence_low,
                cadence_high=cadence_high,
            )
        else:
            raise WorkoutParseError(f"No power or HR target found in: {original_line}")

        # Apply manual intensity if specified
        if manual_intensity:
            step.intensity = manual_intensity

        if repeat_count > 1:
            return WorkoutStep(
                step_type=StepType.REPEAT,
                duration_seconds=0,
                repeat_count=repeat_count,
                repeat_steps=[step],
                name=f"{repeat_count}x {step.name}"
            )

        return step

    def _parse_duration(self, line: str) -> Optional[float]:
        """Extract duration in seconds from line."""
        match = self.DURATION_PATTERN.search(line)
        if not match:
            return None

        value = float(match.group(1))
        unit = match.group(2).lower()

        if unit in ('s', 'sec', 'second', 'seconds'):
            return value
        elif unit in ('m', 'min', 'minute', 'minutes'):
            return value * 60
        elif unit in ('h', 'hr', 'hour', 'hours'):
            return value * 3600

        return None

    def _create_special_step(self, step_type: StepType, duration: float, notes: str = "") -> WorkoutStep:
        """Create a special step (warmup, cooldown, recovery, open) with default values."""
        if step_type == StepType.WARMUP:
            return WorkoutStep(
                step_type=StepType.RAMP,
                duration_seconds=duration,
                target_type=TargetType.POWER,
                power_low_pct=40,
                power_high_pct=75,
                name="Warmup",
                notes=notes or "Easy spin, gradually increase effort",
                intensity=Intensity.WARMUP,
            )
        elif step_type == StepType.COOLDOWN:
            return WorkoutStep(
                step_type=StepType.RAMP,
                duration_seconds=duration,
                target_type=TargetType.POWER,
                power_low_pct=65,
                power_high_pct=40,
                name="Cooldown",
                notes=notes or "Easy spin, relax",
                intensity=Intensity.COOLDOWN,
            )
        elif step_type == StepType.RECOVERY:
            return WorkoutStep(
                step_type=StepType.STEADY,
                duration_seconds=duration,
                target_type=TargetType.POWER,
                power_low_pct=50,
                power_high_pct=50,
                name="Recovery",
                notes=notes or "Easy spinning, recover",
                intensity=Intensity.RECOVERY,
            )
        elif step_type == StepType.OPEN:
            return WorkoutStep(
                step_type=StepType.OPEN,
                duration_seconds=duration,
                target_type=TargetType.OPEN,
                name="Free Ride",
                notes=notes or "Ride at your own pace",
                intensity=Intensity.ACTIVE,
            )

        raise ValueError(f"Unknown special step type: {step_type}")


class FitWorkoutBuilder:
    """
    Builds FIT workout files from parsed workout data.

    Handles the complexity of FIT file format including:
    - Power targets as percentage of FTP (0-1000 scale)
    - Heart rate targets (absolute or % max)
    - Proper message ordering and structure
    - Repeat steps and nested structures

    Note: Cadence as secondary target requires secondary_target_* fields
    which are not yet supported in fit-tool library. Cadence values are
    stored in step notes for display purposes.
    """

    # FIT uses 0-100 scale for percentage of FTP
    # 0 = 0%, 100 = 100%
    FTP_SCALE = 1  # multiply % by this to get FIT value

    # HR offset for absolute values (FIT protocol)
    HR_ABSOLUTE_OFFSET = 100

    # Duration is in milliseconds in FIT protocol
    DURATION_MS_SCALE = 1000

    def __init__(self, workout: Workout):
        self.workout = workout
        self.step_index = 0

    def build(self) -> bytes:
        """
        Build the FIT file and return as bytes.

        Returns:
            FIT file content as bytes
        """
        builder = FitFileBuilder(auto_define=True, min_string_size=50)

        # File ID message
        file_id = self._create_file_id()
        builder.add(file_id)

        # Workout message
        workout_msg = self._create_workout_message()
        builder.add(workout_msg)

        # Workout steps
        steps = self._create_workout_steps()
        builder.add_all(steps)

        fit_file = builder.build()
        return fit_file.to_bytes()

    def _create_file_id(self) -> FileIdMessage:
        """Create the file ID message."""
        file_id = FileIdMessage()
        file_id.type = FileType.WORKOUT
        file_id.manufacturer = Manufacturer.DEVELOPMENT.value
        file_id.product = 0
        file_id.time_created = round(datetime.datetime.now().timestamp() * 1000)
        file_id.serial_number = 0x12345678
        return file_id

    def _create_workout_message(self) -> WorkoutMessage:
        """Create the workout header message."""
        workout = WorkoutMessage()
        workout.workout_name = self.workout.name
        workout.sport = self.workout.sport
        workout.num_valid_steps = self._count_valid_steps()
        return workout

    def _count_valid_steps(self) -> int:
        """Count total number of workout steps including repeat expansions."""
        count = 0
        for step in self.workout.steps:
            if step.step_type == StepType.REPEAT:
                # Repeat block: count the repeat marker + inner steps
                count += 1 + len(step.repeat_steps)
            else:
                count += 1
        return count

    def _create_workout_steps(self) -> list[WorkoutStepMessage]:
        """Create all workout step messages."""
        messages = []
        self.step_index = 0

        for step in self.workout.steps:
            if step.step_type == StepType.REPEAT:
                messages.extend(self._create_repeat_steps(step))
            else:
                messages.append(self._create_single_step(step))

        return messages

    def _create_single_step(self, step: WorkoutStep) -> WorkoutStepMessage:
        """Create a single workout step message."""
        msg = WorkoutStepMessage()
        msg.message_index = self.step_index
        self.step_index += 1

        # Set step name
        msg.workout_step_name = step.name or f"Step {msg.message_index + 1}"

        # Build notes - include cadence target in notes since secondary_target
        # fields are not supported in fit-tool library
        notes_parts = []
        if step.notes:
            notes_parts.append(step.notes)
        if step.cadence_low is not None:
            if step.cadence_low == step.cadence_high:
                notes_parts.append(f"Cadence: {step.cadence_low} rpm")
            else:
                notes_parts.append(f"Cadence: {step.cadence_low}-{step.cadence_high} rpm")

        if notes_parts:
            msg.notes = " | ".join(notes_parts)

        # Duration - FIT uses milliseconds!
        msg.duration_type = WorkoutStepDuration.TIME
        msg.duration_value = int(step.duration_seconds * self.DURATION_MS_SCALE)

        # Set target based on type
        if step.target_type == TargetType.OPEN or step.step_type == StepType.OPEN:
            msg.target_type = WorkoutStepTarget.OPEN
            msg.target_value = 0
        elif step.target_type == TargetType.HEART_RATE:
            msg.target_type = WorkoutStepTarget.HEART_RATE
            if step.hr_is_percentage:
                # Percentage of max HR (0-100 range in FIT)
                msg.custom_target_value_low = int(step.hr_low)
                msg.custom_target_value_high = int(step.hr_high)
            else:
                # Absolute HR: FIT uses 100 + bpm for absolute values
                msg.custom_target_value_low = int(step.hr_low) + self.HR_ABSOLUTE_OFFSET
                msg.custom_target_value_high = int(step.hr_high) + self.HR_ABSOLUTE_OFFSET
            msg.target_value = 0
        else:
            # Power target (default)
            msg.target_type = WorkoutStepTarget.POWER

            # FIT uses 0-1000 for % of FTP
            power_low = int(step.power_low_pct * self.FTP_SCALE)
            power_high = int(step.power_high_pct * self.FTP_SCALE)

            msg.custom_target_value_low = power_low
            msg.custom_target_value_high = power_high

            # Set target_value to 0 for custom targets (as per Garmin SDK)
            msg.target_value = 0

        # Intensity classification
        msg.intensity = self._get_intensity(step)

        return msg

    def _create_repeat_steps(self, step: WorkoutStep) -> list[WorkoutStepMessage]:
        """Create messages for a repeat block."""
        messages = []

        # First, add the inner steps
        inner_start_index = self.step_index
        for inner_step in step.repeat_steps:
            messages.append(self._create_single_step(inner_step))

        # Then add the repeat marker that points back to first inner step
        repeat_msg = WorkoutStepMessage()
        repeat_msg.message_index = self.step_index
        self.step_index += 1

        repeat_msg.workout_step_name = f"Repeat {step.repeat_count}x"
        repeat_msg.duration_type = WorkoutStepDuration.REPEAT_UNTIL_STEPS_CMPLT
        repeat_msg.duration_step = inner_start_index  # Index of first step to repeat
        repeat_msg.target_type = WorkoutStepTarget.OPEN
        repeat_msg.target_value = step.repeat_count  # Number of repetitions
        repeat_msg.intensity = Intensity.ACTIVE

        messages.append(repeat_msg)

        return messages

    def _get_intensity(self, step: WorkoutStep) -> Intensity:
        """Determine intensity classification for a step."""
        # Use manual override if set
        if step.intensity is not None:
            return step.intensity

        # For open steps
        if step.step_type == StepType.OPEN:
            return Intensity.ACTIVE

        # For HR-only steps, default to active
        if step.target_type == TargetType.HEART_RATE:
            return Intensity.ACTIVE

        # Classify based on power
        avg_power = (step.power_low_pct + step.power_high_pct) / 2

        if step.step_type == StepType.WARMUP or 'warmup' in step.name.lower():
            return Intensity.WARMUP
        elif step.step_type == StepType.COOLDOWN or 'cooldown' in step.name.lower():
            return Intensity.COOLDOWN
        elif step.step_type == StepType.RECOVERY or avg_power < 56:
            return Intensity.RECOVERY
        elif avg_power >= 106:
            return Intensity.INTERVAL
        else:
            return Intensity.ACTIVE


def create_workout_fit(
    workout_text: str,
    workout_name: str = "Custom Workout",
    output_path: Optional[str] = None
) -> bytes:
    """
    Create a FIT workout file from text input.

    Args:
        workout_text: Text definition of the workout
        workout_name: Name for the workout
        output_path: Optional path to save the file

    Returns:
        FIT file content as bytes
    """
    # Parse the workout
    parser = WorkoutParser()
    steps = parser.parse(workout_text)

    # Create workout object
    workout = Workout(name=workout_name, steps=steps)

    # Build FIT file
    builder = FitWorkoutBuilder(workout)
    fit_bytes = builder.build()

    # Save if path provided
    if output_path:
        Path(output_path).write_bytes(fit_bytes)

    return fit_bytes


def format_duration(seconds: float) -> str:
    """Format duration for display."""
    if seconds >= 3600:
        return f"{seconds/3600:.1f}h"
    elif seconds >= 60:
        return f"{seconds/60:.1f}min"
    else:
        return f"{seconds:.0f}s"


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Create .FIT workout files for bike trainers from text input.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s workout.txt -o sweetspot.fit --name "Sweet Spot 3x10"
  %(prog)s workout.txt --name "VO2 Max" --ftp 280
  echo "10min 90%% FTP @90rpm" | %(prog)s - -o quick.fit

Input Format:
  2min 80%% FTP              Steady power at 80%% FTP
  5min 30%% - 70%% FTP       Ramp from 30%% to 70%% FTP
  5min 85-95%% FTP           Power range (target zone)
  3x 2min 100%% FTP          Repeat 3 times
  5min 90%% FTP @95rpm       With cadence target
  5min 90%% FTP @90-100rpm   With cadence range
  10min 150-160 bpm          Heart rate target (absolute)
  10min 75-85%% HR           Heart rate target (% max)
  5min open                  Free ride (no target)
  5min 100%% FTP "Hold it!"  With notes
  warmup 10min               Auto warmup
  cooldown 5min              Auto cooldown
  recovery 3min              Recovery interval
        """
    )

    parser.add_argument(
        'input',
        help="Input file path or '-' for stdin"
    )

    parser.add_argument(
        '-o', '--output',
        help="Output .FIT file path (default: <input_name>.fit)"
    )

    parser.add_argument(
        '-n', '--name',
        default="Custom Workout",
        help="Workout name (default: 'Custom Workout')"
    )

    parser.add_argument(
        '--ftp',
        type=int,
        help="Your FTP in watts (for reference display)"
    )

    parser.add_argument(
        '--max-hr',
        type=int,
        help="Your max HR in bpm (for reference display)"
    )

    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help="Show detailed workout summary"
    )

    args = parser.parse_args()

    # Read input
    if args.input == '-':
        workout_text = sys.stdin.read()
        default_output = "workout.fit"
    else:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"Error: Input file not found: {args.input}", file=sys.stderr)
            sys.exit(1)
        workout_text = input_path.read_text()
        default_output = input_path.stem + ".fit"

    # Set output path
    output_path = args.output or default_output

    try:
        # Parse and validate
        parser_obj = WorkoutParser()
        steps = parser_obj.parse(workout_text)
        workout = Workout(name=args.name, steps=steps)

        # Show summary if verbose
        if args.verbose:
            print(f"\n{'='*50}")
            print(f"Workout: {workout.name}")
            print(f"Duration: {workout.total_duration_formatted}")
            print(f"Steps: {len(steps)}")
            print(f"{'='*50}")
            print("\nBreakdown:")

            for i, step in enumerate(steps, 1):
                if step.step_type == StepType.REPEAT:
                    print(f"\n  {i}. REPEAT {step.repeat_count}x:")
                    for j, inner in enumerate(step.repeat_steps, 1):
                        _print_step_details(inner, f"      {j}", args.ftp, args.max_hr)
                else:
                    _print_step_details(step, f"  {i}", args.ftp, args.max_hr)

            print()

        # Build and save
        builder = FitWorkoutBuilder(workout)
        fit_bytes = builder.build()
        Path(output_path).write_bytes(fit_bytes)

        print(f"✓ Created: {output_path} ({len(fit_bytes)} bytes)")
        print(f"  Workout: {workout.name}")
        print(f"  Duration: {workout.total_duration_formatted}")

    except WorkoutParseError as e:
        print(f"Parse error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def _print_step_details(step: WorkoutStep, prefix: str, ftp: Optional[int], max_hr: Optional[int]):
    """Print details for a single step."""
    dur = format_duration(step.duration_seconds)

    # Build target string
    if step.step_type == StepType.OPEN:
        target = "Open (free ride)"
    elif step.target_type == TargetType.HEART_RATE:
        if step.hr_is_percentage:
            target = f"{step.hr_low:.0f}-{step.hr_high:.0f}% HR"
            if max_hr:
                hr_low_abs = int(step.hr_low / 100 * max_hr)
                hr_high_abs = int(step.hr_high / 100 * max_hr)
                target += f" ({hr_low_abs}-{hr_high_abs} bpm)"
        else:
            target = f"{step.hr_low:.0f}-{step.hr_high:.0f} bpm"
    else:
        target = f"{step.power_low_pct:.0f}-{step.power_high_pct:.0f}% FTP"
        if ftp:
            low_w = int(step.power_low_pct / 100 * ftp)
            high_w = int(step.power_high_pct / 100 * ftp)
            target += f" ({low_w}-{high_w}W)"

    # Add cadence if present
    cadence_str = ""
    if step.cadence_low is not None:
        if step.cadence_low == step.cadence_high:
            cadence_str = f" @{step.cadence_low}rpm"
        else:
            cadence_str = f" @{step.cadence_low}-{step.cadence_high}rpm"

    # Add notes if present
    notes_str = ""
    if step.notes:
        notes_str = f' "{step.notes}"'

    print(f"{prefix}. {dur} {target}{cadence_str}{notes_str}")


if __name__ == "__main__":
    main()
