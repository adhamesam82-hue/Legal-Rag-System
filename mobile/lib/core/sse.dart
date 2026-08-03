import 'dart:convert';

/// One parsed Server-Sent Event.
class SseEvent {
  const SseEvent({required this.event, required this.data});

  final String event;
  final Map<String, dynamic> data;
}

/// Parses a byte stream of Server-Sent Events into decoded events.
///
/// Two things this has to get right, both of which are invisible until the
/// answer is in Arabic:
///
///  * A chunk boundary can land in the middle of a UTF-8 sequence. Decoding
///    each chunk separately would corrupt any Arabic character unlucky enough
///    to straddle one, so decoding is done by a single streaming decoder
///    (`utf8.decoder.bind`) that carries partial sequences across chunks.
///  * A chunk boundary can also land in the middle of an event. Text is
///    buffered and only split on a blank line, never on chunk arrival.
Stream<SseEvent> parseSse(Stream<List<int>> bytes) async* {
  var buffer = '';

  await for (final chunk in utf8.decoder.bind(bytes)) {
    buffer += chunk.replaceAll('\r\n', '\n');

    while (true) {
      final boundary = buffer.indexOf('\n\n');
      if (boundary == -1) break;
      final block = buffer.substring(0, boundary);
      buffer = buffer.substring(boundary + 2);

      final event = _parseBlock(block);
      if (event != null) yield event;
    }
  }

  // A stream that ends without its trailing blank line still carries a
  // complete event; dropping it would lose the terminal `done`.
  final trailing = _parseBlock(buffer);
  if (trailing != null) yield trailing;
}

SseEvent? _parseBlock(String block) {
  if (block.trim().isEmpty) return null;

  String? name;
  final dataLines = <String>[];

  for (final line in block.split('\n')) {
    if (line.startsWith(':')) continue; // comment / keep-alive
    if (line.startsWith('event:')) {
      name = line.substring('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      // Exactly one leading space is part of the framing, not the payload.
      var value = line.substring('data:'.length);
      if (value.startsWith(' ')) value = value.substring(1);
      dataLines.add(value);
    }
  }

  if (name == null || dataLines.isEmpty) return null;

  final payload = dataLines.join('\n');
  final decoded = jsonDecode(payload);
  if (decoded is! Map<String, dynamic>) return null;
  return SseEvent(event: name, data: decoded);
}
