#!/usr/bin/env python3
"""Static file server for local development that:

1. Disables HTTP caching (Cache-Control: no-store) so edits are always
   reflected on reload — python3 -m http.server sends no cache headers,
   so browsers may heuristically cache module scripts and silently serve
   stale code.
2. Supports HTTP Range requests (206 Partial Content). python3 -m
   http.server does not implement these, which makes Chrome's media
   engine treat any <audio>/<video> file as non-seekable (its `seekable`
   TimeRanges stays empty even once fully buffered) — the audio
   player's seek bar depends on this being served correctly.
"""
import http.server
import os
import re
import sys


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        range_header = self.headers.get('Range')
        if not range_header or not os.path.isfile(path):
            return super().send_head()

        file_size = os.path.getsize(path)
        match = re.match(r'bytes=(\d*)-(\d*)', range_header)
        if not match or not any(match.groups()):
            self.send_error(416, 'Invalid Range header')
            return None

        start_str, end_str = match.groups()
        if start_str == '':
            length = int(end_str)
            start, end = max(0, file_size - length), file_size - 1
        else:
            start = int(start_str)
            end = min(int(end_str), file_size - 1) if end_str else file_size - 1

        if start > end or start >= file_size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{file_size}')
            self.end_headers()
            return None

        f = open(path, 'rb')
        f.seek(start)
        self._range_remaining = end - start + 1

        self.send_response(206)
        self.send_header('Content-type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
        self.send_header('Content-Length', str(self._range_remaining))
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        remaining = getattr(self, '_range_remaining', None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', sys.argv[1] if len(sys.argv) > 1 else 8123))
    http.server.test(HandlerClass=DevHandler, port=port, bind='127.0.0.1')
