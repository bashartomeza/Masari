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

  /// Announced to screen readers and shown when the marker is tapped.
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

/// Modern Masari map surface.
class MasariMap extends StatefulWidget {
  const MasariMap({
    required this.emptyLabel,
    required this.attributionLabel,
    this.paths = const [],
    this.markers = const [],
    this.height = 420,
    this.overlay,
    this.banner,
    this.interactive = true,
    super.key,
  });

  final String emptyLabel;

  /// OpenStreetMap's required credit.
  final String attributionLabel;

  final List<MasariMapPath> paths;
  final List<MasariMapMarker> markers;

  /// Map height.
  final double height;

  /// Optional widget pinned near the bottom of the map.
  final Widget? overlay;

  /// Optional status banner shown near the top.
  final Widget? banner;

  final bool interactive;

  @override
  State<MasariMap> createState() => _MasariMapState();
}

class _MasariMapState extends State<MasariMap> {
  final MapController _controller = MapController();

  String? _selectedLabel;

  /// Default Masari geographic area.
  static const LatLng _defaultCenter = LatLng(31.6, 35.15);

  static const double _defaultZoom = 11;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _fitToContent();
    });
  }

  @override
  void didUpdateWidget(covariant MasariMap oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (!_sameMapContent(oldWidget)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _fitToContent();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // ===========================================================================
  // MAP CONTENT
  // ===========================================================================

  /// All coordinates currently displayed on the map.
  ///
  /// Route geometry comes directly from [widget.paths].
  /// No external routing service is used here.
  List<LatLng> get _allPoints => [
        for (final path in widget.paths)
          ...path.points.map(_toLatLng),
        for (final marker in widget.markers)
          _toLatLng(marker.position),
      ];

  static LatLng _toLatLng(GeoPoint point) {
    return LatLng(
      point.latitude,
      point.longitude,
    );
  }

  /// Checks whether route/marker content changed.
  bool _sameMapContent(MasariMap oldWidget) {
    if (oldWidget.paths.length != widget.paths.length) {
      return false;
    }

    for (var i = 0; i < oldWidget.paths.length; i++) {
      final oldPath = oldWidget.paths[i];
      final newPath = widget.paths[i];

      if (oldPath.points.length != newPath.points.length) {
        return false;
      }

      for (var j = 0; j < oldPath.points.length; j++) {
        final oldPoint = oldPath.points[j];
        final newPoint = newPath.points[j];

        if (oldPoint.latitude != newPoint.latitude ||
            oldPoint.longitude != newPoint.longitude) {
          return false;
        }
      }
    }

    if (oldWidget.markers.length != widget.markers.length) {
      return false;
    }

    for (var i = 0; i < oldWidget.markers.length; i++) {
      final oldMarker = oldWidget.markers[i];
      final newMarker = widget.markers[i];

      if (oldMarker.position.latitude !=
              newMarker.position.latitude ||
          oldMarker.position.longitude !=
              newMarker.position.longitude) {
        return false;
      }
    }

    return true;
  }

  void _fitToContent() {
    final points = _allPoints;

    if (points.length < 2) {
      if (points.length == 1) {
        _controller.move(
          points.first,
          14,
        );
      } else {
        _controller.move(
          _defaultCenter,
          _defaultZoom,
        );
      }

      return;
    }

    _controller.fitCamera(
      _cameraFit(points),
    );
  }

  CameraFit _cameraFit(List<LatLng> points) {
    return CameraFit.bounds(
      bounds: LatLngBounds.fromPoints(points),
      padding: const EdgeInsets.all(55),
      maxZoom: 13,
    );
  }

  // ===========================================================================
  // BUILD
  // ===========================================================================

  @override
  Widget build(BuildContext context) {
    final points = _allPoints;

    return ClipRRect(
      borderRadius: BorderRadius.circular(
        AppTokens.radiusLarge,
      ),
      child: SizedBox(
        height: widget.height,
        width: double.infinity,
        child: _map(
          context,
          points,
        ),
      ),
    );
  }

  Widget _map(
    BuildContext context,
    List<LatLng> points,
  ) {
    final theme = Theme.of(context);

    final single = points.length == 1;
    final hasPoints = points.isNotEmpty;

    return Stack(
      children: [
        // ====================================================================
        // MAP
        // ====================================================================

        Directionality(
          textDirection: TextDirection.ltr,
          child: FlutterMap(
            mapController: _controller,
            options: MapOptions(
              initialCenter: single
                  ? points.first
                  : _defaultCenter,
              initialZoom: single
                  ? 14
                  : _defaultZoom,
              interactionOptions: InteractionOptions(
                flags: widget.interactive
                    ? InteractiveFlag.all &
                        ~InteractiveFlag.rotate
                    : InteractiveFlag.none,
              ),
              onMapReady: () {
                WidgetsBinding.instance
                    .addPostFrameCallback((_) {
                  if (!mounted) return;

                  _fitToContent();
                });
              },
              onTap: (_, _) {
                if (_selectedLabel != null) {
                  setState(() {
                    _selectedLabel = null;
                  });
                }
              },
            ),
            children: [
              // ==============================================================
              // MAP TILES
              // ==============================================================

              TileLayer(
                urlTemplate:
                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName:
                    'ps.masari.mobile',
                maxNativeZoom: 19,
              ),

              // ==============================================================
              // ROUTES
              // ==============================================================

              if (widget.paths.any(
                (path) => path.points.length >= 2,
              ))
                PolylineLayer(
                  polylines: [
                    for (var i = 0;
                        i < widget.paths.length;
                        i++)
                      if (widget.paths[i]
                              .points
                              .length >=
                          2)
                        Polyline(
                          points: widget.paths[i]
                              .points
                              .map(_toLatLng)
                              .toList(),
                          color:
                              widget.paths[i].color,
                          strokeWidth:
                              widget.paths[i].width,
                          borderColor:
                              Colors.white.withValues(
                            alpha: 0.85,
                          ),
                          borderStrokeWidth:
                              widget.paths[i].dashed
                                  ? 0
                                  : 2.0,
                          pattern:
                              widget.paths[i].dashed
                                  ? StrokePattern.dashed(
                                      segments: const [
                                        10,
                                        7,
                                      ],
                                    )
                                  : const StrokePattern
                                      .solid(),
                        ),
                  ],
                ),

              // ==============================================================
              // MARKERS
              // ==============================================================

              MarkerLayer(
                markers: [
                  for (final marker in widget.markers)
                    _pin(marker),
                ],
              ),
            ],
          ),
        ),

        // ====================================================================
        // TOP STATUS AREA
        // ====================================================================

        Positioned(
          top: 12,
          left: 12,
          right: 12,
          child: Column(
            crossAxisAlignment:
                CrossAxisAlignment.stretch,
            children: [
              if (widget.banner != null)
                _FloatingBanner(
                  child: widget.banner!,
                ),

              if (!hasPoints &&
                  widget.banner == null)
                _EmptyMapMessage(
                  label: widget.emptyLabel,
                ),

              if (_selectedLabel != null)
                Padding(
                  padding: const EdgeInsets.only(
                    top: 8,
                  ),
                  child: _Callout(
                    label: _selectedLabel!,
                  ),
                ),
            ],
          ),
        ),

        // ====================================================================
        // MAP CONTROLS
        // ====================================================================

        Positioned(
          top: widget.banner != null ||
                  !hasPoints
              ? 72
              : 14,
          right: 12,
          child: _MapControls(
            enabled: widget.interactive,
            onZoomIn: () {
              final currentZoom =
                  _controller.camera.zoom;

              _controller.move(
                _controller.camera.center,
                currentZoom + 1,
              );
            },
            onZoomOut: () {
              final currentZoom =
                  _controller.camera.zoom;

              _controller.move(
                _controller.camera.center,
                currentZoom - 1,
              );
            },
            onReset: _fitToContent,
          ),
        ),

        // ====================================================================
        // OPTIONAL OVERLAY
        // ====================================================================

        if (widget.overlay != null)
          PositionedDirectional(
            start: 12,
            end: 12,
            bottom: 40,
            child: widget.overlay!,
          ),

        // ====================================================================
        // ATTRIBUTION
        // ====================================================================

        PositionedDirectional(
          start: 6,
          bottom: 5,
          child: _Attribution(
            label: widget.attributionLabel,
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // MARKER
  // ===========================================================================

  Marker _pin(MasariMapMarker marker) {
    return Marker(
      point: _toLatLng(marker.position),
      width: marker.size + 14,
      height: marker.size + 14,
      alignment: Alignment.center,
      child: Semantics(
        label: marker.label,
        button: true,
        child: GestureDetector(
          onTap: () {
            setState(() {
              _selectedLabel = marker.label;
            });
          },
          child: _ModernPin(
            marker: marker,
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// MODERN MARKER
// ============================================================================

class _ModernPin extends StatelessWidget {
  const _ModernPin({
    required this.marker,
  });

  final MasariMapMarker marker;

  @override
  Widget build(BuildContext context) {
    final isLocation =
        marker.icon ==
            Icons.my_location_rounded;

    final isDriver =
        marker.icon ==
            Icons.local_shipping_rounded;

    final isDestination =
        marker.icon ==
            Icons.flag_rounded;

    final pinSize = isLocation
        ? marker.size + 6
        : marker.size;

    return Stack(
      alignment: Alignment.center,
      children: [
        if (isLocation)
          Container(
            width: pinSize + 14,
            height: pinSize + 14,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: marker.color.withValues(
                alpha: 0.18,
              ),
            ),
          ),
        Container(
          width: pinSize,
          height: pinSize,
          decoration: BoxDecoration(
            color: marker.color,
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.white,
              width:
                  isDriver || isDestination
                      ? 3
                      : 2.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(
                  alpha: 0.22,
                ),
                blurRadius: 7,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Icon(
            marker.icon,
            size: pinSize * 0.48,
            color: marker.foreground,
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// MAP CONTROLS
// ============================================================================

class _MapControls extends StatelessWidget {
  const _MapControls({
    required this.enabled,
    required this.onZoomIn,
    required this.onZoomOut,
    required this.onReset,
  });

  final bool enabled;
  final VoidCallback onZoomIn;
  final VoidCallback onZoomOut;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 4,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          _MapControlButton(
            icon: Icons.add_rounded,
            tooltip: 'تكبير الخريطة',
            onPressed:
                enabled ? onZoomIn : null,
          ),
          const Divider(
            height: 1,
            thickness: 1,
          ),
          _MapControlButton(
            icon: Icons.remove_rounded,
            tooltip: 'تصغير الخريطة',
            onPressed:
                enabled ? onZoomOut : null,
          ),
          const Divider(
            height: 1,
            thickness: 1,
          ),
          _MapControlButton(
            icon:
                Icons.center_focus_strong_rounded,
            tooltip: 'إظهار المسار',
            onPressed:
                enabled ? onReset : null,
          ),
        ],
      ),
    );
  }
}

class _MapControlButton extends StatelessWidget {
  const _MapControlButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: SizedBox(
        width: 44,
        height: 44,
        child: IconButton(
          onPressed: onPressed,
          icon: Icon(
            icon,
            size: 21,
          ),
          splashRadius: 20,
          padding: EdgeInsets.zero,
        ),
      ),
    );
  }
}

// ============================================================================
// EMPTY MAP MESSAGE
// ============================================================================

class _EmptyMapMessage extends StatelessWidget {
  const _EmptyMapMessage({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Align(
      alignment: AlignmentDirectional.topStart,
      child: Container(
        constraints: const BoxConstraints(
          maxWidth: 270,
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 10,
        ),
        decoration: BoxDecoration(
          color: Colors.white.withValues(
            alpha: 0.94,
          ),
          borderRadius:
              BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(
                alpha: 0.12,
              ),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.map_outlined,
              size: 19,
              color:
                  theme.colorScheme.primary,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                label,
                maxLines: 2,
                overflow:
                    TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall
                    ?.copyWith(
                  fontWeight:
                      FontWeight.w600,
                  color:
                      theme.colorScheme.onSurface,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// FLOATING BANNER
// ============================================================================

class _FloatingBanner extends StatelessWidget {
  const _FloatingBanner({
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      elevation: 3,
      borderRadius:
          BorderRadius.circular(14),
      child: ClipRRect(
        borderRadius:
            BorderRadius.circular(14),
        child: child,
      ),
    );
  }
}

// ============================================================================
// CALLOUT
// ============================================================================

class _Callout extends StatelessWidget {
  const _Callout({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color:
          theme.colorScheme.inverseSurface,
      elevation: 5,
      borderRadius:
          BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 10,
        ),
        child: Row(
          children: [
            Icon(
              Icons.info_outline_rounded,
              size: 18,
              color: theme.colorScheme
                  .onInverseSurface,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                maxLines: 2,
                overflow:
                    TextOverflow.ellipsis,
                style: theme.textTheme.labelLarge
                    ?.copyWith(
                  color: theme.colorScheme
                      .onInverseSurface,
                  fontWeight:
                      FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// ATTRIBUTION
// ============================================================================

class _Attribution extends StatelessWidget {
  const _Attribution({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding:
          const EdgeInsets.symmetric(
        horizontal: 6,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withValues(
          alpha: 0.86,
        ),
        borderRadius:
            BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall
            ?.copyWith(
          color: theme.colorScheme
              .onSurfaceVariant,
          fontSize: 9,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
