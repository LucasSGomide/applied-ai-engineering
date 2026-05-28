import tf from "@tensorflow/tfjs-node";

const emails = [
  // SPAM - Short, urgent, new accounts, suspicious links
  {
    words: 30,
    exclamationMarks: 5,
    suspiciousLinks: 3,
    accountAgeInMonths: 0.5,
    label: "SPAM",
  },
  {
    words: 45,
    exclamationMarks: 6,
    suspiciousLinks: 2,
    accountAgeInMonths: 1,
    label: "SPAM",
  },
  {
    words: 25,
    exclamationMarks: 7,
    suspiciousLinks: 4,
    accountAgeInMonths: 2,
    label: "SPAM",
  },
  {
    words: 35,
    exclamationMarks: 8,
    suspiciousLinks: 3,
    accountAgeInMonths: 1,
    label: "SPAM",
  },
  {
    words: 40,
    exclamationMarks: 4,
    suspiciousLinks: 3,
    accountAgeInMonths: 0.25,
    label: "SPAM",
  },

  // LEGITIMATE - Longer, professional, older accounts, no suspicious links
  {
    words: 250,
    exclamationMarks: 0,
    suspiciousLinks: 0,
    accountAgeInMonths: 24,
    label: "LEGITIMATE",
  },
  {
    words: 180,
    exclamationMarks: 1,
    suspiciousLinks: 0,
    accountAgeInMonths: 18,
    label: "LEGITIMATE",
  },
  {
    words: 320,
    exclamationMarks: 0,
    suspiciousLinks: 0,
    accountAgeInMonths: 36,
    label: "LEGITIMATE",
  },
  {
    words: 200,
    exclamationMarks: 1,
    suspiciousLinks: 0,
    accountAgeInMonths: 12,
    label: "LEGITIMATE",
  },
  {
    words: 280,
    exclamationMarks: 0,
    suspiciousLinks: 0,
    accountAgeInMonths: 48,
    label: "LEGITIMATE",
  },
];

const words = emails.map((email) => email.words);
const minWords = Math.min(...words);
const maxWords = Math.max(...words);

const exclamationMarks = emails.map((email) => email.exclamationMarks);
const minExclamationMarks = Math.min(...exclamationMarks);
const maxExclamationMarks = Math.max(...exclamationMarks);

const suspiciousLinks = emails.map((email) => email.suspiciousLinks);
const minSuspiciousLinks = Math.min(...suspiciousLinks);
const maxSuspiciousLinks = Math.max(...suspiciousLinks);

const accountAgeInMonths = emails.map((email) => email.accountAgeInMonths);
const minAccountAgeInMonths = Math.min(...accountAgeInMonths);
const maxAccountAgeInMonths = Math.max(...accountAgeInMonths);

function normalizeNumbers({ min, max, input }) {
  return Number(((input - min) / (max - min)).toFixed(2));
}

// Template
// [ [ "words", "exclamation_marks", "suspicious_links", "account_age" ] ];
function buildTensorEmails(emails) {
  const normalizedEmails = emails.map(
    ({ words, exclamationMarks, suspiciousLinks, accountAgeInMonths }) => {
      return [
        normalizeNumbers({ min: minWords, max: maxWords, input: words }),
        normalizeNumbers({
          min: minExclamationMarks,
          max: maxExclamationMarks,
          input: exclamationMarks,
        }),
        normalizeNumbers({
          min: minSuspiciousLinks,
          max: maxSuspiciousLinks,
          input: suspiciousLinks,
        }),
        normalizeNumbers({
          min: minAccountAgeInMonths,
          max: maxAccountAgeInMonths,
          input: accountAgeInMonths,
        }),
      ];
    },
  );

  return tf.tensor2d(normalizedEmails);
}

function buildTensorLabels(emails) {
  const legitimate = "LEGITIMATE";
  const spam = "SPAM";

  const tensorLabels = emails.map(({ label }) => {
    return label === legitimate ? [1, 0] : [0, 1];
  });

  return tf.tensor2d(tensorLabels);
}

async function trainModel(inputXs, outputYs) {
  const model = tf.sequential();

  // Input layer
  model.add(
    tf.layers.dense({ inputShape: [4], units: 150, activation: "relu" }),
  );
  model.add(tf.layers.dense({ units: 2, activation: "softmax" }));

  model.compile({
    optimizer: "adam",
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  await model.fit(inputXs, outputYs, {
    verbose: 0,
    epochs: 200,
    shuffle: true,
    // Uncoment to checkout losses :)
    // callbacks: {
    //   onEpochEnd: (epoch, log) =>
    //     console.log(`Epoch: ${epoch}: loss = ${log.loss}`),
    // },
  });

  return model;
}

const model = await trainModel(
  buildTensorEmails(emails),
  buildTensorLabels(emails),
);

async function predict(model, email) {
  const pred = model.predict(email);
  const predArray = await pred.array();
  const prediction = predArray[0].map((prob, index) => ({
    prob: Number(prob).toFixed(2),
    index: index === 0 ? "Legitimate" : "Spam",
  }));

  console.log(prediction);
}

const testEmail = [
  {
    words: 30,
    exclamationMarks: 13,
    suspiciousLinks: 1,
    accountAgeInMonths: 300,
  },
];

await predict(model, buildTensorEmails(testEmail));
