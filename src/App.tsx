import { useState, useEffect, useRef, useCallback } from "react";
import { startCamera, stopCamera, setPoseResultsCallback, type PoseDetectionResult } from "./utils/poseDetection";
import { analyzeSquat, getSquatFeedback, type SquatAnalysisResult, SquatIssue } from "./utils/squatAnalysis";
import { playThrottledFeedbackSound } from "./utils/soundFeedback";
import SquatGuide from "./components/SquatGuide";

function App() {
  const [selectedExercise, setSelectedExercise] = useState("squat");
  const [cameraActive, setCameraActive] = useState(false);
  const [feedback, setFeedback] = useState<string[]>(["No exercise in progress. Start the camera to begin analysis."]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Analysis state
  const [squatAnalysisResult, setSquatAnalysisResult] = useState<SquatAnalysisResult | null>(null);

  // Previous result ref to track changes
  const prevResultRef = useRef<SquatAnalysisResult | null>(null);

  // Use a ref to track if component is mounted
  const mounted = useRef(true);

  /**
   * Handles pose detection results
   */
  const handlePoseResults = useCallback((result: PoseDetectionResult | null) => {
    if (!result || !mounted.current) return;

    // Analyze pose based on selected exercise
    if (selectedExercise === "squat") {
      const analysisResult = analyzeSquat(result.poses);
      setSquatAnalysisResult(analysisResult);
    }
  }, [selectedExercise]);

  // Setup unmount cleanup
  useEffect(() => {
    return () => {
      mounted.current = false;
      if (cameraActive) {
        stopCamera();
      }
    };
  }, [cameraActive]);

  // Register callback for pose detection results
  useEffect(() => {
    setPoseResultsCallback(handlePoseResults);

    return () => {
      setPoseResultsCallback(null);
    };
  }, [handlePoseResults]);

  // Update feedback when analysis results change and play sounds when form issues are detected
  useEffect(() => {
    if (selectedExercise === "squat" && squatAnalysisResult) {
      const newFeedback = getSquatFeedback(squatAnalysisResult);
      setFeedback(newFeedback);

      // Play sound for form issues (only if squat is in progress)
      if (squatAnalysisResult.isSquatting && soundEnabled) {
        // Check if there are any form issues, excluding the NONE issue
        const hasIssues = squatAnalysisResult.issues.some(issue => issue !== SquatIssue.NONE);

        // Play appropriate sound based on form quality
        if (hasIssues) {
          playThrottledFeedbackSound('error');
        } else if (
          // Play success sound when transitioning from bad form to good form
          prevResultRef.current?.isSquatting &&
          prevResultRef.current.issues.some(issue => issue !== SquatIssue.NONE)
        ) {
          playThrottledFeedbackSound('success');
        }
      }

      // Update the previous result ref
      prevResultRef.current = squatAnalysisResult;
    }
  }, [squatAnalysisResult, selectedExercise, soundEnabled]);

  /**
   * Handles start camera button click
   */
  const handleStartCamera = async () => {
    try {
      setLoading(true);
      setError(null);

      await startCamera();

      setCameraActive(true);
      setFeedback(["Preparing to analyze your form..."]);

    } catch (err) {
      console.error("Error starting camera:", err);
      setError("Failed to access camera. Please make sure you have granted camera permissions and try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles stop camera button click
   */
  const handleStopCamera = () => {
    stopCamera();
    setCameraActive(false);
    setFeedback(["Camera stopped. Start the camera to begin analysis."]);
    setSquatAnalysisResult(null);
    prevResultRef.current = null;
  };

  /**
   * Toggles sound feedback
   */
  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 p-4 text-white shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Fitness Form Checker</h1>
        </div>
      </header>

      <main className="container mx-auto mt-8 px-4 pb-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="w-3/4">
              <label htmlFor="exercise-select" className="mb-2 block font-medium text-gray-700">
                Select Exercise:
              </label>
              <select
                id="exercise-select"
                className="w-full rounded-md border border-gray-300 p-2"
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
              >
                <option value="squat">Squat</option>
              </select>
            </div>
            <div className="flex items-center">
              <button
                onClick={toggleSound}
                className="flex items-center rounded-md bg-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-300"
                title={soundEnabled ? "Mute sound feedback" : "Enable sound feedback"}
              >
                {soundEnabled ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                    Sound On
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Sound Off
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden bg-black relative mb-4">
            <video
              id="webcam"
              className="mx-auto h-auto w-full max-w-2xl"
              autoPlay
              playsInline
              muted
            />
            <canvas
              id="output-canvas"
              className="absolute left-0 top-0 h-full w-full"
            />
          </div>

          <div
            id="feedback-container"
            className="mt-4 rounded-md bg-white p-4 shadow-md"
          >
            <h2 className="mb-2 text-lg font-semibold">Form Feedback:</h2>
            <div id="feedback-messages" className="min-h-[4rem] text-lg">
              {error ? (
                <p className="text-red-600">{error}</p>
              ) : feedback.length > 0 ? (
                feedback.map((message, i) => (
                  <p key={`feedback-${i}-${message.substring(0, 10)}`} className="mb-1">{message}</p>
                ))
              ) : (
                <p>No feedback available yet.</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={handleStartCamera}
              disabled={cameraActive || loading}
              className={`rounded-md bg-blue-600 px-4 py-2 text-white ${
                cameraActive || loading
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-blue-700"
              }`}
            >
              {loading ? "Starting Camera..." : "Start Camera"}
            </button>
            <button
              onClick={handleStopCamera}
              disabled={!cameraActive || loading}
              className={`rounded-md bg-red-600 px-4 py-2 text-white ${
                !cameraActive || loading
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-red-700"
              }`}
            >
              Stop Camera
            </button>
          </div>

          {squatAnalysisResult && (
            <div className="mt-6 rounded-md bg-white p-4 shadow-md">
              <h2 className="mb-2 text-lg font-semibold">Analysis Details:</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Knee Angle:</p>
                  <p className="font-medium">{Math.round(squatAnalysisResult.kneeAngle)}°</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Back Angle:</p>
                  <p className="font-medium">{Math.round(squatAnalysisResult.backAngle)}°</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hip Angle:</p>
                  <p className="font-medium">{Math.round(squatAnalysisResult.hipAngle)}°</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Squat Depth Ratio:</p>
                  <p className="font-medium">{squatAnalysisResult.depthRatio.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 bg-white p-4 rounded-md shadow-md">
            <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Position yourself with a side view to the camera (either left or right side facing the camera).</li>
              <li>Press the "Start Camera" button and wait for the pose detection to initialize.</li>
              <li>Stand up straight to begin, then perform a squat with proper form.</li>
              <li>The system will analyze your form in real-time and provide feedback.</li>
              <li>When finished, press the "Stop Camera" button to end the session.</li>
            </ol>
            <div className="mt-4 p-2 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> For best results, wear form-fitting clothes, ensure good lighting, and make sure your full body is visible in the frame.
              </p>
            </div>
          </div>

          {/* Display squat guide when squat is selected */}
          {selectedExercise === "squat" && <SquatGuide />}
        </div>
      </main>

      <footer className="bg-gray-800 text-center text-white p-4 mt-8">
        <p className="text-sm">Fitness Form Checker - A real-time exercise form analysis tool</p>
        <p className="text-xs mt-1 text-gray-400">Using MediaPipe Pose for skeletal tracking and form analysis</p>
      </footer>
    </div>
  );
}

export default App;
