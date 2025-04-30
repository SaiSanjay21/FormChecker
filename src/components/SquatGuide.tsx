import type React from 'react';

const SquatGuide: React.FC = () => {
  return (
    <div className="mt-8 rounded-md bg-white p-4 shadow-md">
      <h2 className="mb-2 text-lg font-semibold">Proper Squat Form Guide</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-green-100 bg-green-50 p-3">
          <h3 className="mb-2 font-medium text-green-800">Correct Squat Form:</h3>
          <ul className="list-inside list-disc text-sm text-green-700">
            <li>Keep your back straight and chest up</li>
            <li>Knees should track over toes, not cave inward</li>
            <li>Squat deep enough (hips below knees)</li>
            <li>Heels stay on the ground</li>
            <li>Knees should not extend past toes</li>
            <li>Maintain balance throughout the movement</li>
          </ul>
          <div className="mt-3 flex justify-center">
            <img
              src="https://www.fitnesseducation.edu.au/wp-content/uploads/2017/03/Perfect-Squat.jpg"
              alt="Correct squat form"
              className="max-h-40 rounded-md"
            />
          </div>
        </div>

        <div className="rounded-md border border-red-100 bg-red-50 p-3">
          <h3 className="mb-2 font-medium text-red-800">Common Squat Mistakes:</h3>
          <ul className="list-inside list-disc text-sm text-red-700">
            <li>Rounding the back</li>
            <li>Not squatting deep enough</li>
            <li>Knees caving inward</li>
            <li>Heels lifting off the ground</li>
            <li>Knees extending too far forward</li>
            <li>Looking down instead of straight ahead</li>
          </ul>
          <div className="mt-3 flex justify-center">
            <img
              src="https://www.t-nation.com/wp-content/uploads/2019/03/The-Goblet-Squat.jpg"
              alt="Incorrect squat form"
              className="max-h-40 rounded-md"
            />
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-blue-50 p-3">
        <h3 className="mb-2 font-medium text-blue-800">For Best Results:</h3>
        <p className="text-sm text-blue-700">
          Position yourself with a side view to the camera for the most accurate form analysis.
          Wear form-fitting clothing so that the AI can detect your joints properly.
          Ensure the room is well-lit and you are fully visible in the frame.
        </p>
      </div>
    </div>
  );
};

export default SquatGuide;
