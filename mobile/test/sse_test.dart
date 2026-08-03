import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:legalos_mobile/core/sse.dart';

/// Feeds bytes in chunks of [size], to force boundaries in awkward places.
Stream<List<int>> chunked(String body, {int size = 1}) async* {
  final bytes = utf8.encode(body);
  for (var offset = 0; offset < bytes.length; offset += size) {
    yield bytes.sublist(offset, (offset + size).clamp(0, bytes.length));
  }
}

String frame(String event, Object data) =>
    'event: $event\ndata: ${jsonEncode(data)}\n\n';

void main() {
  group('parseSse', () {
    test('parses a single event', () async {
      final events = await parseSse(
        chunked(frame('delta', {'text': 'hello'}), size: 1024),
      ).toList();

      expect(events, hasLength(1));
      expect(events.single.event, 'delta');
      expect(events.single.data['text'], 'hello');
    });

    test('reassembles events split across chunk boundaries', () async {
      final body =
          frame('articles', {'conversation_id': 1}) +
          frame('delta', {'text': 'part one '}) +
          frame('done', {'text': 'final'});

      // One byte at a time: every boundary that can exist, does.
      final events = await parseSse(chunked(body, size: 1)).toList();

      expect(events.map((e) => e.event), ['articles', 'delta', 'done']);
      expect(events[1].data['text'], 'part one ');
    });

    test('does not corrupt Arabic split mid-character', () async {
      const arabic = 'ساعات العمل محدودة بثماني ساعات';
      final body = frame('delta', {'text': arabic});

      // Arabic is two bytes per character in UTF-8, so single-byte chunking
      // guarantees a split inside a character. Decoding chunk-by-chunk instead
      // of with a streaming decoder would produce replacement characters here.
      final events = await parseSse(chunked(body, size: 1)).toList();

      expect(events.single.data['text'], arabic);
      expect(events.single.data['text'].toString(), isNot(contains('�')));
    });

    test('keeps newlines inside a payload', () async {
      final body = frame('done', {'text': 'line one\n\nline two'});
      final events = await parseSse(chunked(body, size: 3)).toList();

      expect(events.single.data['text'], 'line one\n\nline two');
    });

    test('accepts CRLF framing', () async {
      const body = 'event: delta\r\ndata: {"text":"x"}\r\n\r\n';
      final events = await parseSse(chunked(body, size: 2)).toList();

      expect(events.single.event, 'delta');
      expect(events.single.data['text'], 'x');
    });

    test('yields a final event that has no trailing blank line', () async {
      const body = 'event: done\ndata: {"text":"end"}';
      final events = await parseSse(chunked(body, size: 4)).toList();

      expect(events.single.event, 'done');
      expect(events.single.data['text'], 'end');
    });

    test('ignores comments and keep-alives', () async {
      final body = ': keep-alive\n\n${frame('delta', {'text': 'x'})}';
      final events = await parseSse(chunked(body, size: 5)).toList();

      expect(events.map((e) => e.event), ['delta']);
    });

    test('an empty stream yields nothing', () async {
      expect(await parseSse(const Stream<List<int>>.empty()).toList(), isEmpty);
    });
  });
}
