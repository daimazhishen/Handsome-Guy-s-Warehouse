"""
WZP × LH · Terminal Love Runtime

无需第三方依赖。运行：
    python terminal_heart.py

按 Ctrl+C 退出。
"""

from __future__ import annotations

import math
import os
import random
import shutil
import sys
import time
from dataclasses import dataclass

FROM_NAME = "LH"
TO_NAME = "WZP"
MESSAGE = f"{TO_NAME}，遇见你之后，连代码都开始偏心。 —— {FROM_NAME}"
DURATION = 15.0
FPS = 20

PALETTE = (
    (255, 194, 218),
    (255, 226, 238),
    (247, 155, 200),
    (194, 180, 255),
    (255, 250, 253),
)


@dataclass
class Particle:
    x: float
    y: float
    tx: float
    ty: float
    vx: float
    vy: float
    size: float
    color: tuple[int, int, int]
    phase: float
    outline: bool


def hide_cursor() -> None:
    if os.name == "nt":
        os.system("")
    sys.stdout.write("\033[?25l")
    sys.stdout.flush()


def show_cursor() -> None:
    sys.stdout.write("\033[?25h")
    sys.stdout.flush()


def point_in_heart(angle: float) -> tuple[float, float]:
    x = 16 * math.sin(angle) ** 3
    y = 13 * math.cos(angle) - 5 * math.cos(2 * angle) - 2 * math.cos(3 * angle) - math.cos(4 * angle)
    return x / 18, (y - 1.3) / 18


def make_particles(count: int, columns: int, rows: int) -> list[Particle]:
    center_x = columns * 0.62
    center_y = rows * 0.43
    scale = min(columns * 0.23, rows * 0.39)
    particles: list[Particle] = []

    for index in range(count):
        angle = index / count * math.tau + random.uniform(-0.04, 0.04)
        edge_x, edge_y = point_in_heart(angle)
        outline = index % 4 == 0
        radial = random.uniform(0.93, 1.01) if outline else math.sqrt(random.random()) * 0.96
        target_x = center_x + edge_x * scale * radial
        target_y = center_y - edge_y * scale * radial * 0.92
        particles.append(
            Particle(
                x=random.uniform(0, columns),
                y=random.uniform(rows * 0.65, rows + 8),
                tx=target_x,
                ty=target_y,
                vx=random.uniform(-0.1, 0.1),
                vy=random.uniform(-0.3, -0.04),
                size=random.choice((1, 1, 1, 2)) if outline else 1,
                color=random.choice(PALETTE),
                phase=random.uniform(0, math.tau),
                outline=outline,
            )
        )
    return particles


def animate() -> None:
    columns, rows = shutil.get_terminal_size((120, 36))
    columns = max(72, columns)
    rows = max(28, rows)
    particle_count = min(4200, max(1300, columns * rows * 4))
    particles = make_particles(particle_count, columns, rows)
    buffer: dict[tuple[int, int], tuple[int, int, int]] = {}
    started = time.perf_counter()
    hide_cursor()

    try:
        while True:
            now = time.perf_counter()
            elapsed = now - started
            if elapsed > DURATION:
                started = now
                elapsed = 0
                particles = make_particles(particle_count, columns, rows)

            gather = min(1.0, max(0.0, (elapsed - 0.3) / 2.8))
            spring = 0.012 + 0.055 * (1 - (1 - gather) ** 4)
            buffer.clear()

            for particle in particles:
                pulse = 1 + math.sin(now * 2.4) * 0.012
                target_x = particle.tx + math.sin(now + particle.phase) * 0.22
                target_y = particle.ty + math.cos(now * 0.8 + particle.phase) * 0.12
                if gather > 0:
                    particle.vx += (target_x - particle.x) * spring
                    particle.vy += (target_y - particle.y) * spring
                    particle.vx *= 0.88
                    particle.vy *= 0.88
                particle.x += particle.vx
                particle.y += particle.vy

                if not (0 <= particle.x < columns and 0 <= particle.y < rows):
                    continue

                intensity = 0.62 + 0.38 * math.sin(now * 2.1 + particle.phase) ** 2
                color = tuple(min(255, int(channel * intensity)) for channel in particle.color)
                x = int(particle.x)
                y = int(particle.y)
                buffer[(x, y)] = color
                if particle.outline:
                    buffer[(x + 1, y)] = color

            title_y = max(2, int(rows * 0.10))
            title = f"{TO_NAME}  ×  {FROM_NAME}"
            title_x = max(0, (columns - len(title)) // 2)
            message_y = int(rows * 0.83)
            message_x = max(0, (columns - len(MESSAGE)) // 2)

            lines: list[str] = []
            for y in range(rows):
                chars: list[str] = []
                for x in range(columns):
                    color = buffer.get((x, y))
                    if color:
                        chars.append(f"\033[38;2;{color[0]};{color[1]};{color[2]}m·\033[0m")
                    else:
                        chars.append(" ")
                line = "".join(chars)
                if y == title_y:
                    line = " " * title_x + f"\033[1;38;2;255;224;238m{title}\033[0m"
                if gather > 0.82 and y == message_y:
                    line = " " * message_x + f"\033[38;2;255;186;218m{MESSAGE}\033[0m"
                lines.append(line)

            sys.stdout.write("\033[H" + "\n".join(lines) + "\033[J")
            sys.stdout.flush()
            frame_time = now + 1 / FPS
            time.sleep(max(0, frame_time - time.perf_counter()))
    finally:
        show_cursor()


if __name__ == "__main__":
    try:
        animate()
    except KeyboardInterrupt:
        show_cursor()
        print("\nLove runtime exited.")
