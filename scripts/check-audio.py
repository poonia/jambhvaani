#!/usr/bin/env python3
"""Checks that every MP3 under content/assets/audio is constant-bitrate (CBR).

Shabads are played as [startTime, endTime) slices of one long shared file,
so the player depends on the browser seeking to the exact timestamp. For a
VBR MP3 browsers can only interpolate the 100-entry Xing seek table, which on
the ~2h shabadvaani recording landed up to ±16s away from the requested time
(shabad 1 started/ended ~12s early). CBR maps time -> byte offset exactly.

Fix a failing file (keeps the timeline sample-aligned):
  ffmpeg -i in.mp3 -map 0:a -map_metadata 0 -c:a libmp3lame -b:a 128k out.mp3
"""
import collections
import pathlib
import sys

BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
SAMPLE_RATES = [44100, 48000, 32000]


def frame_bitrates(data):
    i = 0
    if data[:3] == b'ID3':
        i = 10 + ((data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9])
    counts = collections.Counter()
    while i + 4 < len(data):
        h = int.from_bytes(data[i:i + 4], 'big')
        bi, si = (h >> 12) & 15, (h >> 10) & 3
        # MPEG-1 Layer III frame sync only
        if (h >> 21) & 0x7ff != 0x7ff or (h >> 19) & 3 != 3 or (h >> 17) & 3 != 1 \
                or bi in (0, 15) or si == 3:
            i += 1
            continue
        counts[BITRATES[bi]] += 1
        i += 144 * BITRATES[bi] * 1000 // SAMPLE_RATES[si] + ((h >> 9) & 1)
    return counts


def main():
    root = pathlib.Path(__file__).resolve().parent.parent / 'content' / 'assets' / 'audio'
    failed = False
    for path in sorted(root.glob('*.mp3')):
        counts = frame_bitrates(path.read_bytes())
        if len(counts) == 1:
            print(f'ok    {path.name}: CBR {next(iter(counts))} kbps')
        else:
            failed = True
            print(f'FAIL  {path.name}: VBR {dict(sorted(counts.items()))} — re-encode as CBR')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
