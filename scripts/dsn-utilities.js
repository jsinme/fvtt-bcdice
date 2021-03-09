function parseBCtoDSN(rands) {
  const validDice = [2, 4, 6, 8, 10, 12, 20, 100];

  const rolls = rands.reduce(
    (acc, el) => {
      if (!validDice.includes(el.sides)) {
        return acc;
      }

      if (el.sides === 100) {
        const tens = Math.floor(el.value / 10);
        const ones = el.value % 10;

        acc = appendDSNRoll(acc, tens, 100);
        return appendDSNRoll(acc, ones, 10);
      }

      return appendDSNRoll(acc, el.value, el.sides);
    },
    {
      throws: [{ dice: [] }]
    }
  );

  return rolls;
}

function appendDSNRoll(acc, value, sides) {
  acc.throws[0].dice.push({
    result: value,
    resultLabel: value,
    type: `d${sides}`,
    vectors: [],
    options: {}
  });
  return acc;
}

export { parseBCtoDSN, appendDSNRoll };
