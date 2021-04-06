import BCDiceDialog from "./bcdice-dialog.js";
import { parseBCtoDSN } from "./dsn-utilities.js";
import { APIError } from "./errors.js";
import { getHelpText, getRoll, getSystems } from "./remote-api.js";

var shiftCharCode = Δ => c => String.fromCharCode(c.charCodeAt(0) + Δ);
var toHalfWidth = str => str.replace(/[！-～]/g, shiftCharCode(-0xfee0)).replace(/　/g, " ");

function showRoller(roller) {
  roller.render(true);
}

async function getSysHelp(system) {
  const aliasText = game.i18n.localize("fvtt-bcdice.alias");
  const data = await getHelpText(system.val())

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

  const systems = await getSystems();

  const formData = await renderTemplate('modules/fvtt-bcdice/templates/dialog.html', {
    chooseSystemText, enterFormulaText, systems
  })

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
            const data = await getRoll(system.val(), command);

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
            if (err instanceof APIError) {
              ChatMessage.create({
                content: `<p>${invalidFormulaText}</p>
                          <p>${user.name}: ${command}</p>`,
                speaker: {
                  alias: aliasText
                }
              });
            }
            console.log(err);
          }
        }
      }
    },
    default: "roll",
    render: () => {
      const system = game.users.get(game.userId).getFlag("fvtt-bcdice", "sys-id") ?? game.settings.get("fvtt-bcdice", "game-system");
      $("#bc-system-help").click(() => {
        getSysHelp($("#bc-systems option:selected"));
      });
      $("#bc-systems").val(system);
      $("#bc-formula").focus();
      $(".s2").select2();
      $(".s2").on("select2:select", e => {
        game.users.get(game.userId).setFlag("fvtt-bcdice", "sys-id", `${e.params.data.id}`);
      });
    }
  });

  return roller;
}

export { showRoller, getSysHelp, setupRoller };
