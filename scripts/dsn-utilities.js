import { APIError } from "./errors.js";
import { getRoll } from "./remote-api.js";

const shiftCharCode = (Δ) => (c) => String.fromCharCode(c.charCodeAt(0) + Δ);
const toHalfWidth = (str) =>
  str.replace(/[！-～]/g, shiftCharCode(-0xfee0)).replace(/　/g, " ");


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
      throws: [{ dice: [] }],
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
    options: {},
  });
  return acc;
}

async function roll(system, formula) {
  const aliasText = game.i18n.localize("fvtt-bcdice.alias");

  try {
    const data = await getRoll(system, toHalfWidth(formula));

    const results = data.text
      .split("\n")
      .map((el) => `<p>${el}</p>`)
      .join("")
      .replace(/,/g, ",\u200B");

    const message = ` <div>
                      <p>
                        <em>${system}:</em> ${formula}
                      </p>
                      <div>
                        ${results}
                      </div>
                    </div>`;

    const messageOptions = {
      content: message,
      speaker: {
        alias: aliasText,
      },
    };
    if (data.secret) {
      messageOptions.type = 1;
      messageOptions.whisper = [user.id];
    }

    if (game.dice3d?.isEnabled()) {
      const rolls = parseBCtoDSN(data.rands);
      if (!rolls.throws[0].dice.length)
        messageOptions.sound = "sounds/dice.wav";
      await game.dice3d
        .show(rolls, game.user, !data.secret)
        .then((displayed) => {});
    } else {
      messageOptions.sound = "sounds/dice.wav";
    }

    ChatMessage.create(messageOptions);
  } catch (err) {
    if (err instanceof APIError) {
      const invalidFormulaText = game.i18n.localize(
        "fvtt-bcdice.invalidFormula"
      );
      ChatMessage.create({
        content: `<p>${invalidFormulaText}</p>
                  <p>${game.user.name}: ${formula}</p>`,
        speaker: {
          alias: aliasText,
        },
      });
    }
    console.error(err);
  }
}

function getCurrentEntity() {
  if (
    canvas?.tokens?.controlled.length === 1 &&
    (game.user.isGM || canvas.tokens.controlled[0].actor.permission === 3)
  )
    return canvas.tokens.controlled[0];
  return game.user.character ?? game.user;
}

function getDataForCurrentEntity() {
  return duplicate(
    getCurrentEntity().getFlag("fvtt-bcdice", "macro-data") ?? {
      tabs: [],
      importSettings: {},
      replacements: "",
    }
  );
}

export { parseBCtoDSN, appendDSNRoll, roll, getCurrentEntity, getDataForCurrentEntity };
