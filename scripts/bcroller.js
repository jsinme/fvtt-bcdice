import BCDiceDialog from "./bcdice-dialog.js";
import { parseBCtoDSN } from "./dsn-utilities.js";

var shiftCharCode = Δ => c => String.fromCharCode(c.charCodeAt(0) + Δ);
var toHalfWidth = str => str.replace(/[！-～]/g, shiftCharCode(-0xfee0)).replace(/　/g, " ");

function showRoller(roller) {
  roller.render(true);
}

async function getSysHelp(system) {
  const aliasText = game.i18n.localize("fvtt-bcdice.alias");

  let data;
  try {
    const res = await fetch(`https://bcdice.trpg.net/v2/game_system/${system.val()}`);
    if (!res.ok) throw "Failed to get system help";
    data = await res.json();
  } catch (err) {
    console.log(err);
    return;
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

  ChatMessage.create({
    content: `<p><em>${system.text()}</em></p>
              <p>${helpMessage}</p>`,
    speaker: {
      alias: aliasText
    }
  });
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
                            <select id="bc-systems" class="s2">${systems.join("")}</select>
                            <i id="bc-system-help" class="fas fa-question-circle"></i>
                        </p>
                        <p>
                            <label for="bc-formula">${enterFormulaText}:</label>
                            <input id="bc-formula" type="text">
                        </p>
                    </form>`;

  const roller = new BCDiceDialog({
    title: "BCDice Roller",
    content: formData,
    buttons: {
      roll: {
        label: rollButtonText,
        callback: async () => {
          const user = game.users.get(game.userId);
          const system = $("#bc-systems option:selected");
          const command = toHalfWidth($("#bc-formula").val());

          const url = new URL(`https://bcdice.trpg.net/v2/game_system/${system.val()}/roll`);
          const params = url.searchParams;
          params.append("command", command);

          const userMessageOptions = {
            content: `<p><em>${system.text()}:</em> ${command}</p>`
          };
          const secret = command.charAt(0).toLowerCase() === "s";
          if (secret) {
            userMessageOptions.type = 1;
            userMessageOptions.whisper = [user.id];
          }

          ChatMessage.create(userMessageOptions);

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

            const message = ` <div>
                                <p>
                                  <em>${system.text()}:</em>
                                </p>
                                <div>
                                  ${results}
                                </div>
                              </div>`;

            const messageOptions = {
              content: message,
              speaker: {
                alias: aliasText
              }
            };
            if (data.secret) {
              messageOptions.type = 1;
              messageOptions.whisper = [user.id];
            }

            if (game.dice3d?.isEnabled()) {
              const rolls = parseBCtoDSN(data.rands);
              if (!rolls.throws[0].dice.length) messageOptions.sound = "sounds/dice.wav";
              await game.dice3d.show(rolls, game.user, !data.secret).then(displayed => {});
            } else {
              messageOptions.sound = "sounds/dice.wav";
            }

            ChatMessage.create(messageOptions);
          } catch (err) {
            console.log(err);
          }
        }
      }
    },
    default: "roll",
    render: () => {
      $("#bc-system-help").click(() => {
        getSysHelp($("#bc-systems option:selected"));
      });
      $("#bc-systems").val(game.users.get(game.userId).getFlag("fvtt-bcdice", "sys-id"));
      $("#bc-formula").focus();
      $(".s2").select2();
      $(".s2").on("select2:select", e => {
        game.users.get(game.userId).setFlag("fvtt-bcdice", "sys-id", `${e.params.data.id}`);
      });
    }
  });

  if (game.users.get(game.userId).getFlag("fvtt-bcdice", "sys-id") === undefined) {
    game.users.get(game.userId).setFlag("fvtt-bcdice", "sys-id", data.game_system[0].id);
  }

  return roller;
}

export { showRoller, getSysHelp, setupRoller };
