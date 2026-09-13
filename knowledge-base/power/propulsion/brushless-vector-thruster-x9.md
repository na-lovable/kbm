---
type: Propulsion
title: X-9 High-Torque Brushless Vector Thruster
description: Direct-drive coaxial brushless motor assembly with field-oriented control and regenerative deceleration.
tags: [power, propulsion, bldc, motor, vector-thrust]
timestamp: 2026-08-20T10:00:00.000Z
---
# X-9 High-Torque Brushless Vector Thruster

The **X-9 High-Torque Brushless Vector Thruster** is a high-efficiency electric motor and carbon propeller propulsion unit built for heavy-lift industrial multirotors. Featuring liquid-cooled stators and magnetic field-oriented control (FOC), the X-9 delivers exceptional thrust-to-weight ratios and ultra-fast rotational step response.

---

## 1. Electrical & Dynamic Performance

| Parameter | Value | Units | Conditions |
| :--- | :--- | :--- | :--- |
| **Max Continuous Thrust** | 28.5 | kg / motor | 100% Throttle, Sea Level |
| **Peak Burst Thrust** | 36.0 | kg / motor | Up to 15 seconds |
| **Rated Operating Voltage** | 48.0 - 58.4 | V DC | Nominal 48V bus |
| **Max Continuous Current** | 72.0 | A | With stator cooling airflow |
| **Motor Efficiency** | 91.5 | % | At 60% hover thrust point |
| **Propeller Dimension** | 32 x 10.5 | inches | Full carbon-fiber folding blades |

---

## 2. Airframe Deployment

The X-9 thruster serves as the core power unit on the [SkyLift H-80 Heavy Cargo Drone](../../fleet/heavy-lift/skylift-h80-cargo-drone.md), where 8 thrusters in coaxial arrangement generate over 220 kg of total lift capacity.

Power delivery to the thrusters is supplied by high-discharge [48V Solid-State Lithium Battery Packs](../energy-storage/solid-state-lithium-pack-48v.md).

---

## 3. High-Frequency Telemetry & Control

Each thruster integrates a CAN-FD motor controller streaming rotor RPM, phase temperature, inverter MOSFET temperatures, and current draw at 250Hz directly into the [Quantum Flight Management Computer V3](../../avionics/flight-control/quantum-flight-computer-v3.md). 

This continuous stream allows the autopilot to detect bearing degradation, propeller micro-cracks, or rotor imbalance hundreds of flight hours before mechanical failure.
