---
type: UAV
title: RotorWing V-200 Hybrid Cargo Cruiser
description: Long-endurance tandem tilt-wing hybrid UAV capable of 350km inter-city medical and critical cargo transit.
tags: [fleet, hybrid, long-range, inter-city, tilt-wing]
timestamp: 2026-08-20T10:00:00.000Z
---
# RotorWing V-200 Hybrid Cargo Cruiser

The **RotorWing V-200** is a long-range tandem tilt-wing hybrid vertical takeoff and landing (VTOL) unmanned aerial vehicle. It bridges the gap between urban delivery multicopters and fixed-wing regional air cargo, enabling 350km point-to-point transit of urgent medical supplies, microelectronics, and priority parcels.

---

## 1. Flight Dynamics & Aerodynamic Envelope

| Metric | Hover Mode (VTOL) | Cruise Mode (Fixed-Wing) | Units |
| :--- | :--- | :--- | :--- |
| **Max Airspeed** | 45.0 | 220.0 | km/h |
| **Stall Speed** | N/A (Rotary lift) | 78.0 | km/h |
| **Lift Mechanism** | 4x Vectored Tilt-Rotors | High-Aspect Aerodynamic Wing | — |
| **Operating Range** | 60.0 (Pure Electric) | 350.0 (Gas-Turbine Hybrid) | km |
| **Service Ceiling** | 1,200 | 3,800 | m MSL |
| **Max Payload** | 35.0 | 35.0 | kg |

---

## 2. Transition & Control Systems

During takeoff, the wings tilt upward 90 degrees to operate as a high-thrust quad-rotor. Once clear of ground obstacles at 60m AGL, the wings transition forward over an 8-second trajectory managed dynamically by the [Quantum Flight Management Computer V3](../../avionics/flight-control/quantum-flight-computer-v3.md).

Precision navigation across cross-regional airspace utilizes the [Centimetric RTK-GPS Positioning Module](../../avionics/navigation/rtk-gps-positioning-module.md) augmented by dual inertial reference units (IRU).

---

## 3. Operations & Corridor Integration

Long-distance transit flights adhere to designated regional airway structures mapped under [BVLOS Low-Altitude Corridor Navigation Procedure](../../operations/flight-corridors/bvlos-corridor-nav-procedure.md). 

The V-200 departs primarily from master logistical facilities such as the [Skyport Central Air Freight Fulfillment Hub](../../facilities/hubs/skyport-central-fulfillment-hub.md), communicating continuously with regional Air Traffic Control (ATC) and UTM (Unmanned Traffic Management) transponders.

---

## 4. Operational Safety Limits

- **Maximum Wind Resistance in Transition**: 32 knots (16.5 m/s).
- **Icing Protection**: Electro-thermal leading edge heating elements.
- **Flight Termination**: Automatic safe glide corridor calculation and emergency landing site selection upon loss of hybrid generator output.
