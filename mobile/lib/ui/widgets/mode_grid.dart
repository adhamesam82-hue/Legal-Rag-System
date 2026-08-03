import 'package:flutter/material.dart';

import '../../l10n/strings.dart';
import '../../models/assistant_mode.dart';

/// The eight assistant modes, one of which works.
///
/// The unbuilt seven are shown greyed and non-tappable, with a note saying so
/// underneath. The alternative -- hiding them until they exist -- was rejected
/// because this list is the product's stated shape and the web app already
/// shows it; what matters is that nothing here can be tapped into a screen
/// that fabricates a result.
class ModeGrid extends StatelessWidget {
  const ModeGrid({super.key, required this.selected, this.onSelected});

  final AssistantMode selected;
  final void Function(AssistantMode mode)? onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final strings = Strings.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final mode in AssistantMode.all)
              _ModeChip(
                label: strings.mode(mode),
                selected: mode == selected,
                available: mode.available,
                unavailableTooltip: strings.notBuiltYet,
                onTap: mode.available && onSelected != null
                    ? () => onSelected!(mode)
                    : null,
              ),
          ],
        ),
        const SizedBox(height: 12),
        Text(strings.modeAvailabilityNote, style: theme.textTheme.bodySmall),
      ],
    );
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({
    required this.label,
    required this.selected,
    required this.available,
    required this.unavailableTooltip,
    this.onTap,
  });

  final String label;
  final bool selected;
  final bool available;
  final String unavailableTooltip;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;
    final disabledColor = theme.textTheme.bodySmall?.color;

    final chip = Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
      decoration: BoxDecoration(
        color: selected ? accent.withValues(alpha: 0.14) : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: selected
              ? accent.withValues(alpha: 0.55)
              : theme.dividerColor,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!available) ...[
            Icon(Icons.lock_outline, size: 13, color: disabledColor),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: theme.textTheme.labelLarge?.copyWith(
              color: available
                  ? (selected ? accent : theme.colorScheme.onSurface)
                  : disabledColor,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );

    if (!available) {
      return Tooltip(
        message: unavailableTooltip,
        child: Semantics(enabled: false, label: '$label — $unavailableTooltip', child: chip),
      );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: chip,
      ),
    );
  }
}

/// The jurisdiction selector. Egypt is the only one with a corpus behind it.
class JurisdictionSelector extends StatelessWidget {
  const JurisdictionSelector({
    super.key,
    required this.selected,
    this.onSelected,
  });

  final Jurisdiction selected;
  final void Function(Jurisdiction jurisdiction)? onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final strings = Strings.of(context);

    return Row(
      children: [
        Text(
          strings.jurisdiction,
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(width: 10),
        for (final jurisdiction in Jurisdiction.values)
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 8),
            child: _ModeChip(
              label: switch (jurisdiction) {
                Jurisdiction.egypt => strings.egypt,
                Jurisdiction.saudiArabia => strings.saudiArabia,
              },
              selected: jurisdiction == selected,
              available: jurisdiction.available,
              unavailableTooltip: strings.noCorpusYet,
              onTap: jurisdiction.available && onSelected != null
                  ? () => onSelected!(jurisdiction)
                  : null,
            ),
          ),
      ],
    );
  }
}
