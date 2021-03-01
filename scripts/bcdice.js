import BCDiceDialog from "./bcdice-dialog.js"

let d;

Hooks.once('ready', async function () {
    await setupRoller();

    $("#controls").append('<li id="bc-dice-control" title="BC Dice"><i class="fas fa-dice"></i></li>')
    $("#bc-dice-control").click(() => {
        showRoller();
    });

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'B') showRoller();
    });
});

function showRoller() {
    Hooks.once('renderApplication', async function () {
        $("#bc-formula").focus();
    });
    d.render(true);
}

async function setupRoller() {
    let data;
    try {
        const res = await fetch("https://bcdice.trpg.net/v2/game_system");
        data = await res.json();
    } catch (err) {
        console.log(err)
    }

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

    d = new BCDiceDialog({
        title: "BCDice Roller",
        content: formData,
        buttons: {
            roll: {
                label: "Roll",
                callback: () => {
                    const system = $("#bc-systems option:selected").val();
                    const command = $("#bc-formula").val();
                    fetch(`https://bcdice.trpg.net/v2/game_system/${system}/roll?command=${command}`)
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
}