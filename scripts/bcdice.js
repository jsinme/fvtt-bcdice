import { showRoller, getSysHelp, setupRoller } from "./bcroller.js";

let roller;

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
