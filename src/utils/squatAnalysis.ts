import { POSE_LANDMARKS } from './poseDetection';

// Interface for pose landmarks from MediaPipe
interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Define the possible form issues
export enum SquatIssue {
  NONE = 'none',
  NOT_DEEP_ENOUGH = 'not_deep_enough',
  KNEES_TOO_FORWARD = 'knees_too_forward',
  BACK_NOT_STRAIGHT = 'back_not_straight',
  KNEES_CAVING_IN = 'knees_caving_in',
}

// Interface for squat form analysis results
export interface SquatAnalysisResult {
  issues: SquatIssue[];
  hipAngle: number;
  kneeAngle: number;
  backAngle: number;
  depthRatio: number;
  isSquatting: boolean;
}

// Constants for squat form analysis
const MIN_VISIBILITY_THRESHOLD = 0.65;
const SQUAT_DEPTH_THRESHOLD = 0.75; // Ratio of hip to knee height (deeper = lower value)
const KNEE_FORWARD_THRESHOLD = 0.1; // Normalized units: Knee x should not exceed ankle x by this much
const BACK_ANGLE_THRESHOLD = 20; // Degrees (smaller = more vertical)
const SQUAT_START_THRESHOLD = 150; // Knee angle in degrees to consider the start of a squat
const KNEE_ANGLE_THRESHOLD = 100; // Knee angle in degrees for deep squat

/**
 * Calculates the angle between three points in 2D space
 * Returns angle in degrees
 */
export function calculateAngle(
  p1: PoseLandmark,
  p2: PoseLandmark,
  p3: PoseLandmark
): number {
  // Check visibility if available
  if (
    (p1.visibility && p1.visibility < MIN_VISIBILITY_THRESHOLD) ||
    (p2.visibility && p2.visibility < MIN_VISIBILITY_THRESHOLD) ||
    (p3.visibility && p3.visibility < MIN_VISIBILITY_THRESHOLD)
  ) {
    return 0; // Return 0 for low visibility points
  }

  // Calculate vectors
  const vector1 = {
    x: p1.x - p2.x,
    y: p1.y - p2.y
  };
  const vector2 = {
    x: p3.x - p2.x,
    y: p3.y - p2.y
  };

  // Calculate dot product
  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;

  // Calculate magnitudes
  const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

  // Calculate angle in radians and convert to degrees
  const angleRadians = Math.acos(dotProduct / (magnitude1 * magnitude2));
  if (Number.isNaN(angleRadians)) {
    return 0;
  }

  const angleDegrees = angleRadians * (180 / Math.PI);
  return angleDegrees;
}

/**
 * Checks if the knees are in front of the toes/ankles
 */
function checkKneesForward(
  landmarks: PoseLandmark[]
): boolean {
  // Get right side keypoints (assuming side view with right side facing camera)
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  // Check visibility
  if (
    !rightKnee.visibility || rightKnee.visibility < MIN_VISIBILITY_THRESHOLD ||
    !rightAnkle.visibility || rightAnkle.visibility < MIN_VISIBILITY_THRESHOLD
  ) {
    // Fall back to left side if right side is not visible
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

    if (
      !leftKnee.visibility || leftKnee.visibility < MIN_VISIBILITY_THRESHOLD ||
      !leftAnkle.visibility || leftAnkle.visibility < MIN_VISIBILITY_THRESHOLD
    ) {
      return false; // Not enough visibility to determine
    }

    // Check if left knee is too far forward
    return leftKnee.x > leftAnkle.x + KNEE_FORWARD_THRESHOLD;
  }

  // Check if right knee is too far forward
  return rightKnee.x > rightAnkle.x + KNEE_FORWARD_THRESHOLD;
}

/**
 * Checks if the back is straight during the squat
 * Using the angle between shoulders, hips, and knees
 */
function checkBackStraight(
  landmarks: PoseLandmark[]
): { isBackStraight: boolean; backAngle: number } {
  // Get right side keypoints (assuming side view with right side facing camera)
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

  // Calculate back angle
  const backAngle = calculateAngle(rightShoulder, rightHip, rightKnee);

  // If back angle calculation failed, try left side
  if (backAngle === 0) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];

    const leftBackAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
    return {
      isBackStraight: leftBackAngle <= BACK_ANGLE_THRESHOLD,
      backAngle: leftBackAngle
    };
  }

  return {
    isBackStraight: backAngle <= BACK_ANGLE_THRESHOLD,
    backAngle
  };
}

/**
 * Checks if the squat is deep enough (hips below knees)
 */
function checkSquatDepth(
  landmarks: PoseLandmark[]
): { isDeepEnough: boolean; depthRatio: number } {
  // Get right side keypoints
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

  // Check visibility
  if (
    !rightHip.visibility || rightHip.visibility < MIN_VISIBILITY_THRESHOLD ||
    !rightKnee.visibility || rightKnee.visibility < MIN_VISIBILITY_THRESHOLD
  ) {
    // Fall back to left side
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];

    if (
      !leftHip.visibility || leftHip.visibility < MIN_VISIBILITY_THRESHOLD ||
      !leftKnee.visibility || leftKnee.visibility < MIN_VISIBILITY_THRESHOLD
    ) {
      return { isDeepEnough: false, depthRatio: 1.0 };
    }

    // Calculate depth ratio using y coordinates (lower on screen = larger y value)
    const depthRatio = leftHip.y / leftKnee.y;
    return {
      isDeepEnough: depthRatio >= SQUAT_DEPTH_THRESHOLD,
      depthRatio
    };
  }

  // Calculate depth ratio
  const depthRatio = rightHip.y / rightKnee.y;
  return {
    isDeepEnough: depthRatio >= SQUAT_DEPTH_THRESHOLD,
    depthRatio
  };
}

/**
 * Analyzes squat form from pose landmarks
 */
export function analyzeSquat(landmarks: PoseLandmark[] | null): SquatAnalysisResult | null {
  // Return null if no landmarks
  if (!landmarks || landmarks.length === 0) {
    return null;
  }

  // Calculate knee angle to determine if in squatting position
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  let kneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

  // If right knee angle calculation failed, try left side
  if (kneeAngle === 0) {
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  }

  // Calculate hip angle (for additional information)
  const hipAngle = calculateAngle(
    landmarks[POSE_LANDMARKS.RIGHT_SHOULDER] || landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
    landmarks[POSE_LANDMARKS.RIGHT_HIP] || landmarks[POSE_LANDMARKS.LEFT_HIP],
    landmarks[POSE_LANDMARKS.RIGHT_KNEE] || landmarks[POSE_LANDMARKS.LEFT_KNEE]
  );

  // Check squat depth
  const { isDeepEnough, depthRatio } = checkSquatDepth(landmarks);

  // Check if knees are too far forward
  const isKneesTooForward = checkKneesForward(landmarks);

  // Check if back is straight
  const { isBackStraight, backAngle } = checkBackStraight(landmarks);

  // Determine if the person is currently in a squat (knee angle below threshold)
  const isSquatting = kneeAngle < SQUAT_START_THRESHOLD;

  // Collect issues
  const issues: SquatIssue[] = [];

  if (isSquatting) {
    if (!isDeepEnough) {
      issues.push(SquatIssue.NOT_DEEP_ENOUGH);
    }

    if (isKneesTooForward) {
      issues.push(SquatIssue.KNEES_TOO_FORWARD);
    }

    if (!isBackStraight) {
      issues.push(SquatIssue.BACK_NOT_STRAIGHT);
    }
  }

  // If no issues and the person is squatting, add NONE
  if (issues.length === 0 && isSquatting) {
    issues.push(SquatIssue.NONE);
  }

  return {
    issues,
    hipAngle,
    kneeAngle,
    backAngle,
    depthRatio,
    isSquatting
  };
}

/**
 * Returns user-friendly feedback messages for squat form issues
 */
export function getSquatFeedback(result: SquatAnalysisResult | null): string[] {
  if (!result || !result.isSquatting) {
    return ["Prepare to squat. Position yourself with side view to the camera."];
  }

  const feedback: string[] = [];

  // Check if any issues were detected
  if (result.issues.includes(SquatIssue.NONE)) {
    feedback.push("Great form! Keep it up!");
    return feedback;
  }

  // Add feedback based on detected issues
  if (result.issues.includes(SquatIssue.NOT_DEEP_ENOUGH)) {
    feedback.push("Squat deeper - try to get your hips below your knees.");
  }

  if (result.issues.includes(SquatIssue.KNEES_TOO_FORWARD)) {
    feedback.push("Keep your knees behind your toes.");
  }

  if (result.issues.includes(SquatIssue.BACK_NOT_STRAIGHT)) {
    feedback.push("Straighten your back - maintain a neutral spine position.");
  }

  if (result.issues.includes(SquatIssue.KNEES_CAVING_IN)) {
    feedback.push("Keep your knees aligned with your toes - don't let them cave inward.");
  }

  // If no specific feedback, provide general guidance
  if (feedback.length === 0) {
    feedback.push("Maintain proper form throughout the squat.");
  }

  return feedback;
}
