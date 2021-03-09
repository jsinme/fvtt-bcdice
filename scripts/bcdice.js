import BCDiceDialog from "./bcdice-dialog.js";

let roller;

Hooks.once("ready", async function () {
  await setupRoller();

  $("#controls").append('<li id="bc-dice-control" title="BC Dice"><i class="fas fa-dice"></i></li>');
  $("#bc-dice-control").click(() => {
    showRoller();
  });

  document.addEventListener("keydown", event => {
    if (event.ctrlKey && event.shiftKey && event.key === "B") showRoller();
  });
});

function showRoller() {
  roller.render(true);
}

async function getSysHelp(system) {
  let data;
  try {
    const res = await fetch(`https://bcdice.trpg.net/v2/game_system/${system}`);
    if (!res.ok) throw "Failed to get system help";
    data = await res.json();
  } catch (err) {
    console.log(err);
  }

  const helpMessage = data.help_message
    .trim()
    .split("\n")
    .reduce(
      (acc, el) => {
        acc.push(`<p>${el}</p>`);
        return acc;
      },
      ['<p><a href="https://docs.bcdice.org/">https://docs.bcdice.org/</a></p>']
    )
    .join("\n");

  const helpDialog = Dialog.prompt({
    title: `${system}`,
    content: `${helpMessage}`,
    callback: () => {}
  });
}

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

async function setupRoller() {
  const rollButtonText = game.i18n.localize("fvtt-bcdice.rollButton");
  const chooseSystemText = game.i18n.localize("fvtt-bcdice.chooseSystem");
  const enterFormulaText = game.i18n.localize("fvtt-bcdice.enterFormula");
  const invalidFormulaText = game.i18n.localize("fvtt-bcdice.invalidFormula");
  const aliasText = game.i18n.localize("fvtt-bcdice.alias");

  let data;
  try {
    const res = await fetch("https://bcdice.trpg.net/v2/game_system");
    if (!res.ok) throw "Failed to get game systems";
    data = await res.json();
  } catch (err) {
    console.log(err);
  }

  const systems = data.game_system.map(el => {
    return `<option value="${el.id}">${el.name}</option>`;
  });

  const formData = `<form id="bc-form">
                        <p>
                            <label for="bc-systems">${chooseSystemText}:</label>
                            <select id="bc-systems">${systems.join("")}</select>
                            <i id="bc-system-help" class="fas fa-question-circle"></i>
                        </p>
                        <p>
                            <label for="bc-formula">${enterFormulaText}:</label>
                            <input id="bc-formula" type="text">
                        </p>
                    </form>`;

  roller = new BCDiceDialog({
    title: "BCDice Roller",
    content: formData,
    buttons: {
      roll: {
        label: rollButtonText,
        callback: async () => {
          const user = game.users.get(game.userId);
          const system = $("#bc-systems option:selected");
          const command = $("#bc-formula").val();

          const url = new URL(`https://bcdice.trpg.net/v2/game_system/${system.val()}/roll`);
          const params = url.searchParams;
          params.append("command", command);

          try {
            const res = await fetch(url);
            if (!res.ok) {
              ChatMessage.create({
                content: `<p>${invalidFormulaText}</p>
                            <p>${user.name}: ${command}</p>`,
                speaker: {
                  alias: aliasText
                }
              });
              throw "Server Responded with Invalid Formula";
            }
            const data = await res.json();

            const results = data.text
              .split("\n")
              .map(el => `<p>${el}</p>`)
              .join("")
              .replace(/,/g, ",\u200B");

            const message = `   <div>
                                    <p>
                                        <em>${user.name}:</em>
                                    </p>
                                    <div>
                                        ${command}
                                    </div>
                                </div>
                                <div>
                                    <p>
                                        <em>${system.text()}:</em>
                                    </p>
                                    <div>
                                        ${results}
                                    </div>
                                </div>`;

            if (game.settings.get("dice-so-nice", "enabled")) {
              const rolls = parseBCtoDSN(data.rands);

              game.dice3d.show(rolls, game.user, true).then(displayed => {
                const messageOptions = {
                  content: message,
                  speaker: {
                    alias: aliasText
                  }
                };
                if (!rolls.throws[0].dice.length) messageOptions.sound = "sounds/dice.wav";
                ChatMessage.create(messageOptions);
              });
            }
          } catch (err) {
            console.log(err);
          }

          user.setFlag("fvtt-bcdice", "sys-id", `${system.val()}`);
        }
      }
    },
    default: "roll",
    render: () => {
      $("#bc-system-help").click(() => {
        getSysHelp($("#bc-systems option:selected").val());
      });
      $("#bc-systems").val(game.users.get(game.userId).getFlag("fvtt-bcdice", "sys-id"));
      $("#bc-formula").focus();
    }
  });

  game.users.get(game.userId).setFlag("fvtt-bcdice", "sys-id", data.game_system[0].id);
}
