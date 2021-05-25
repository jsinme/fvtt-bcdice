import { getHelpText } from "./remote-api.js";
import BCDiceDialog from "./bcdice-dialog.js";

function showRoller(roller) {
  roller.render(true);
}

async function getSysHelp(system) {
  const aliasText = game.i18n.localize("fvtt-bcdice.alias");
  const data = await getHelpText(system.val());

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
      alias: aliasText,
    },
  });
}

async function setupRoller() {
  await loadTemplates(
    ["dialog", "import", "macro", "replacements"].map(
      (s) => `modules/fvtt-bcdice/templates/${s}.html`
    )
  );

  const roller = new BCDiceDialog({ title: "BCDice Roller" });
  Hooks.on("canvasReady", () => roller.render());
  Hooks.on("controlToken", () => roller.render());
  return roller;
}

export { showRoller, getSysHelp, setupRoller };
