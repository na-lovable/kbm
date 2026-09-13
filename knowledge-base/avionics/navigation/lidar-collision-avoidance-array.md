---
type: Avionics
title: Solid-State LiDAR Collision Avoidance Array
description: 360-degree pulsed laser sensing unit operating at 905nm for dynamic obstacle detection and urban wire avoidance.
tags: [avionics, navigation, lidar, daa, perception]
timestamp: 2026-08-20T10:00:00.000Z
---
# Solid-State LiDAR Collision Avoidance Array

The **Solid-State LiDAR Collision Avoidance Array (SS-LIDAR-360)** provides high-resolution 3D spatial awareness for autonomous UAVs operating in complex urban and suburban environments. With no mechanical moving mirrors, the solid-state architecture delivers extreme shock tolerance and continuous 300-meter spherical scanning.

---

## 1. Sensor Characteristics & Optics

| Specification | Metric | Remarks |
| :--- | :--- | :--- |
| **Wavelength** | 905 nm | Class 1 Eye-Safe pulsed semiconductor diode |
| **Detection Range** | 0.2 m to 300 m | @ 80% surface reflectivity |
| **Field of View (Horizontal)** | 360° | Quadrant solid-state array integration |
| **Field of View (Vertical)** | +30° to -60° | Optimized for downward obstacle & cable detection |
| **Angular Resolution** | 0.08° | Resolves 1.5mm overhead power lines at 40m |
| **Point Output Rate** | 1,200,000 pts/sec | Streamed directly via gigabit Ethernet |

---

## 2. Dynamic Detect-and-Avoid (DAA)

The LiDAR point cloud feeds directly into the neural perception engine of the [Quantum Flight Management Computer V3](../flight-control/quantum-flight-computer-v3.md). 

It is a core sensory input for the [SwiftPack X-4 Urban Delivery Drone](../../fleet/urban-courier/swiftpack-x4-delivery-uav.md) during descent into residential drop zones, filtering out moving tree canopies, power lines, and unexpected ground obstacles.

---

## 3. Adverse Weather & Atmospheric Degradation

In conditions of heavy fog, marine haze, or localized rainstorms, LiDAR beam attenuation is continuously monitored. If return signal-to-noise ratio (SNR) drops below 14 dB, the flight computer automatically triggers weather avoidance actions under the [Micro-Weather Routing & Divert Matrix](../../operations/flight-corridors/weather-divert-routing-matrix.md).
