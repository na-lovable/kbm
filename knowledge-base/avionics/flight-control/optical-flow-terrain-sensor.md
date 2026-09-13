---
type: Avionics
title: High-Speed Optical Flow & Terrain Sensor
description: Downward-facing computer vision and time-of-flight sensor suite for GPS-denied precision hovering and drop verification.
tags: [avionics, vision, optical-flow, precision-drop, time-of-flight]
timestamp: 2026-08-29T14:12:13.503Z
---
# High-Speed Optical Flow & Terrain Sensor

The **High-Speed Optical Flow & Terrain Sensor (OFS-Vision 4K)** combines an ultra-fast monochrome global shutter camera and a multi-zone infrared Time-of-Flight (ToF) array. It provides robust velocity estimation, terrain slope mapping, and drop zone clearance in GPS-degraded or urban canyon environments.

---

## 1. Specifications & Operating Envelope

| Feature | Specification | Units |
| :--- | :--- | :--- |
| **Optical Flow Sensor** | 640x480 Global Shutter @ 120 FPS | — |
| **ToF Rangefinder Range** | 0.05 to 45.0 | m |
| **ToF Field of View** | 45° x 45° Multi-Zone (8x8 grid) | — |
| **Illumination** | Integrated 850nm Pulsed IR Matrix | Active night vision |
| **Velocity Tracking Range** | 0 to 25.0 | m/s |
| **Surface Detection Minimum** | 10 Lux (0 Lux with active IR LED) | Lux |

---

## 2. Low-Altitude Operations & Winch Deployment

When the [SwiftPack X-4 Urban Delivery Drone](../../fleet/urban-courier/swiftpack-x4-delivery-uav.md) arrives over a designated customer drop zone, the OFS-Vision 4K takes primary command of positional hold.

It confirms that the ground footprint is clear of pets, children, or garden furniture before signaling the [Tethered Payload Winch & Delivery System](../../operations/ground-handling/automated-payload-winch-system.md) to initiate cable descent.

---

## 3. Vertiport Approach Support

During terminal descent at the [Metro Vertiport Alpha (Downtown Hub)](../../facilities/hubs/metro-rooftop-vertiport-alpha.md), the sensor cross-references fiducial AprilTag markers printed on the landing surface, confirming docking alignment within 5 millimeters.

---

## Merged from test avionics

Provide the architectural overview and specifications here.

## Interconnections

- Connects to [Central Map](./index.md)
- And also this - [Metro Vertiport Alpha (Downtown Hub)](./facilities/hubs/metro-rooftop-vertiport-alpha.md)
- Another connection [Centimetric RTK-GPS Positioning Module](./avionics/navigation/rtk-gps-positioning-module.md)
