import tf from "@tensorflow/tfjs-node";

const trainingData = [
  // Week 1
  {
    bench: { weight: 100, reps: 8, feeling: "easy" },
    squat: { weight: 140, reps: 10, feeling: "easy" },
    deadlift: { weight: 160, reps: 5, feeling: "medium" },
  },
  {
    bench: { weight: 102.5, reps: 8, feeling: "medium" },
    squat: { weight: 142.5, reps: 9, feeling: "easy" },
    deadlift: { weight: 161, reps: 5, feeling: "medium" },
  },
  {
    bench: { weight: 103.5, reps: 7, feeling: "medium" },
    squat: { weight: 143.5, reps: 8, feeling: "medium" },
    deadlift: { weight: 161, reps: 6, feeling: "medium" },
  },

  // Week 2
  {
    bench: { weight: 104.5, reps: 8, feeling: "easy" },
    squat: { weight: 145, reps: 9, feeling: "medium" },
    deadlift: { weight: 163.5, reps: 5, feeling: "hard" },
  },
  {
    bench: { weight: 107, reps: 6, feeling: "hard" },
    squat: { weight: 145, reps: 7, feeling: "hard" },
    deadlift: { weight: 163.5, reps: 4, feeling: "hard" },
  },
  {
    bench: { weight: 107, reps: 8, feeling: "easy" },
    squat: { weight: 147.5, reps: 8, feeling: "easy" },
    deadlift: { weight: 165, reps: 5, feeling: "medium" },
  },

  // Week 3
  {
    bench: { weight: 109.5, reps: 7, feeling: "medium" },
    squat: { weight: 149, reps: 9, feeling: "easy" },
    deadlift: { weight: 166, reps: 6, feeling: "medium" },
  },
  {
    bench: { weight: 110.5, reps: 8, feeling: "easy" },
    squat: { weight: 151.5, reps: 8, feeling: "medium" },
    deadlift: { weight: 168.5, reps: 5, feeling: "hard" },
  },
  {
    bench: { weight: 113, reps: 6, feeling: "hard" },
    squat: { weight: 151.5, reps: 7, feeling: "medium" },
    deadlift: { weight: 168.5, reps: 5, feeling: "medium" },
  },

  // Week 4
  {
    bench: { weight: 113, reps: 9, feeling: "easy" },
    squat: { weight: 154, reps: 8, feeling: "easy" },
    deadlift: { weight: 170, reps: 6, feeling: "easy" },
  },
  {
    bench: { weight: 115.5, reps: 7, feeling: "medium" },
    squat: { weight: 156.5, reps: 9, feeling: "easy" },
    deadlift: { weight: 172.5, reps: 5, feeling: "medium" },
  },
  {
    bench: { weight: 116.5, reps: 8, feeling: "medium" },
    squat: { weight: 158, reps: 8, feeling: "medium" },
    deadlift: { weight: 173.5, reps: 5, feeling: "hard" },
  },

  // Week 5
  {
    bench: { weight: 118, reps: 8, feeling: "easy" },
    squat: { weight: 160.5, reps: 8, feeling: "easy" },
    deadlift: { weight: 173.5, reps: 6, feeling: "medium" },
  },
  {
    bench: { weight: 120.5, reps: 7, feeling: "hard" },
    squat: { weight: 160.5, reps: 7, feeling: "medium" },
    deadlift: { weight: 175, reps: 5, feeling: "medium" },
  },
  {
    bench: { weight: 120.5, reps: 9, feeling: "easy" },
    squat: { weight: 163, reps: 9, feeling: "easy" },
    deadlift: { weight: 177.5, reps: 5, feeling: "easy" },
  },
];

function getMinMax(data) {
  const max = Math.max(...data);
  const min = Math.min(...data);

  return { min, max };
}

function getWeightAndRepsData(trainingData, label) {
  return trainingData.reduce(
    (acc, curr) => {
      acc.weight.push(curr[label].weight);
      acc.reps.push(curr[label].reps);
      return acc;
    },
    { weight: [], reps: [] },
  );
}

const benchData = getWeightAndRepsData(trainingData, "bench");
const { min: benchMinWeight, max: benchMaxWeight } = getMinMax(
  benchData.weight,
);
const { min: benchMinReps, max: benchMaxReps } = getMinMax(benchData.reps);

const squatData = getWeightAndRepsData(trainingData, "squat");
const { min: squatMinWeight, max: squatMaxWeight } = getMinMax(
  squatData.weight,
);
const { min: squatMinReps, max: squatMaxReps } = getMinMax(squatData.reps);

const deadliftData = getWeightAndRepsData(trainingData, "deadlift");
const { min: deadliftMinWeight, max: deadliftMaxWeight } = getMinMax(
  deadliftData.weight,
);
const { min: deadliftMinReps, max: deadliftMaxReps } = getMinMax(
  deadliftData.reps,
);

function normalizeNumber({ min, max, input }) {
  return Number(((input - min) / (max - min)).toFixed(2));
}

function denormalizeNumber({ min, max, input }) {
  return Math.round((input * (max - min) + min) * 10) / 10;
}

function normalizeFeeling(feeling) {
  const easy = "easy";
  const medium = "medium";
  const hard = "hard";
  return [
    Number(feeling === easy),
    Number(feeling === medium),
    Number(feeling === hard),
  ];
}

function normalizeInputData(data) {
  const inputX = data.map(({ bench, squat, deadlift }) => {
    const benchFeeling = bench.feeling;
    const squatFeeling = squat.feeling;
    const deadliftFeeling = deadlift.feeling;

    const normalizedBenchData = [
      normalizeNumber({
        min: benchMinWeight,
        max: benchMaxWeight,
        input: bench.weight,
      }),
      normalizeNumber({
        min: benchMinReps,
        max: benchMaxReps,
        input: bench.reps,
      }),
      ...normalizeFeeling(bench.feeling),
    ];

    const normalizedSquatData = [
      normalizeNumber({
        min: squatMinWeight,
        max: squatMaxWeight,
        input: squat.weight,
      }),
      normalizeNumber({
        min: squatMinReps,
        max: squatMaxReps,
        input: squat.reps,
      }),
      ...normalizeFeeling(squat.feeling),
    ];

    const normalizedDeadliftData = [
      normalizeNumber({
        min: deadliftMinWeight,
        max: deadliftMaxWeight,
        input: deadlift.weight,
      }),
      normalizeNumber({
        min: deadliftMinReps,
        max: deadliftMaxReps,
        input: deadlift.reps,
      }),
      ...normalizeFeeling(deadlift.feeling),
    ];

    return [
      ...normalizedBenchData,
      ...normalizedSquatData,
      ...normalizedDeadliftData,
    ];
  });

  return inputX;
}

function normalizeOutputData(data) {
  const outputY = data.map(({ bench, squat, deadlift }) => {
    const normalizedBenchData = [
      normalizeNumber({
        min: benchMinWeight,
        max: benchMaxWeight,
        input: bench.weight,
      }),
      normalizeNumber({
        min: benchMinReps,
        max: benchMaxReps,
        input: bench.reps,
      }),
    ];

    const normalizedSquatData = [
      normalizeNumber({
        min: squatMinWeight,
        max: squatMaxWeight,
        input: squat.weight,
      }),
      normalizeNumber({
        min: squatMinReps,
        max: squatMaxReps,
        input: squat.reps,
      }),
    ];

    const normalizedDeadliftData = [
      normalizeNumber({
        min: deadliftMinWeight,
        max: deadliftMaxWeight,
        input: deadlift.weight,
      }),
      normalizeNumber({
        min: deadliftMinReps,
        max: deadliftMaxReps,
        input: deadlift.reps,
      }),
    ];

    return [
      ...normalizedBenchData,
      ...normalizedSquatData,
      ...normalizedDeadliftData,
    ];
  });

  return outputY;
}

function buildTensorExercises(inputData, outputData) {
  return {
    inputXTesor: tf.tensor2d(inputData.slice(0, 14)),
    outputYTensor: tf.tensor2d(outputData.slice(1, 15)),
  };
}

const inputData = normalizeInputData(trainingData);
const outputData = normalizeOutputData(trainingData);

const { inputXTesor, outputYTensor } = buildTensorExercises(
  inputData,
  outputData,
);

async function trainModel(inputX, outputY) {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({ inputShape: [15], units: 80, activation: "relu" }),
  );
  model.add(tf.layers.dense({ units: 6 }));
  model.compile({
    optimizer: "adam",
    loss: "meanSquaredError",
    metrics: ["mae"],
  });

  await model.fit(inputX, outputY, {
    verbose: 0,
    epochs: 500,
    shuffle: true,
    // Uncoment to checkout losses :)
    // callbacks: {
    //   onEpochEnd: (epoch, log) =>
    //     console.log(`Epoch: ${epoch}: loss = ${log.loss}`),
    // },
  });

  return model;
}

const model = await trainModel(inputXTesor, outputYTensor);

const currentTrain = [
  {
    bench: { weight: 120.5, reps: 9, feeling: "hard" },
    squat: { weight: 163, reps: 9, feeling: "hard" },
    deadlift: { weight: 177.5, reps: 5, feeling: "easy" },
  },
];

const predictTensor = tf.tensor2d(normalizeInputData(currentTrain));

const pred = model.predict(predictTensor);

const predArray = await pred.data();
const predValues = Array.from(predArray);

// Extract the predictions
const [
  benchWeightNorm,
  benchRepsNorm,
  squatWeightNorm,
  squatRepsNorm,
  deadliftWeightNorm,
  deadliftRepsNorm,
] = predValues;

const predictedBenchWeight = denormalizeNumber({
  min: benchMinWeight,
  max: benchMaxWeight,
  input: benchWeightNorm,
});
const predictedBenchReps = Math.round(
  denormalizeNumber({
    min: benchMinReps,
    max: benchMaxReps,
    input: benchRepsNorm,
  }),
);

const predictedSquatWeight = denormalizeNumber({
  min: squatMinWeight,
  max: squatMaxWeight,
  input: squatWeightNorm,
});
const predictedSquatReps = Math.round(
  denormalizeNumber({
    min: squatMinReps,
    max: squatMaxReps,
    input: squatRepsNorm,
  }),
);

const predictedDeadliftWeight = denormalizeNumber({
  min: deadliftMinWeight,
  max: deadliftMaxWeight,
  input: deadliftWeightNorm,
});
const predictedDeadliftReps = Math.round(
  denormalizeNumber({
    min: deadliftMinReps,
    max: deadliftMaxReps,
    input: deadliftRepsNorm,
  }),
);

console.log({
  bench: { weight: predictedBenchWeight, reps: predictedBenchReps },
  squat: { weight: predictedSquatWeight, reps: predictedSquatReps },
  deadlift: { weight: predictedDeadliftWeight, reps: predictedDeadliftReps },
});
