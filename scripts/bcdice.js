import { showRoller, setupRoller } from "./bcroller.js";
import { getSystems } from "./remote-api.js";

let roller;

Hooks.once("init", async () => {
  registerSettings();

  const select2Style = document.createElement("link");
  const select2Script = document.createElement("script");

  select2Style.setAttribute("href", "https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css");
  select2Style.setAttribute("rel", "stylesheet");

  select2Script.setAttribute("src", "https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js");

  document.head.appendChild(select2Style);
  document.head.appendChild(select2Script);

  roller = await setupRoller();
  registerKeybinds();
});

Hooks.on("renderSceneControls", async function () {
  if (!$("#bc-dice-control").length) {
    $("#controls > .main-controls").append('<li class="scene-control" id="bc-dice-control" title="BC Dice"><i class="fas fa-dice"></i></li>');
    $("#bc-dice-control").click(() => {
      showRoller(roller);
    });
  }
});

async function registerKeybinds() {
  game.keybindings.register("fvtt-bcdice", 'open', {
    name: game.i18n.localize("fvtt-bcdice.keybindName"),
    hint: game.i18n.localize("fvtt-bcdice.keybindHint"),
    editable: [
      {
        key: 'KeyB',
        modifiers: ["Control", "Shift"],
      },
    ],
    onDown: () => {
      showRoller(roller)
    },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });
}

async function registerSettings() {

  game.settings.register("fvtt-bcdice", "roller-persistance", {
    name: game.i18n.localize("fvtt-bcdice.persistanceSettingName"),
    hint: game.i18n.localize("fvtt-bcdice.persistanceSettingHint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("fvtt-bcdice", "formula-persistance", {
    name: game.i18n.localize("fvtt-bcdice.formulaPersistanceSettingName"),
    hint: game.i18n.localize("fvtt-bcdice.formulaPersistanceSettingHint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("fvtt-bcdice", "bc-server", {
    name: game.i18n.localize("fvtt-bcdice.serverSettingName"),
    hint: game.i18n.localize("fvtt-bcdice.serverSettingHint"),
    scope: "world",
    config: true,
    type: String,
    default: "https://bcdice.trpg.net/v2"
  });

  const data = await getSystems()

  const systems = data.reduce((acc, el) => {
    acc[el.id] = el.name;
    return acc;
  }, {});

  game.settings.register("fvtt-bcdice", "game-system", {
    name: game.i18n.localize("fvtt-bcdice.systemSettingName"),
    hint: game.i18n.localize("fvtt-bcdice.systemSettingHint"),
    scope: "world",
    config: true,
    type: String,
    choices: systems,
    default: data[0].id
  });
}
