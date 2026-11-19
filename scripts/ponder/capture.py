#!/usr/bin/env python3
"""Build the Ponder recording mod or record its scenes from a private X11 display."""

import argparse
import math
import subprocess
import tempfile
import time
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


SCENES = {
    'wheat': ('create:mechanical_harvester', 22, 4),
    'trees': ('create:mechanical_saw mechanical_saw_breaker', 18, 4),
    'replant': ('create:deployer deployer_contraption', 16, 4),
    'drill': ('create:mechanical_drill mechanical_drill', 15, 4),
    'cobblestone': ('minecraft:cobblestone', 0, 6),
    'basalt': ('minecraft:basalt', 0, 6),
    'limestone': ('create:limestone', 0, 6),
    'scoria': ('create:scoria', 0, 6),
    'potato': ('minecraft:potato', 0, 4),
    'carrot': ('minecraft:carrot', 0, 4),
    'beetroot': ('minecraft:beetroot', 0, 4),
    'nether_wart': ('minecraft:nether_wart', 0, 4),
    'sweet_berries': ('minecraft:sweet_berries', 0, 4),
}

SOURCE = Path(__file__).resolve().parent


def build(args):
    with tempfile.TemporaryDirectory() as temp:
        directory = Path(temp)
        classes = directory / 'classes'
        classes.mkdir()
        dependencies = [args.named_client, args.create]
        dependencies.extend(sorted(args.libraries.rglob('*.jar')))
        with ZipFile(args.create) as archive:
            for entry in archive.namelist():
                if entry.startswith(('META-INF/jarjar/ponder-', 'META-INF/jarjar/Registrate-')) and entry.endswith('.jar'):
                    dependency = directory / Path(entry).name
                    dependency.write_bytes(archive.read(entry))
                    dependencies.insert(2, dependency)
        classpath = ':'.join(str(path.resolve()) for path in dependencies)
        subprocess.run(['java', '-m', 'jdk.compiler/com.sun.tools.javac.Main', '-proc:none',
                        '-classpath', classpath, '-d', str(classes), str(SOURCE / 'CaptureMod.java')], check=True)
        args.jar.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(args.jar, 'w', ZIP_DEFLATED) as archive:
            for path in classes.rglob('*.class'):
                archive.write(path, path.relative_to(classes))
            archive.write(SOURCE / 'neoforge.mods.toml', 'META-INF/neoforge.mods.toml')
            archive.write(SOURCE / 'generator.nbt', 'assets/farm_capture/ponder/generator.nbt')


def open_scene(game, scene):
    request = game / 'capture-request.txt'
    response = game / 'capture-response.txt'
    response.unlink(missing_ok=True)
    staging = request.with_suffix('.new')
    staging.write_text(scene)
    staging.replace(request)
    for _ in range(200):
        if response.exists():
            result = response.read_text().strip()
            if result and result.split()[-1].isdecimal():
                return int(result.split()[-1])
            if result.startswith('Error'):
                raise RuntimeError(result)
        time.sleep(.1)
    raise TimeoutError('No Ponder scene response for ' + scene)


def record(args):
    args.output.mkdir(exist_ok=True, parents=True)
    ffmpeg = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
    capture = ffmpeg + ['-f', 'x11grab', '-draw_mouse', '0', '-framerate', '30',
                        '-video_size', '1280x800', '-i', args.display]
    for name in args.names or SCENES:
        scene, limit, preview = SCENES[name]
        ticks = open_scene(args.game, scene)
        duration = math.ceil(ticks / 20) + .5
        print(f'Recording {name} ({scene})', flush=True)
        video = args.output / (name + '.mp4')
        subprocess.run(capture + ['-t', str(min(duration, limit or duration)),
                                  '-vf', 'crop=1000:680:140:46,scale=960:-2', '-an',
                                  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast',
                                  '-crf', '21', '-threads', '2', '-movflags', '+faststart', str(video)], check=True)
        subprocess.run(ffmpeg + ['-ss', str(preview), '-i', str(video), '-frames:v', '1',
                                 '-c:v', 'libwebp', '-quality', '86', str(args.output / (name + '.webp'))], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(required=True)
    build_args = commands.add_parser('build')
    build_args.add_argument('--named-client', type=Path, required=True, help='NeoForge’s mapped client JAR')
    build_args.add_argument('--create', type=Path, required=True, help='Create 6.0.10 JAR')
    build_args.add_argument('--libraries', type=Path, required=True, help='Minecraft libraries directory')
    build_args.add_argument('--jar', type=Path, required=True, help='Capture mod JAR output')
    build_args.set_defaults(run=build)
    record_args = commands.add_parser('record')
    record_args.add_argument('--game', type=Path, required=True, help='Running Minecraft instance directory')
    record_args.add_argument('--display', required=True, help='Private 1280 × 800 X11 display with the game window at (0, 0)')
    record_args.add_argument('--output', type=Path, default=SOURCE.parents[1] / 'src/assets/ponder')
    record_args.add_argument('names', nargs='*', metavar='SCENE', help=', '.join(SCENES))
    record_args.set_defaults(run=record)
    args = parser.parse_args()
    if getattr(args, 'names', None) and not set(args.names) <= SCENES.keys():
        parser.error('Unknown scene: ' + ', '.join(sorted(set(args.names) - SCENES.keys())))
    args.run(args)


if __name__ == '__main__':
    main()
