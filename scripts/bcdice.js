import BCDiceDialog from "./bcdice-dialog.js"

let roller;
const audio = new Audio('/sounds/dice.wav');
audio.volume = 0.25;

Hooks.once('ready', async function () {
    await setupRoller();

    $("#controls").append('<li id="bc-dice-control" title="BC Dice"><i class="fas fa-dice"></i></li>');
    $("#bc-dice-control").click(() => {
        showRoller();
    });

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'B') showRoller();
    });
});

// Hooks.on()

function showRoller() {
    roller.render(true);
}

async function getSysHelp(system) {
    let data;
    try {
        const res = await fetch(`https://bcdice.trpg.net/v2/game_system/${system}`);
        if (!res.ok) throw "Failed to get system help"
        data = await res.json();
    } catch (err) {
        console.log(err);
    }

    const helpArray = data.help_message.trim().split('\n');

    let helpMessage = helpArray
        .map(el => `<p>${el}</p>`)
        .join('\n');
    
    const helpDialog = Dialog.prompt({
        title: `${system}`,
        content: `${helpMessage}`,
        callback: () => { }
    })
}

async function setupRoller() {
    let data;
    try {
        const res = await fetch("https://bcdice.trpg.net/v2/game_system");
        if (!res.ok) throw "Failed to get game systems"
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
                                <i id="bc-system-help" class="fas fa-question-circle"></i>
                            </p>
                            <p>
                                <label for="bc-formula">Enter formula:</label>
                                <input id="bc-formula" type="text" name="BCDice Formula">
                            </p>
                        </form>`;

    roller = new BCDiceDialog({
        title: "BCDice Roller",
        content: formData,
        buttons: {
            roll: {
                label: "Roll",
                callback: async () => {
                    const system = $("#bc-systems option:selected").val();
                    const command = $("#bc-formula").val();

                    try {
                        const res = await fetch(`https://bcdice.trpg.net/v2/game_system/${system}/roll?command=${command}`);
                        if (!res.ok) {
                            ChatMessage.create({
                                content: `<p>Invalid Formula. Please try again.</p>
                                            <p>Command: ${command}</p>`,
                                speaker: {
                                    alias: "BCRoller"
                                }
                            });
                            throw 'Server Responded with Invalid Formula';
                        }
                        const data = await res.json();

                        ChatMessage.create({
                            content: `<p>${data.text}</p>
                                        <p>Command: ${command}</p>`,
                            speaker: {
                                alias: "BCRoller"
                            }
                        });

                        audio.play();
                    } catch (err) {
                        console.log(err);
                    }

                    game.users.get(game.userId).setFlag('fvtt-bcdice', 'sys-id', `${system}`);
                }
            }
        },
        default: "roll",
        render: () => {
            $("#bc-system-help").click(() => {
                getSysHelp($("#bc-systems option:selected").val());
            })
            $("#bc-systems").val(game.users.get(game.userId).getFlag('fvtt-bcdice', 'sys-id'));
            $("#bc-formula").focus();
        }
    });

    game.users.get(game.userId).setFlag('fvtt-bcdice', 'sys-id', data.game_system[0].id);
}