import { showRoller, getSysHelp, setupRoller } from "./bcroller.js";

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
})

Hooks.once("ready", async function () {
  roller = await setupRoller();

  $("#controls").append('<li id="bc-dice-control" title="BC Dice"><i class="fas fa-dice"></i></li>');
  $("#bc-dice-control").click(() => {
    showRoller(roller);
  });

  document.addEventListener("keydown", event => {
    if (event.ctrlKey && event.shiftKey && event.key === "B") showRoller(roller);
  });
});

function registerSettings() {
  game.settings.register("fvtt-bcdice", "roller-persistance", {
    name: "Roller Persistance",
    hint: "Should the roller stay open after submitting a roll?",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });
}