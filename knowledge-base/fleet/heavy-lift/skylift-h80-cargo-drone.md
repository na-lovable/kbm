---
type: UAV
title: SkyLift H-80 Heavy Cargo Drone
description: Industrial octocopter engineered for high-capacity middle-mile logistics up to 80kg payload.
tags: [fleet, heavy-lift, uav, autonomous, electric]
timestamp: 2026-08-20T10:00:00.000Z
---
# SkyLift H-80 Heavy Cargo Drone

The **SkyLift H-80** is an industrial-grade, heavy-lift autonomous cargo octocopter designed for middle-mile hub-to-hub freight distribution and inter-facility logistics. It delivers high-reliability automated cargo transit in both metropolitan fringe corridors and regional maritime environments.

---

## 1. Technical Specifications

| Parameter | Specification | Units | Notes |
| :--- | :--- | :--- | :--- |
| **Max Takeoff Weight (MTOW)** | 185.0 | kg | Carbon-fiber reinforced titanium frame |
| **Max Payload Capacity** | 80.0 | kg | Standard ISO-D container cradle |
| **Cruising Speed** | 95.0 | km/h | Optimal aerodynamic efficiency |
| **Maximum Range** | 120.0 | km | At 50% nominal payload |
| **Operating Altitude** | 120 - 400 | m AGL | BVLOS designated altitude band |
| **Propulsion Configuration** | 8x Coaxial Direct BLDC | — | Redundant dual-tier arm layout |
| **Power Plant** | Dual 48V Solid-State Packs | — | Hot-swappable interface |

---

## 2. Propulsion & Power Architecture

The H-80 utilizes eight [X-9 High-Torque Brushless Vector Thrusters](../../power/propulsion/brushless-vector-thruster-x9.md) arranged in a coaxial quad-arm formation. This setup provides active differential thrust vectoring and single-motor failure survivability without loss of altitude.

The power subsystem is driven by dual modular [48V Solid-State Lithium Battery Packs](../../power/energy-storage/solid-state-lithium-pack-48v.md), providing a combined 12.8 kWh capacity. The airframe features a rapid-latch docking underside compatible with the [Autonomous Robotic Battery Swap Station (BSS-600)](../../facilities/charging/automated-battery-swap-station.md).

---

## 3. Flight Management & Telemetry

All flight dynamics, waypoint following, and detect-and-avoid (DAA) computations are orchestrated by the onboard [Quantum Flight Management Computer V3](../../avionics/flight-control/quantum-flight-computer-v3.md). 

Real-time health telemetry is transmitted every 100ms via dual 5G RedCap and SATCOM data-links to the flight dispatch operations center at [Skyport Central Air Freight Fulfillment Hub](../../facilities/hubs/skyport-central-fulfillment-hub.md).

---

## 4. Emergency & Failsafe Measures

In the event of multiple motor failures, complete power bus disconnect, or severe structural disruption, the H-80 is equipped with a high-speed [Pyrotechnic Ballistic Parachute Recovery Failsafe](../../safety/protocols/ballistic-parachute-failsafe.md). The parachute automatically deploys in under 350ms, decelerating the descent to less than 4.5 m/s to ensure ground hazard compliance under [FAA Part 108 BVLOS Regulatory Compliance Framework](../../safety/regulations/faa-part-108-bvlos-compliance.md).
