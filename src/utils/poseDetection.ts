// Define typings for MediaPipe Pose
interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface PoseResult {
  poseLandmarks: PoseLandmark[];
  image: HTMLCanvasElement; // Add image property to PoseResult
}

export interface PoseDetectionResult {
  image: HTMLCanvasElement;
  poses: PoseLandmark[] | null;
}

// Type definition for MediaPipe Pose
interface MediaPipePose {
  setOptions: (options: {
    modelComplexity: number;
    smoothLandmarks: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }) => void;
  onResults: (callback: (results: PoseResult) => void) => void;
  send: (config: { image: HTMLVideoElement }) => Promise<void>;
}

// Initialize global variables
let poseDetection: MediaPipePose | null = null;
let camera: Camera | null = null;
let lastVideoTime = -1;
let rafId: number | null = null;
let detecting = false;

// Define keypoint indices based on MediaPipe Pose model
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};

class Camera {
  video: HTMLVideoElement;
  videoWidth: number;
  videoHeight: number;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  stream: MediaStream | null = null;

  constructor(videoElement: HTMLVideoElement, width = 640, height = 480) {
    this.video = videoElement;
    this.videoWidth = width;
    this.videoHeight = height;
  }

  /**
   * Initializes the camera with the specified parameters
   */
  async setup() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available'
      );
    }

    // Stop any active streams
    if (this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      const tracks = stream.getTracks();
      for (const track of tracks) {
        track.stop();
      }
    }

    // Set video size
    this.video.width = this.videoWidth;
    this.video.height = this.videoHeight;

    // Request camera permission
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: this.videoWidth,
        height: this.videoHeight
      }
    });

    // Set video source and start playing
    this.video.srcObject = this.stream;

    return new Promise<void>((resolve) => {
      this.video.onloadedmetadata = () => {
        this.video.play();
        resolve();
      };
    });
  }

  /**
   * Stops the camera stream
   */
  stop() {
    if (this.stream) {
      const tracks = this.stream.getTracks();
      for (const track of tracks) {
        track.stop();
      }
      this.stream = null;
    }
    if (this.video.srcObject) {
      this.video.srcObject = null;
    }
  }
}

/**
 * Initializes the pose detection using MediaPipe Pose
 */
export async function initPoseDetection(): Promise<void> {
  return new Promise((resolve) => {
    // We will need to use the MediaPipe CDN to load the Pose library
    // Since this requires loading from a CDN, we'll use a script tag
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1635988162/pose.js';
    script.onload = () => {
      // Use the global Pose class
      const pose = new window.Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1635988162/${file}`;
        }
      }) as MediaPipePose;

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(onPoseResults);
      poseDetection = pose;
      resolve();
    };
    document.body.appendChild(script);
  });
}

// Define a callback for pose detection results
let poseResultsCallback: ((result: PoseDetectionResult | null) => void) | null = null;

/**
 * Sets a callback to be called with pose detection results
 */
export function setPoseResultsCallback(
  callback: ((result: PoseDetectionResult | null) => void) | (() => void) | null
) {
  poseResultsCallback = callback as ((result: PoseDetectionResult | null) => void) | null;
}

/**
 * Draw pose skeleton on canvas
 */
function drawPoseSkeleton(ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[], canvas: HTMLCanvasElement) {
  if (!landmarks.length) return;

  // Define connections for drawing the skeleton
  const connections = [
    // Face
    [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.LEFT_EYE_INNER],
    [POSE_LANDMARKS.LEFT_EYE_INNER, POSE_LANDMARKS.LEFT_EYE],
    [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.LEFT_EYE_OUTER],
    [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.RIGHT_EYE_INNER],
    [POSE_LANDMARKS.RIGHT_EYE_INNER, POSE_LANDMARKS.RIGHT_EYE],
    [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.RIGHT_EYE_OUTER],

    // Torso
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
    [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
    [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],

    // Arms
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
    [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
    [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
    [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],

    // Legs
    [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
    [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
    [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
    [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  ];

  // Set line style
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Green semi-transparent

  // Draw connections
  for (const [start, end] of connections) {
    const startPoint = landmarks[start];
    const endPoint = landmarks[end];

    // Check if points are visible enough
    if (
      startPoint.visibility && startPoint.visibility > 0.5 &&
      endPoint.visibility && endPoint.visibility > 0.5
    ) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
      ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
      ctx.stroke();
    }
  }

  // Draw keypoints
  ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'; // Red semi-transparent
  for (const point of landmarks) {
    if (point.visibility && point.visibility > 0.5) {
      ctx.beginPath();
      ctx.arc(
        point.x * canvas.width,
        point.y * canvas.height,
        5,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  }
}

/**
 * Handle pose detection results
 */
function onPoseResults(results: PoseResult) {
  // If we have a callback registered, call it with the results
  if (poseResultsCallback) {
    // Get the canvas element and create a context if not already done
    const canvas = document.getElementById('output-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure the canvas size matches the video
    const videoElement = document.getElementById('webcam') as HTMLVideoElement;
    if (videoElement) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    }

    // Clear previous drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the detected pose skeleton
    if (results.poseLandmarks) {
      drawPoseSkeleton(ctx, results.poseLandmarks, canvas);
    }

    // Call the callback with the results
    poseResultsCallback({
      image: canvas,
      poses: results.poseLandmarks || null
    });
  }
}

/**
 * Starts the camera and pose detection
 */
export async function startCamera(): Promise<void> {
  // Setup camera
  const videoElement = document.getElementById('webcam') as HTMLVideoElement;
  if (!videoElement) {
    throw new Error('Video element not found');
  }

  camera = new Camera(videoElement);
  try {
    await camera.setup();
    // Allow the camera to warm up
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize pose detection if not already done
    if (!poseDetection) {
      await initPoseDetection();
    }

    // Start detection loop
    detecting = true;
    detectPose();
  } catch (error) {
    console.error('Error starting camera', error);
    throw error;
  }
}

/**
 * Detects pose in the video stream
 */
async function detectPose() {
  if (!detecting || !camera || !poseDetection) return;

  if (camera.video.readyState < 2) {
    // Video not ready yet
    rafId = requestAnimationFrame(detectPose);
    return;
  }

  // If the video time hasn't changed, don't do unnecessary work
  if (camera.video.currentTime === lastVideoTime) {
    rafId = requestAnimationFrame(detectPose);
    return;
  }

  lastVideoTime = camera.video.currentTime;

  try {
    await poseDetection.send({ image: camera.video });
  } catch (error) {
    console.error('Error detecting pose', error);
  }

  rafId = requestAnimationFrame(detectPose);
}

/**
 * Stops the camera and pose detection
 */
export function stopCamera(): void {
  detecting = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (camera) {
    camera.stop();
    camera = null;
  }
  lastVideoTime = -1;
}

// Add typings for the MediaPipe Pose object to the Window interface
declare global {
  interface Window {
    Pose: new (config: { locateFile: (file: string) => string }) => MediaPipePose;
  }
}
