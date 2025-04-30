# Fitness Form Checker

A web application that uses computer vision to analyze and provide feedback on exercise form in real-time, starting with squat form analysis.

![Fitness Form Checker Screenshot](https://ext.same-assets.com/3188646842/1248550479.jpeg)

## Live Demo

Access the live application at [https://same-5b1z8kerkf7-latest.netlify.app](https://same-5b1z8kerkf7-latest.netlify.app)

## Features

- Real-time pose detection using MediaPipe Pose
- Detailed squat form analysis
- Audio feedback for form corrections
- Visual skeleton overlay to help visualize body position
- Camera controls for easy start/stop
- Detailed form guidance and feedback

## How to Use

1. Visit the application in your web browser
2. Allow camera permissions when prompted
3. Position yourself in a side view to the camera for best results
4. Click the "Start Camera" button
5. Perform squats while facing sideways to the camera
6. Receive real-time feedback on your form
7. Click "Stop Camera" when finished

## Feedback Provided

The app analyzes several aspects of your squat form:

- **Squat Depth**: Whether your hips go below your knees
- **Knee Position**: If your knees extend too far past your toes
- **Back Alignment**: Whether your back remains straight during the squat
- **Overall Form**: General feedback on your squat technique

## Tips for Best Results

- Wear form-fitting clothing for better joint detection
- Ensure good lighting in your environment
- Position your camera at hip height for the best side view
- Make sure your full body is visible in the camera frame
- Stand sideways to the camera (either left or right side)

## Privacy

- All processing is done locally in your browser
- No video data is sent to any server
- Camera access is only active while you're using the application

## Technical Details

- Built with React and TypeScript
- Uses MediaPipe Pose for pose estimation
- Performs real-time angle calculations for form analysis
- Provides audio feedback through the Web Audio API
- Deployed on Netlify

## Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/fitness-form-checker.git

# Navigate to the project directory
cd fitness-form-checker

# Install dependencies
bun install

# Start the development server
bun run dev
```

## Future Plans

- Support for additional exercises (deadlifts, lunges, push-ups)
- Rep counting functionality
- Progress tracking over time
- More detailed analytics
- Customizable form criteria
