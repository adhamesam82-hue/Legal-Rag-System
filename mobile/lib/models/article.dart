import 'package:equatable/equatable.dart';

/// A statute article as the backend returns it.
///
/// [citation] is the canonical form the answer text cites ("12/2003 Art. 80"),
/// and is what links a citation in an answer back to the article it came from.
class Article extends Equatable {
  const Article({
    required this.id,
    required this.citation,
    required this.instrumentNumber,
    required this.instrumentYear,
    required this.instrumentTitle,
    required this.articleNumber,
    required this.text,
    this.score = 0,
  });

  final int id;
  final String citation;
  final String instrumentNumber;
  final int instrumentYear;
  final String instrumentTitle;
  final String articleNumber;
  final String text;
  final double score;

  factory Article.fromJson(Map<String, dynamic> json) => Article(
    id: json['id'] as int,
    citation: json['citation'] as String,
    instrumentNumber: json['instrument_number'] as String,
    instrumentYear: json['instrument_year'] as int,
    instrumentTitle: json['instrument_title'] as String,
    articleNumber: json['article_number'] as String,
    text: json['text'] as String,
    score: (json['score'] as num?)?.toDouble() ?? 0,
  );

  /// "Law 12/2003" — how the instrument is named in prose.
  String get instrumentReference => '$instrumentNumber/$instrumentYear';

  @override
  List<Object?> get props => [id, citation, text];
}
