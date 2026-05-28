export const Normalizer = {
  numbers: (min, max, input) => {
    return Number(((input - min) / (max - min)).toFixed(2));
  },
};
