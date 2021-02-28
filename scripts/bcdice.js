import PersistentDialog from "./persistent-dialog.js"

Hooks.once('ready', async function () {
    $("#controls").append('<li id="bc-dice-control" title="BC Dice"><i class="fas fa-dice"></i></li>')
    $("#bc-dice-control").click(() => {
        showDialog();
    });
});

function showDialog() {
    $.get("https://bcdice.onlinesession.app/v2/game_system", (data, status) => {
        const systems = data.game_system.map(el => {
            return `<option value="${el.id}">${el.name}</option>`;
        });
        const formData = `  <form id="bc-form">
                                <p>
                                    <label for="bc-systems">Choose a system:</label>
                                    <select id="bc-systems" name="Systems">${systems.join("")}</select>
                                </p>
                                <p>
                                    <label for="bc-formula">Enter formula:</label>
                                    <input id="bc-formula" type="text" name="BCDice Formula">
                                </p>
                            </form>`;
        const d = new PersistentDialog({
            title: "BCDice Roller",
            content: formData,
            buttons: {
                roll: {
                    label: "Roll",
                    callback: () => {
                        const system = $("#bc-systems option:selected").val();
                        const command = $("#bc-formula").val();
                        fetch(`https://bcdice.onlinesession.app/v2/game_system/${system}/roll?command=${command}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error();
                                }
                                return response.json();
                            })
                            .then(data => {
                                ChatMessage.create({ content: data.text });
                            })
                            .catch(err => {
                                console.log(err);
                                ChatMessage.create({ content: "Invalid Formula. Please try again." });
                            });
                    }
                },
                cancel: {
                    label: "Cancel",
                    callback: () => { d.close() }
                }
            },
            default: "roll"
        });
        d.render(true);
    });
}