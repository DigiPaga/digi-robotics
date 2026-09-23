# DigiAgent Visual Model (ScanTech) Deployment Guide

The **DigiAgent Visual Model** is a lightweight, on-device computer vision model designed to run on iOS and Android smartphones. It provides real-time feedback to data collectors, ensuring the captured egocentric footage meets the quality standards required by robotics companies.

## 🎯 Capabilities
- **Hand Visibility Detection**: Ensures hands remain in the frame during fine-motor tasks.
- **Motion Blur Warning**: Alerts the user if the camera is moving too fast for usable training data.
- **Lighting Quality Score**: Evaluates ambient light in real-time, prompting the user to adjust their environment.
- **Object Recognition**: Identifies common task objects (e.g., tools, kitchen utensils) to auto-tag the dataset.

## 📱 On-Device Deployment (Edge AI)
To preserve user privacy and reduce bandwidth, the model runs **100% on-device** using:
- **iOS**: Core ML (optimized for Apple Neural Engine)
- **Android**: TensorFlow Lite (optimized for mobile GPUs/NPUs)

### Integration Flow:
1. User opens the DigiAgent mobile app and starts recording.
2. The ScanTech model processes frames locally at 15 FPS.
3. If quality drops (e.g., hands leave frame), a visual overlay warns the user.
4. Upon stopping, the app auto-generates a quality score (0-100) and metadata tags.
5. Only high-scoring clips are encrypted and uploaded to IPFS.

## 🔌 API Access for Robotics Companies
Robotics companies can license the ScanTech model to run on their own robot fleets for sim-to-real validation.

**Endpoint**: `POST /api/models/scantech/validate`
**Payload**: `{ "video_cid": "Qm...", "required_tags": ["hand-visibility", "stable-lighting"] }`
**Response**: `{ "passed": true, "confidence": 0.94, "metadata": {...} }`

## 🚀 Future Roadmap
- **Federated Learning**: Allow users to contribute to model improvements without uploading raw video, earning additional USDC rewards.
- **AR Overlays**: Project bounding boxes directly onto the user's phone screen via ARKit/ARCore to guide optimal camera angles.
