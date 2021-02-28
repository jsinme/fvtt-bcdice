export default class PersistentDialog extends Dialog {
    submit(button) {
        try {
            if (button.callback) button.callback(this.options.jQuery ? this.element : this.element[0]);
        } catch (err) {
            ui.notifications.error(err);
            throw new Error(err);
        }
    }
}