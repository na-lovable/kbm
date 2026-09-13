---
type: Avionics
title: Centimetric RTK-GPS Positioning Module
description: Multi-band GNSS receiver utilizing real-time kinematic differential corrections for sub-2cm landing accuracy.
tags: [avionics, navigation, rtk-gps, gnss, precision-landing]
timestamp: 2026-08-20T10:00:00.000Z
---
# Centimetric RTK-GPS Positioning Module

The **Centimetric RTK-GPS Positioning Module (RTK-Pro 400)** is a multi-constellation, multi-frequency satellite positioning unit that provides ultra-high precision navigation down to 1.4 cm horizontal accuracy. It forms the backbone of autonomous robotic docking and precision vertiport touchdowns.

---

## 1. GNSS Constellation Support & Accuracy

| Parameter | Standard GNSS | RTK-Corrected | Units |
| :--- | :--- | :--- | :--- |
| **Constellations** | GPS, GLONASS, Galileo, BeiDou, QZSS | Same + Ground Base Station | — |
| **Horizontal Accuracy (RMS)** | 1.8 | 0.014 (1.4 cm) | m |
| **Vertical Accuracy (RMS)** | 2.5 | 0.021 (2.1 cm) | m |
| **Time-to-First-Fix (Cold)** | < 28 | < 12 (Hot reacquisition: 1.2s) | s |
| **Differential Link** | N/A | NTRIP over 5G / 900MHz RF | — |

---

## 2. Precision Docking & Infrastructure Integration

Centimetric satellite tracking enables UAVs to interface seamlessly with ground automation:
- Precision alignment with landing pads on [Metro Vertiport Alpha (Downtown Hub)](../../facilities/hubs/metro-rooftop-vertiport-alpha.md).
- Automated docking into the precision capture mechanism of the [Autonomous Robotic Battery Swap Station (BSS-600)](../../facilities/charging/automated-battery-swap-station.md).

---

## 3. Autopilot Synchronization

The module streams NMEA and binary UBX-NAV-PVT sentences at 20Hz directly into the [Quantum Flight Management Computer V3](../flight-control/quantum-flight-computer-v3.md), where it is tightly coupled with IMU accelerometer and gyro data using an Extended Kalman Filter (EKF).
