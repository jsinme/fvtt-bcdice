import { showRoller, setupRoller } from "./bcroller.js";

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
});

Hooks.once("ready", async () => {
  roller = await setupRoller();
  document.addEventListener("keydown", event => {
    if (event.ctrlKey && event.shiftKey && event.key === "B") showRoller(roller);
  });
});

Hooks.on("renderSceneControls", async function () {
  if (!$("#bc-dice-control").length) {
    $("#controls").append('<li class="scene-control" id="bc-dice-control" title="BC Dice"><i class="fas fa-dice"></i></li>');
    $("#bc-dice-control").click(() => {
      showRoller(roller);
    });
  }
});

async function registerSettings() {
  const persistanceSettingName = game.i18n.localize("fvtt-bcdice.persistanceSettingName");
  const persistanceSettingHint = game.i18n.localize("fvtt-bcdice.persistanceSettingHint");
  const serverSettingName = game.i18n.localize("fvtt-bcdice.serverSettingName");
  const serverSettingHint = game.i18n.localize("fvtt-bcdice.serverSettingHint");
  const systemSettingName = game.i18n.localize("fvtt-bcdice.systemSettingName");
  const systemSettingHint = game.i18n.localize("fvtt-bcdice.systemSettingHint");

  game.settings.register("fvtt-bcdice", "roller-persistance", {
    name: persistanceSettingName,
    hint: persistanceSettingHint,
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("fvtt-bcdice", "bc-server", {
    name: serverSettingName,
    hint: serverSettingHint,
    scope: "world",
    config: true,
    type: String,
    default: "https://bcdice.trpg.net/v2"
  });

  const bcServer = game.settings.get("fvtt-bcdice", "bc-server") ?? "https://bcdice.trpg.net/v2";
  let data;
  try {
    const res = await fetch(`${bcServer}/game_system`);
    if (!res.ok) throw "Failed to get game systems";
    data = await res.json();
  } catch (err) {
    console.log(err);
  }

  const systems = data.game_system.reduce((acc, el) => {
    acc[el.id] = el.name;
    return acc;
  }, {});

  game.settings.register("fvtt-bcdice", "game-system", {
    name: systemSettingName,
    hint: systemSettingHint,
    scope: "world",
    config: true,
    type: String,
    choices: systems,
    default: data.game_system[0].id
  });
}
