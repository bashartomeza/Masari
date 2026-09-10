import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../features/canonical_routes/domain/canonical_route_models.dart';
import '../theme/app_theme.dart';
import '../theme/app_tokens.dart';

/// A pin the map can draw.
class MasariMapMarker {
  const MasariMapMarker({
    required this.position,
    required this.icon,
    required this.color,
    required this.label,
    this.foreground = Colors.white,
    this.size = 34,
  });

  final GeoPoint position;
  final IconData icon;
  final Color color;

  /// Announced to screen readers and shown on tap — already localised.
  final String label;

  final Color foreground;
  final double size;
}

/// A line the map can draw.
class MasariMapPath {
  const MasariMapPath({
    required this.points,
    required this.color,
    this.width = 5,
    this.dashed = false,
  });

  final List<GeoPoint> points;
  final Color color;
  final double width;

  /// Used for a leg that is planned rather than confirmed.
  final bool dashed;
}

/// The live map surface.
///
/// The map remains visible even when there are no paths or markers.
/// In that case it opens centered on the default Masari area.
///
/// Tiles come from OpenStreetMap, whose licence requires the attribution shown
/// bottom-start. Do not remove it.
class MasariMap extends StatefulWidget {
  const MasariMap({
    required this.emptyLabel,
    required this.attributionLabel,
    this.paths = const [],
    this.markers = const [],
    this.height = 260,
    this.overlay,
    this.banner,
    this.interactive = true,
    super.key,
  });

  final String emptyLabel;

  /// OpenStreetMap's required credit — already localised.
  final String attributionLabel;

  final List<MasariMapPath> paths;
  final List<MasariMapMarker> markers;
  final double height;

  /// Pinned to the bottom of the map area, e.g. a driver card.
  final Widget? overlay;

  /// Pinned to the top, e.g. a "showing last known barriers" notice.
  final Widget? banner;

  final bool interactive;

  @override
  State<MasariMap> createState() => _MasariMapState();
}

class _MasariMapState extends State<MasariMap> {
  final _controller = MapController();
  String? _selectedLabel;

  /// Default map center used when no geographic data is available.
  static const LatLng _defaultCenter = LatLng(31.6, 35.15);

  static const double _defaultZoom = 11;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  List<LatLng> get _allPoints => [
        for (final path in widget.paths) ...path.points.map(_toLatLng),
        for (final marker in widget.markers) _toLatLng(marker.position),
      ];

  static LatLng _toLatLng(GeoPoint point) =>
      LatLng(point.latitude, point.longitude);

  @override
  void didUpdateWidget(covariant MasariMap oldWidget) {
    super.didUpdateWidget(oldWidget);

    // New geography arriving (barriers loaded, a route picked) should bring
    // the whole picture back into view rather than leave the rider panned away.
    final points = _allPoints;

    if (points.length >= 2 && !identical(oldWidget.paths, widget.paths)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _controller.fitCamera(_cameraFit(points));
        }
      });
    }
  }

  CameraFit _cameraFit(List<LatLng> points) => CameraFit.bounds(
        bounds: LatLngBounds.fromPoints(points),
        padding: const EdgeInsets.all(AppTokens.spaceExtraLarge),
        maxZoom: 15,
      );

  @override
  Widget build(BuildContext context) {
    final points = _allPoints;

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppTokens.radiusLarge),
      child: SizedBox(
        height: widget.height,
        width: double.infinity,
        child: _map(context, points),
      ),
    );
  }

  Widget _map(BuildContext context, List<LatLng> points) {
    final single = points.length == 1;
    final hasPoints = points.isNotEmpty;

    return Stack(
      children: [
        // The map surface is geographic, not textual: it stays LTR under an
        // Arabic locale so gestures, zoom controls and tile order behave.
        Directionality(
          textDirection: TextDirection.ltr,
          child: FlutterMap(
            mapController: _controller,
            options: MapOptions(
              initialCenter: single ? points.first : _defaultCenter,
              initialZoom: single ? 14 : _defaultZoom,

              // Never create a bounds fit from an empty list.
              initialCameraFit: hasPoints && !single
                  ? _cameraFit(points)
                  : null,

              interactionOptions: InteractionOptions(
                flags: widget.interactive
                    ? InteractiveFlag.all & ~InteractiveFlag.rotate
                    : InteractiveFlag.none,
              ),

              onTap: (_, _) {
                setState(() => _selectedLabel = null);
              },
            ),
            children: [
              TileLayer(
                urlTemplate:
                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'ps.masari.mobile',
                maxNativeZoom: 19,
              ),

              for (final path in widget.paths)
                if (path.points.length >= 2)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: path.points.map(_toLatLng).toList(),
                        color: path.color,
                        strokeWidth: path.width,
                        borderColor: Colors.white,
                        borderStrokeWidth: path.dashed ? 0 : 1.5,
                        pattern: path.dashed
                            ? StrokePattern.dashed(
                                segments: const [8, 6],
                              )
                            : const StrokePattern.solid(),
                      ),
                    ],
                  ),

              MarkerLayer(
                markers: [
                  for (final marker in widget.markers) _pin(marker),
                ],
              ),
            ],
          ),
        ),

        // Show a useful message without replacing the map.
        if (!hasPoints)
          Positioned(
            top: AppTokens.spaceSmall,
            left: AppTokens.spaceSmall,
            right: AppTokens.spaceSmall,
            child: IgnorePointer(
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppTokens.gutterMobile,
                    vertical: AppTokens.spaceSmall,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.surface.withValues(alpha: 0.90),
                    borderRadius:
                        BorderRadius.circular(AppTokens.radiusDefault),
                    border: Border.all(
                      color: AppTheme.outlineVariant,
                    ),
                  ),
                  child: Text(
                    widget.emptyLabel,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ),
            ),
          ),

        if (widget.banner != null)
          PositionedDirectional(
            start: AppTokens.spaceSmall,
            end: AppTokens.spaceSmall,
            top: hasPoints ? AppTokens.spaceSmall : 58,
            child: widget.banner!,
          ),

        if (_selectedLabel != null)
          PositionedDirectional(
            start: AppTokens.spaceSmall,
            end: AppTokens.spaceSmall,
            top: widget.banner == null
                ? AppTokens.spaceSmall
                : 56,
            child: _Callout(label: _selectedLabel!),
          ),

        if (widget.overlay != null)
          PositionedDirectional(
            start: AppTokens.spaceSmall,
            end: AppTokens.spaceSmall,
            bottom: AppTokens.spaceLarge,
            child: widget.overlay!,
          ),

        PositionedDirectional(
          start: AppTokens.spaceExtraSmall,
          bottom: AppTokens.spaceExtraSmall,
          child: _Attribution(
            label: widget.attributionLabel,
          ),
        ),
      ],
    );
  }

  Marker _pin(MasariMapMarker marker) {
    return Marker(
      point: _toLatLng(marker.position),
      width: marker.size,
      height: marker.size,
      alignment: Alignment.center,
      child: Semantics(
        label: marker.label,
        button: true,
        child: GestureDetector(
          onTap: () {
            setState(() => _selectedLabel = marker.label);
          },
          child: Container(
            decoration: BoxDecoration(
              color: marker.color,
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white,
                width: 2,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x33000000),
                  blurRadius: 4,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Icon(
              marker.icon,
              size: marker.size * 0.52,
              color: marker.foreground,
            ),
          ),
        ),
      ),
    );
  }
}

class _Callout extends StatelessWidget {
  const _Callout({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: AppTheme.inverseSurface,
      borderRadius: BorderRadius.circular(
        AppTokens.radiusDefault,
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.gutterMobile,
          vertical: AppTokens.spaceSmall,
        ),
        child: Text(
          label,
          style: theme.textTheme.labelLarge?.copyWith(
            color: AppTheme.inverseOnSurface,
          ),
        ),
      ),
    );
  }
}

/// OpenStreetMap's licence requires visible credit wherever its tiles appear.
class _Attribution extends StatelessWidget {
  const _Attribution({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.spaceExtraSmall,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(
          AppTokens.radiusSmall,
        ),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: AppTheme.onSurfaceVariant,
          fontSize: 9,
        ),
      ),
    );
  }
}