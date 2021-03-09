export default class BCDialog extends Dialog {
  submit(button, close = false) {
    try {
      if (button.callback) {
        button.callback(this.options.jQuery ? this.element : this.element[0]);
        if (close) {
          $("#chat-message").focus();
          this.close();
        }
      }
    } catch (err) {
      ui.notifications.error(err);
      throw new Error(err);
    }
  }

  _onKeyDown(event) {
    // Close dialog
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      return this.close();
    }
    // Confirm default choice
    if (event.key === "Enter" && this.data.default) {
      event.preventDefault();
      event.stopPropagation();
      const defaultChoice = this.data.buttons[this.data.default];
      return this.submit(defaultChoice, event.shiftKey);
    }
  }
}
