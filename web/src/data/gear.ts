export const gearCategories = [
  "Recording Devices",
  "Mounting & Stabilization",
  "Audio & Communication",
  "Motion Capture & Sensors",
  "Lighting & Environment",
  "Software & Processing",
] as const;

export type GearCategory = (typeof gearCategories)[number];

export type GearItem = {
  id: string;
  name: string;
  description: string;
  category: GearCategory;
  price?: string;
};

export const gearItems: GearItem[] = [
  { id: "iphone-15", category: "Recording Devices", name: "Smartphone (iPhone 15+/Android flagship)", description: "A high-resolution everyday camera for reliable first-person video capture." },
  { id: "gopro-hero", category: "Recording Devices", name: "GoPro Hero 12/13", description: "A rugged action camera for wide-angle tasks in active environments." },
  { id: "insta360-go", category: "Recording Devices", name: "Insta360 GO 3", description: "A compact wearable camera for lightweight hands-free recording." },
  { id: "dji-action", category: "Recording Devices", name: "DJI Osmo Action 4", description: "A stabilized action camera suited to long, movement-heavy captures." },
  { id: "spatial-headset", category: "Recording Devices", name: "Meta Quest 3 / Apple Vision Pro", description: "Spatial headsets for first-person mixed-reality and scene understanding data." },
  { id: "realsense", category: "Recording Devices", name: "Intel RealSense D435i/D455", description: "Depth cameras for synchronized RGB, motion, and spatial measurements." },
  { id: "oak-d", category: "Recording Devices", name: "OAK-D Lite (Luxonis)", description: "An edge AI camera for stereo depth and on-device visual processing." },
  { id: "structure-sensor", category: "Recording Devices", name: "Structure Sensor 3", description: "A mobile depth sensor for scanning rooms, objects, and workspaces." },
  { id: "head-strap", category: "Mounting & Stabilization", name: "Head Strap Mount", description: "A hands-free head mount for consistent eye-level point-of-view footage.", price: "3.00" },
  { id: "chest-harness", category: "Mounting & Stabilization", name: "Chest Harness Mount", description: "A stable chest-level mount for longer physical task recordings.", price: "4.00" },
  { id: "wrist-mount", category: "Mounting & Stabilization", name: "Wrist Mount Straps", description: "Wearable straps for close-range hand and tool interaction capture." },
  { id: "osmo-mobile", category: "Mounting & Stabilization", name: "DJI Osmo Mobile 8", description: "A smartphone gimbal for smooth walking and inspection sequences." },
  { id: "insta360-flow", category: "Mounting & Stabilization", name: "Insta360 Flow 2 Pro", description: "A portable tracking gimbal for stabilized mobile capture sessions." },
  { id: "magnetic-mount", category: "Mounting & Stabilization", name: "Magnetic Quick-Release Mounts", description: "Fast-swapping mounts for moving one camera between capture positions." },
  { id: "flexible-tripod", category: "Mounting & Stabilization", name: "Flexible Tripod (GorillaPod-style)", description: "An adaptable support for unusual angles and compact workspaces.", price: "1.99" },
  { id: "wireless-lav", category: "Audio & Communication", name: "Wireless Lavalier Microphone (DJI Mic 2 / Rode Wireless GO III)", description: "Clean wireless voice and environmental audio for mobile tasks." },
  { id: "shotgun-mic", category: "Audio & Communication", name: "Shotgun Microphone (Rode VideoMic)", description: "Directional audio capture that reduces distracting off-axis sound." },
  { id: "bone-conduction", category: "Audio & Communication", name: "Bone Conduction Headset Microphone", description: "Hands-free communication that keeps the contributor aware of surroundings." },
  { id: "audio-adapter", category: "Audio & Communication", name: "3.5mm Audio Adapter", description: "A compact adapter for connecting supported microphones to capture devices.", price: "2.00" },
  { id: "xsens", category: "Motion Capture & Sensors", name: "Xsens Link Motion Capture Suit", description: "Full-body inertial motion capture for precise human movement datasets." },
  { id: "manus", category: "Motion Capture & Sensors", name: "MANUS Metagloves", description: "Detailed finger and hand tracking for dexterous manipulation tasks." },
  { id: "rokoko", category: "Motion Capture & Sensors", name: "Rokoko Smartsuit Pro + Smartgloves", description: "A wearable body-and-hand capture system for coordinated motion sequences." },
  { id: "imu-nodes", category: "Motion Capture & Sensors", name: "Custom IMU Sensor Nodes (ESP32-C3 + MPU6050)", description: "Configurable sensor nodes for task-specific motion and orientation signals." },
  { id: "wearable", category: "Motion Capture & Sensors", name: "Apple Watch / Fitbit / Garmin", description: "Consumer wearables for time-aligned movement and activity measurements." },
  { id: "smart-insoles", category: "Motion Capture & Sensors", name: "Smart Insoles (Sensoria, Moticon)", description: "Pressure-aware insoles for gait, balance, and foot-loading data." },
  { id: "led-panel", category: "Lighting & Environment", name: "Portable LED Light Panel (Aputure MC / Lume Cube)", description: "Compact adjustable lighting for consistent indoor capture quality.", price: "1.50" },
  { id: "headlamp", category: "Lighting & Environment", name: "Headlamp with Adjustable Beam", description: "Wearable illumination for low-light, hands-busy environments." },
  { id: "ring-light", category: "Lighting & Environment", name: "Ring Light with Smartphone Mount", description: "Even frontal lighting with an integrated mobile capture position." },
  { id: "scanning-apps", category: "Software & Processing", name: "3D Scanning Apps (Polycam, Metaroom, 3D Scanner App, Skanect)", description: "Mobile and desktop tools for turning environments into spatial assets." },
  { id: "vision-software", category: "Software & Processing", name: "Visual Model Software (YOLOv10, OpenCV, MediaPipe, Apple Vision Framework)", description: "Vision tooling for detection, tracking, pose estimation, and analysis." },
];
