---
type: Facility
title: Metro Vertiport Alpha (Downtown Hub)
description: Rooftop urban landing node equipped with robotic delivery docks, weather towers, and customer locker interfaces.
tags: [facilities, vertiport, urban, rooftop, automated-dock]
timestamp: 2026-08-20T10:00:00.000Z
---
# Metro Vertiport Alpha (Downtown Hub)

**Metro Vertiport Alpha (Node ID: MVP-DOWNTOWN-04)** is a high-density rooftop micro-hub situated atop a 34-story commercial tower in the central business district. It serves as the primary terminus for on-demand e-commerce drops, urgent medical courier routes, and rapid turnaround parcel dispatches.

---

## 1. Physical Architecture & Urban Interface

```mermaid
flowchart TD
    subgraph Rooftop["Metro Vertiport Alpha (Rooftop Deck)"]
        Pad1["Landing Pad 1 (Inbound)"]
        Pad2["Landing Pad 2 (Outbound)"]
        MetTower["Ultrasonic Met Tower"]
        AirLock["Robotic Conveyor Air-Lock"]
        SwapBay["Automated Battery Swap Bay"]
    end
    
    Pad1 --> AirLock
    MetTower --> SwapBay
    SwapBay --> Pad2
    AirLock --> Lockers["Customer Smart-Lockers (Ground Floor)"]
```

| Infrastructure Unit | Specification |
| :--- | :--- |
| **Pads & Runways** | 4 Enclosed weatherproof landing pads with hydraulic capture funnels |
| **Turnaround Time** | < 120 seconds (touchdown to relaunch) |
| **Acoustic Barrier** | Micro-perforated acoustic deflectors reducing perimeter noise by 14 dB |
| **Docking Automation** | Internal robotic conveyor transferring parcels to building cargo lifts |

---

## 2. Supported Fleets & Precision Systems

The vertiport is the primary daily destination for the [SwiftPack X-4 Urban Delivery Drone](../../fleet/urban-courier/swiftpack-x4-delivery-uav.md).

Precision touchdown in turbulent rooftop eddy currents is accomplished via differential corrections streamed from the [Centimetric RTK-GPS Positioning Module](../../avionics/navigation/rtk-gps-positioning-module.md), backed up by the optical target tracking in the [High-Speed Optical Flow & Terrain Sensor](../../avionics/flight-control/optical-flow-terrain-sensor.md).

---

## 3. Battery Management & Weather Failsafes

Rapid turnarounds are sustained by an integrated [Autonomous Robotic Battery Swap Station (BSS-600)](../charging/automated-battery-swap-station.md).

Rooftop ultrasonic anemometers feed micro-wind shear data directly into the [Micro-Weather Routing & Divert Matrix](../../operations/flight-corridors/weather-divert-routing-matrix.md). If wind shear exceeds 24 knots, incoming flights hold at peripheral approach corridors or execute the [Dynamic Geofence Breach Containment Protocol](../../safety/protocols/geofence-breach-containment.md).
