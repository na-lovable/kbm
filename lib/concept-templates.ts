export interface ConceptTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  defaultTags: string[];
  slugPlaceholder: string;
  titlePlaceholder: string;
  bodyTemplate: string;
  iconName: "Building2" | "Plane" | "Cpu" | "ShieldAlert" | "Compass" | "BatteryCharging" | "FileText" | "Route";
}

export const CONCEPT_TEMPLATES: ConceptTemplate[] = [
  {
    id: "facility-hub",
    name: "Vertiport & Facility Hub",
    description: "Physical ground station, rooftop vertiport, cargo hub, or maintenance depot.",
    type: "Facility",
    defaultTags: ["facilities", "vertiport", "ground-infrastructure", "cargo"],
    slugPlaceholder: "metro-vertiport-central-hub",
    titlePlaceholder: "Metro Vertiport Central Logistics Hub",
    iconName: "Building2",
    bodyTemplate: `The **Central Logistics Vertiport** provides high-throughput automated turnarounds, docking bays, and intermodal transport connection points for regional logistics UAVs.

---

## 1. Physical Specifications & Capacity

| Parameter | Specification | Units / Description |
| :--- | :--- | :--- |
| **Pads / Touchdown Bays** | 4 | Dedicated FATO touchdown areas |
| **Grid Power Rating** | 120 | kW Continuous Draw |
| **Turnaround Cycle Target** | < 120 | seconds |

---

## 2. Integrated Systems & Cross-References

- Power & Fast Charge: [Automated Battery Swap Station](./facilities/charging/automated-battery-swap-station.md)
- Air Traffic Interface: [Quantum Flight Management Computer V3](./avionics/flight-control/quantum-flight-computer-v3.md)
`,
  },
  {
    id: "fleet-uav",
    name: "Fleet UAV & Cargo Drone",
    description: "Unmanned aerial vehicle, heavy cargo lift cruiser, or last-mile courier aircraft.",
    type: "Fleet",
    defaultTags: ["fleet", "uav", "aerodynamics", "cargo-drone", "urban-courier"],
    slugPlaceholder: "skylift-x50-heavy-cargo-drone",
    titlePlaceholder: "SkyLift X-50 Heavy Cargo Logistics Drone",
    iconName: "Plane",
    bodyTemplate: `The **SkyLift X-50** is an autonomous electric multicopter engineered for middle-mile medical and payload distribution.

---

## 1. Flight Performance Metrics

| Metric | Rated Value | Operating Condition |
| :--- | :--- | :--- |
| **Max Takeoff Weight (MTOW)** | 85 kg | Standard Atmosphere (ISA) |
| **Payload Capacity** | 30 kg | Maximum payload mass |
| **Operational Cruise Speed** | 90 km/h | Optimal energy efficiency |
| **Service Radius** | 45 km | With reserve contingency |

---

## 2. Core Subsystems

- Propulsion: [X-9 High-Torque Brushless Vector Thruster](./power/propulsion/brushless-vector-thruster-x9.md)
- Energy Storage: [48V Solid-State Lithium Battery Pack](./power/energy-storage/solid-state-lithium-pack-48v.md)
- Navigation: [Centimetric RTK-GPS Positioning Module](./avionics/navigation/rtk-gps-positioning-module.md)
`,
  },
  {
    id: "avionics-hardware",
    name: "Avionics & Navigation Sensor",
    description: "Flight controller, LiDAR array, RTK-GPS receiver, or optical flow sensor.",
    type: "Avionics",
    defaultTags: ["avionics", "navigation", "sensors", "flight-control", "redundancy"],
    slugPlaceholder: "multi-band-rtk-gps-v2",
    titlePlaceholder: "Multi-Band Centimetric RTK-GPS Module V2",
    iconName: "Cpu",
    bodyTemplate: `The **Multi-Band RTK-GPS Module** delivers centimeter-level position estimation with dual-antenna heading for urban canyon navigation.

---

## 1. Technical Parameters

| Feature | Specification | Standard |
| :--- | :--- | :--- |
| **Position Accuracy** | ± 1.5 cm horizontal | RTK Fix mode |
| **Update Rate** | 20 Hz | Low-latency navigation loop |
| **Interface Protocol** | CAN-FD / Ethernet | UAVCAN v1.0 |

---

## 2. Redundancy & Cross-Linking

- Integrates into: [Quantum Flight Management Computer V3](./avionics/flight-control/quantum-flight-computer-v3.md)
- Complements: [Solid-State LiDAR Collision Avoidance Array](./avionics/navigation/lidar-collision-avoidance-array.md)
`,
  },
  {
    id: "safety-protocol",
    name: "Safety Protocol & Failsafe",
    description: "Emergency contingency sequence, geofence containment, or ballistic parachute recovery.",
    type: "Safety",
    defaultTags: ["safety", "protocols", "failsafe", "emergency", "containment"],
    slugPlaceholder: "rotor-loss-containment-protocol",
    titlePlaceholder: "Single-Rotor Loss Flight Stabilization & Emergency Landing Protocol",
    iconName: "ShieldAlert",
    bodyTemplate: `This safety protocol details the active stabilization matrix and autonomous forced landing routine triggered upon partial motor/rotor failure.

---

## 1. Trigger Conditions

\`\`\`
IF motor_rpm_delta > 35% AND attitude_divergence > 15 deg
THEN initiate Rotor Loss Emergency Matrix
\`\`\`

---

## 2. Failsafe Sequence Execution

1. **Attitude Stabilization**: Re-distribute throttle commands across surviving thrust vectors.
2. **Terrain Clearance**: Query nearest designated safety landing zone.
3. **Failsafe Release**: If attitude cannot be stabilized within 1.2s, deploy [Pyrotechnic Ballistic Parachute Recovery Failsafe](./safety/protocols/ballistic-parachute-failsafe.md).
`,
  },
  {
    id: "power-energy",
    name: "Power & Battery Storage",
    description: "Battery pack chemistry, fast-charge bus, power distribution unit, or motor drive.",
    type: "Power",
    defaultTags: ["power", "energy-storage", "battery", "fast-charging", "thermal"],
    slugPlaceholder: "high-density-solid-state-pack-60v",
    titlePlaceholder: "60V High-Energy-Density Solid-State Battery Pack",
    iconName: "BatteryCharging",
    bodyTemplate: `High-voltage, solid-electrolyte power pack engineered for high-C discharge rates and thermal stability during autonomous rapid turnaround cycles.

---

## 1. Cell Architecture & Ratings

| Parameter | Rating | Notes |
| :--- | :--- | :--- |
| **Nominal Voltage** | 58.8 V | 14S Solid-State Configuration |
| **Energy Density** | 380 Wh/kg | Gravimetric pack level |
| **Peak Discharge** | 120 A | 10s climb burst |

---

## 2. Compatible Infrastructure

- Managed by: [Autonomous Robotic Battery Swap Station (BSS-600)](./facilities/charging/automated-battery-swap-station.md)
`,
  },
  {
    id: "blank-document",
    name: "Blank OKF Document",
    description: "Clean canvas with basic headings and link references.",
    type: "Facility",
    defaultTags: ["operational", "general"],
    slugPlaceholder: "new-operational-node",
    titlePlaceholder: "New Operational Knowledge Node",
    iconName: "FileText",
    bodyTemplate: `Provide the core functional overview and architectural details for this concept.

---

## 1. Overview & Operational Scope

Describe the primary operational purpose, design constraints, and functional specifications.

---

## 2. Interconnections & Dependencies

- Connects to: [Central Operational Registry Map](./index.md)
`,
  },
];
