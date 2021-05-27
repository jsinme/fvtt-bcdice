/**
 * Escapes a value for regexp
 * @param {string} line
 * @returns string
 */
function escape(line) {
  return line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parsed Macro instance
 * @typedef {Object} Macro
 * @property {string} display
 * @property {string} macro
 */

/**
 * A header with macros
 * @typedef {Object} Header
 * @property {string} name
 * @property {boolean} open
 * @property {Macro[]} macros
 */

/**
 * A tab's worth of macros
 * @typedef {Object} Tab
 * @property {string} name
 * @property {Object.<string,string>} variables
 * @property {Header[]} headers[]
 */

export default class MacroParser {
  /**
   * Configure a macro parser with settings
   * @param {Object} settings
   * @param {{start?: string, end?:string}} [settings.headers]
   * @param {{splitter?:string, order?: string}} [settings.macro]
   * @param {{marker?: string, replacements?: string[]}} [settings.variables]
   */
  constructor(settings = {}) {
    this.settings = settings;
    const header = new RegExp(
      escape(settings.headers?.start ?? "■") +
        "(.+?)" +
        escape(settings.headers?.end ?? "=") +
        "+",
      "i"
    );
    const macro = new RegExp(
      `(.*)${escape(settings.macro?.splitter ?? "▼")}(.*)`,
      "i"
    );
    const variable = new RegExp(
      escape(settings.variables?.marker ?? "//") + `\s*(\w+)\s*=+(\w+)/`
    );
    /** @type {Tab} */
    this.currentResults = null;
    this.rules = [
      {
        matcher: (line) => header.exec(line),
        action: ([_match, text]) => this.addHeader(text),
      },
      {
        matcher: (line) => macro.exec(line),
        action: ([_match, left, right]) =>
          this.settings.macro?.order === "left"
            ? this.addMacro(left, right)
            : this.addMacro(right, left),
      },
      {
        matcher: (line) => variable.exec(line),
        action: ([_match, name, value]) => this.addVariable(name, value),
      },
    ];
  }

  /**
   *
   * @param {String} tabName
   * @param {String} text
   * @returns {}
   */
  process(name, text) {
    const tab = (this.currentResults = { headers: [], name });
    this.addHeader(game.i18n.localize("fvtt-bcdice.defaultHeader"));
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.trim() === "") continue;
      for (const rule of this.rules) {
        const test = rule.matcher(line);
        if (test) {
          rule.action(test);
          break;
        }
      }
    }
    if (
      this.currentResults.headers[0].macros.length === 0 &&
      this.currentResults.headers.length > 1
    )
      this.currentResults.headers.shift();
    this.currentResults = null;
    return tab;
  }

  /**
   * @param {String} name
   */
  addHeader(name) {
    this.currentResults.headers.push({
      macros: [],
      name: name.trim(),
      open: true,
    });
  }

  /**
   *
   * @param {String} macro
   * @param {String} display
   */
  addMacro(macro, display) {
    this.currentResults.headers
      .slice(-1)
      .pop()
      .macros.push({ macro: macro.trim(), display: display.trim() });
  }

  /**
   *
   * @param {String} name
   * @param {String} value
   */
  addVariable(name, value) {
    this.currentResults.variables[name] = value;
  }
}
