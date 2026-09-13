---
type: UAV
title: SwiftPack X-4 Urban Delivery Drone
description: Compact tilt-rotor VTOL drone optimized for rapid, last-mile parcel drops in dense metropolitan sectors.
tags: [fleet, urban-courier, vtol, last-mile, lightweight]
timestamp: 2026-08-20T10:00:00.000Z
---
# SwiftPack X-4 Urban Delivery Drone

The **SwiftPack X-4** is an ultra-quiet, lightweight autonomous delivery drone purpose-built for high-density metropolitan residential delivery. Engineered with enclosed carbon-composite duct shrouds, it minimizes acoustic footprint (<52 dBA at 50m AGL) while ensuring total pedestrian safety during low-altitude drop sequences.

---

## 1. Physical & Operational Profile

| Property | Value | Units | Description |
| :--- | :--- | :--- | :--- |
| **All-Up Weight** | 14.5 | kg | With battery & empty payload box |
| **Payload Envelope** | 3.5 | kg | Standard retail parcel size (30x20x15cm) |
| **Delivery Radius** | 18.0 | km | Round-trip without mid-mission charging |
| **Acoustic Signature** | 49.5 | dBA | At 45m cruising altitude |
| **Wind Resistance** | 22.0 | knots | Gust tolerance up to 28 knots |

---

## 2. Sensor Integration & Urban Perception

Navigating urban canyons and complex building layouts requires an advanced perception suite:
- **Obstacle Detection**: Frontal and lateral monitoring via [Solid-State LiDAR Collision Avoidance Array](../../avionics/navigation/lidar-collision-avoidance-array.md).
- **Ground & Drop Verification**: Real-time ground texture and moving obstacle classification powered by the [High-Speed Optical Flow & Terrain Sensor](../../avionics/flight-control/optical-flow-terrain-sensor.md).
- **Autopilot Core**: Direct flight envelope tracking executed by the [Quantum Flight Management Computer V3](../../avionics/flight-control/quantum-flight-computer-v3.md).

---

## 3. Delivery Mechanics & Hub Operations

The SwiftPack X-4 operates out of rooftop hubs like [Metro Vertiport Alpha (Downtown Hub)](../../facilities/hubs/metro-rooftop-vertiport-alpha.md). 

Rather than landing in customer backyards, the drone hovers at 8–10 meters altitude and lowers packages using the [Tethered Payload Winch & Delivery System](../../operations/ground-handling/automated-payload-winch-system.md).

---

## 4. Safety & Airspace Containment

If the aircraft deviates by more than 1.5 meters from its assigned micro-corridor or encounters unauthorized temporary obstacles, it immediately enters the [Dynamic Geofence Breach Containment Protocol](../../safety/protocols/geofence-breach-containment.md) to execute a controlled hover-and-divert sequence.
