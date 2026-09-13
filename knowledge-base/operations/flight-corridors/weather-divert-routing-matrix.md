---
type: Operation
title: Micro-Weather Routing & Divert Matrix
description: Dynamic rerouting logic driven by real-time anemometer telemetry, microburst alerts, and gust threshold tables.
tags: [operations, weather, routing, microburst, wind-limits]
timestamp: 2026-08-20T10:00:00.000Z
---
# Micro-Weather Routing & Divert Matrix

Urban low-altitude flight paths are susceptible to localized convective microbursts, rooftop building wake turbulence, and abrupt visibility drops. The **Micro-Weather Routing & Divert Matrix (MWR-Matrix)** defines automated decision trees for rerouting, holding, or emergency diversion.

---

## 1. Environmental Threshold Decision Matrix

| Condition / Parameter | Normal Operations | Advisory / Speed Limit | Mandatory Divert / Hold |
| :--- | :--- | :--- | :--- |
| **Sustained Wind Speed** | < 18 knots | 18 - 25 knots | > 25 knots (46 km/h) |
| **Wind Gust Variance** | < 8 knot delta | 8 - 14 knot delta | > 14 knot delta |
| **Horizontal Visibility** | > 3.0 km | 1.0 - 3.0 km | < 1.0 km |
| **Precipitation Rate** | < 2.0 mm/hr | 2.0 - 8.0 mm/hr | > 8.0 mm/hr (Heavy Rain) |
| **Urban Temperature** | -10°C to +40°C | -15°C to -10°C / +40°C to +48°C | < -15°C or > +48°C |

---

## 2. Sensor Ingestion & Real-Time Assessment

The aircraft continuously validates external atmospheric conditions via:
- Ultrasonic barometric and pitot tube sensors.
- Point cloud beam attenuation measured by the [Solid-State LiDAR Collision Avoidance Array](../../avionics/navigation/lidar-collision-avoidance-array.md).
- Direct ground anemometer mesh broadcasts received from vertiport towers such as [Metro Vertiport Alpha (Downtown Hub)](../../facilities/hubs/metro-rooftop-vertiport-alpha.md).

---

## 3. Rerouting & Containment Execution

When a mandatory divert condition is reached:
1. The aircraft vacates the primary airway under [BVLOS Low-Altitude Corridor Navigation Procedure](./bvlos-corridor-nav-procedure.md).
2. The route solver recalculates a secondary vector to the nearest emergency holding pad.
3. If wind shear prevents stable flight envelope retention, the aircraft transitions into [Dynamic Geofence Breach Containment Protocol](../../safety/protocols/geofence-breach-containment.md).
