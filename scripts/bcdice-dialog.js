import {
  getCurrentEntity,
  getDataForCurrentEntity,
  roll,
} from "./dsn-utilities.js";
import MacroParser from "./macro-parser.js";
import { getHelpText, getSystems } from "./remote-api.js";

const replacementRegex = /\{\s*([^\}]+)\s*\}/g;

export default class BCDialog extends FormApplication {
  constructor() {
    super({});
    this.dialog = null;
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      width: 400,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      scrollY: ["div.bcdice-macro-page"],
      title: "BCDice Roller",
      template: "modules/fvtt-bcdice/templates/dialog.html",
      tabs: [
        {
          navSelector: ".bcdice-tabs",
          contentSelector: ".bcdice-macro-page",
          initial: "macro-0",
        },
      ],
    };
  }
  _getHeaderButtons() {
    /** @type {Array} */
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label: game.i18n.localize("fvtt-bcdice.replacements"),
      class: "replacements",
      icon: "fas fa-superscript",
      onclick: () => this.openReplacements(),
    });
    buttons.unshift({
      label: game.i18n.localize("fvtt-bcdice.edit"),
      class: "edit",
      icon: "fas fa-cogs",
      onclick: () => {
        this.submit();
        this.options.isEditable = !this.options.isEditable;
        this.render();
      },
    });
    buttons.unshift({
      label: game.i18n.localize("fvtt-bcdice.import"),
      class: "import",
      icon: "fas fa-file-import",
      onclick: () => this.openImporter(),
    });
    return buttons;
  }

  async getData() {
    const macros = getDataForCurrentEntity();
    const entity = getCurrentEntity();
    return {
      editing: this.options.isEditable ?? false,
      systems: await getSystems(),
      data: macros,
      type: entity.constructor.name,
      entity: entity,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const system =
      game.users.get(game.userId).getFlag("fvtt-bcdice", "sys-id") ??
      game.settings.get("fvtt-bcdice", "game-system");
    html.find("#bc-system-help").click(this.getSysHelp.bind(this));
    html.find("#bc-systems").val(system);
    html.find("#bc-formula").focus();
    html.find(".s2").select2();
    html.find(".s2").on("select2:select", (e) => {
      game.users
        .get(game.userId)
        .setFlag("fvtt-bcdice", "sys-id", `${e.params.data.id}`);
    });
    html.find("#bc-formula").on("keydown", this._onKeyDown.bind(this));
    // html
    //   .find("button.bcd-macro-button")
    //   .each((i, e) => e.addEventListener("click", this._macroClick.bind(this)));
    html.find("button[data-button=roll]").click(this._onRollButton.bind(this));
    html.find("[data-header] > h3").click(this._headerClick.bind(this));
    html.find("button[data-delete-tab]").click(this._deleteTab.bind(this));
    html
      .find("button[data-delete-header]")
      .click(this._deleteHeader.bind(this));
    html.find("a[data-delete-macro]").click(this._deleteMacro.bind(this));
    html.find("button.bcd-macro-button").click(this._macroClick.bind(this));
    html
      .find("button.bcd-macro-button")
      .contextmenu(this._rightClick.bind(this));
    html.find("a.add-tab").click(this._addTab.bind(this));
    html.find("button.bc-add-header").click(this._addHeader.bind(this));
    html.find("button[data-add-macro]").click(this._addMacro.bind(this));
  }

  _rightClick(event) {
    /**@type {HTMLButtonElement} */
    const button = event.target;
    const macro = this._getMacroFrom(button.dataset.macro);
    this.element.find("#bc-formula").val(macro);
  }

  _macroClick(event) {
    const button = event.target;
    const macro = this._getMacroFrom(button.dataset.macro);
    this.roll(macro);
  }

  roll(macro) {
    let replacedMacro = macro;
    const replacements = this.replacements;
    const set = new Set();
    while (replacedMacro.match(replacementRegex)) {
      replacedMacro = replacedMacro.replaceAll(replacementRegex, (_, token) => {
        if (set.has(token)) return "";
        return replacements[token] ?? "";
      });
    }
    roll(this.getSystem(), replacedMacro);
  }

  async getSysHelp() {
    const aliasText = game.i18n.localize("fvtt-bcdice.alias");
    const data = await getHelpText(this.getSystem());

    const helpMessage = data.help_message
      .trim()
      .split("\n")
      .reduce(
        (acc, el) => {
          acc.push(`<p>${el}</p>`);
          return acc;
        },
        [
          '<p><a href="https://docs.bcdice.org/">https://docs.bcdice.org/</a></p>',
        ]
      )
      .join("\n");

    ChatMessage.create({
      content: `<p><em>${this.getSystem()}</em></p>
              <p>${helpMessage}</p>`,
      speaker: {
        alias: aliasText,
      },
    });
  }

  _addTab() {
    const tabs = getDataForCurrentEntity().tabs;
    tabs.push({ name: game.i18n.localize("fvtt-bcdice.newTab"), headers: [] });
    this._updateObject(null, { tabs });
  }

  _addHeader(event) {
    const target = event.target.dataset.tab;
    const tabs = getDataForCurrentEntity().tabs;
    const tab = tabs[parseInt(target)];
    // if (!tab.headers) tab.headers = [];
    tab.headers.push({
      name: game.i18n.localize("fvtt-bcdice.newHeader"),
      macros: [],
      open: true,
    });
    this._updateObject(null, { tabs });
  }

  _addMacro(event) {
    const tabs = getDataForCurrentEntity().tabs;
    const target = event.target.dataset.addMacro;
    const [tabID, headerID] = target.split("-");
    tabs[+tabID].headers[+headerID].macros.push({
      display: game.i18n.localize("fvtt-bcdice.newMacro"),
      macro: "1D20"
    });
    this._updateObject(null, { tabs });
  }

  /**
   * @param {String} id
   * @returns {String}
   */
  _getMacroFrom(id) {
    const [tab, header, macro] = id.split("-").map((i) => parseInt(i));
    return getDataForCurrentEntity().tabs[tab].headers[header].macros[macro]
      .macro;
  }

  _onRollButton() {
    const rollFormula = this.form.querySelector("#bc-formula").value;
    this.roll(rollFormula);
    const shouldPersistInput = game.settings.get("fvtt-bcdice", "formula-persistance");
    if (!shouldPersistInput) {
      document.getElementById("bc-formula").value = '';
    }
  }

  async _deleteTab(event) {
    const target = event.target.dataset.deleteTab;
    const tabs = getDataForCurrentEntity().tabs;
    if (
      !(await Dialog.confirm({
        title: game.i18n.localize("fvtt-bcdice.deleteThisTab"),
        content: game.i18n.localize("fvtt-bcdice.deleteTabBody"),
      }))
    )
      return;
    tabs.splice(+target, 1);
    this._updateObject(null, { tabs });
  }

  async _deleteHeader(event) {
    const target = event.target.dataset.deleteHeader;
    const tabs = getDataForCurrentEntity().tabs;
    if (
      !(await Dialog.confirm({
        title: game.i18n.localize("fvtt-bcdice.deleteThisHeader"),
        content: game.i18n.localize("fvtt-bcdice.deleteHeaderBody"),
      }))
    )
      return;
    const [tabID, headerID] = target.split("-");
    tabs[+tabID].headers.splice(+headerID, 1);
    this._updateObject(null, { tabs });
  }

  async _deleteMacro(event) {
    const target = event.currentTarget.dataset.deleteMacro;
    const tabs = getDataForCurrentEntity().tabs;
    const [tabID, headerID, macroID] = target.split("-");
    tabs[+tabID].headers[+headerID].macros.splice(+macroID, 1);
    this._updateObject(null, { tabs });
  }

  async _headerClick(event) {
    const targetHeader = event.currentTarget.parentElement.dataset.header;
    const tabs = getDataForCurrentEntity().tabs;
    const [tabIndex, headerIndex] = targetHeader
      .split("-")
      .map((i) => parseInt(i));
    const header = tabs[tabIndex].headers[headerIndex];
    header.open = !header.open;
    await this._updateObject(null, { tabs });
  }

  getSystem() {
    return (
      game.user.getFlag("fvtt-bcdice", "sys-id") ??
      game.settings.get("fvtt-bcdice", "game-system")
    );
  }

  get replacements() {
    const out = {};
    [
      ...(getDataForCurrentEntity().replacements ?? "").matchAll(
        /^(?!\s*#)\s*(.+)\s*=\s*(.+)$/gim
      ),
    ]
      .reduce((all, [_, key, value]) => {
        all.set(key, value);
        return all;
      }, new Map())
      .forEach((value, key, map) => {
        const set = new Set();
        set.add(key);
        let val = value;
        while (val.match(replacementRegex)) {
          val = val.replace(replacementRegex, (_, string) => {
            if (set.has(string)) return "";
            return map.get(string.trim());
          });
        }
        out[key] = val;
      });
    return out;
  }

  async openImporter() {
    const defaultImportSettings = {
      headers: {
        start: "■",
        end: "=",
      },
      macro: {
        order: "left",
        splitter: " ",
      },
      replacements: {
        varDef: "//",
        left: "{",
        right: "}",
      },
    };
    if (
      this.dialog &&
      this.dialog._state === Application.RENDER_STATES.RENDERED &&
      this.dialog.data.type === "importer"
    ) {
      this.dialog.bringToTop();
      return;
    }
    this.dialog?.close();

    const dialogContent = await renderTemplate(
      "modules/fvtt-bcdice/templates/import.html",
      {
        settings: mergeObject(
          defaultImportSettings,
          getDataForCurrentEntity().settings
        ),
      }
    );
    this.dialog = new Dialog({
      title: game.i18n.localize("fvtt-bcdice.bcdiceImporter"),
      content: dialogContent,
      type: "importer",
      buttons: {
        ok: {
          icon: '<i class="fas fa-file-import"></i>',
          label: "Import",
          callback: async (html) => {
            const tabName = html.find("input[name=tab-name]").val();
            const importText = html.find("textarea").val();
            const settings = {
              headers: {
                start: html.find("input[name=header-marker]").val(),
                end: html.find("input[name=header-trim]").val(),
              },
              macro: {
                order: html.find("select[name=order]").val(),
                splitter: html.find("input[name=macro-splitter]").val(),
              },
              replacements: {
                varDef: html.find("input[name=variable-marker]").val(),
                left: html.find("input[name=replacement-left]").val(),
                right: html.find("input[name=replacement-right]").val(),
              },
            };
            const parser = new MacroParser(settings);

            const parsed = parser.process(tabName, importText);
            const tabs = getDataForCurrentEntity().tabs;
            tabs.push(parsed);
            await this._updateObject(null, { tabs });
            this.dialog = null;
          },
        },
      },
      //default: "ok",
    });
    this.dialog.render(true);
  }

  async openReplacements() {
    if (
      this.dialog &&
      this.dialog._state === Application.RENDER_STATES.RENDERED &&
      this.dialog.data.type === "replacements"
    ) {
      this.dialog.bringToTop();
      return;
    }
    this.dialog?.close();

    const dialogContent = await renderTemplate(
      "modules/fvtt-bcdice/templates/replacements.html",
      { replacements: getDataForCurrentEntity().replacements }
    );

    this.dialog = new Dialog(
      {
        title: game.i18n.localize("fvtt-bcdice.bcdiceReplacements"),
        content: dialogContent,
        type: "replacements",
        buttons: {
          ok: {
            icon: '<i class="fas fa-save"></i>',
            label: "Save",
            callback: async (html) => {
              const replacements = html
                .find("textarea[name=replacements]")
                .val();
              await this._updateObject(null, { replacements });
              this.dialog = null;
            },
          },
        },
      },
      { width: 500, height:300 }
    );
    this.dialog.render(true);
  }

  async _updateObject(_event, formData) {
    Object.entries(formData).forEach(([k, v]) => {
      if (!k.startsWith("tabs.")) return;
      if (!formData.tabs) formData.tabs = getDataForCurrentEntity().tabs;
      delete formData[k];
      const matcher = /([^\.]+)(?:\.(.+))?/g;
      const keys = [...k.matchAll(/([^\.]+)/g)].map(([v]) => v);
      let target = formData;
      let key;
      while (keys.length > 0) {
        key = keys.shift();
        if (target instanceof Array) key = parseInt(key);
        if (target[key] instanceof Object) target = target[key];
      }
      target[key] = v;
    });
    const tabs = formData.tabs || getDataForCurrentEntity().tabs;
    const data = mergeObject(getDataForCurrentEntity(), expandObject(formData));
    data.tabs = tabs;
    await getCurrentEntity().setFlag("fvtt-bcdice", "macro-data", data);
    this._render();
  }

  _onKeyDown(event) {
    // Close dialog
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      return this.close();
    }
    // Confirm default choice
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      this._onRollButton();
    }
  }
}
