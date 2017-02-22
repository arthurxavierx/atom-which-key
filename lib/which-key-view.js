/** @babel */
/** @jsx etch.dom */
/* global atom */
import etch from 'etch';
import Type from './type';
import Keys from './keys';

export const { Partial, Failed, Nothing } = new Type({
  Partial: ['keystrokes', 'bindings'],
  Failed: ['keystrokes'],
  Nothing: [],
});

export default class WhichKeyView {

  constructor() {
    this.state = Nothing;
    etch.initialize(this);
  }

  update(state) {
    this.state = state;
    etch.update(this);
  }

  render() {
    switch (this.state.constructor) {
    case Partial: return this.renderPartialMatch(this.state);
    case Failed: return this.renderFailed(this.state);
    default: return this.renderEmpty(this.state);
    }
  }

  renderPartialMatch({ keystrokes = [], bindings = [] }) {
    const grouppedBindings = this._groupBindings(keystrokes, bindings);

    return (
      <div className='which-key which-key-partial' style={this._style}>
        <div className='which-key-bindings panel-body padded'>
          {grouppedBindings.map(b => (
            <div className='which-key-binding'>
              <span className='which-key-keys'>{b.key}</span>
              <span className='which-key-arrow'>&nbsp;→&nbsp;</span>
              <span className={b.isGroup ? 'which-key-group' : 'which-key-command'}>{b.command}</span>
            </div>
          ))}
        </div>
        <div className='which-key-keystrokes panel-footer padded'>
          <span className='which-key-keys'>{this._formatKeystrokes(keystrokes)}-</span>
        </div>
      </div>
    );
  }

  renderFailed({ keystrokes = [] }) {
    return (
      <div className='which-key which-key-failed' style={this._style}>
        <div className='which-key-keystrokes panel-footer padded'>
          <span className='which-key-keys'>{this._formatKeystrokes(keystrokes)}</span>
          <span className='which-key-undefined'>&nbsp;is undefined</span>
        </div>
      </div>
    );
  }

  renderEmpty() {
    return (
      <div className='which-key which-key-empty' style={this._style}></div>
    );
  }

  _formatKeystrokes(keystrokes = []) {
    const isKeydown = k => k !== '' && (k.length === 1 || k[0] !== '^');

    const transformShiftedUppercase = k =>
      k.replace(/shift-(.*)(.+)$/gi, (_, mod, key) => key.toUpperCase() === key ? `${mod}${key}` : k);

    const transformModifiers = k =>
      k.replace(/([^-]+)(-|$)/gi, (_, key, con) => {
        key = key === 'alt' && this.useMetaForAlt ? 'meta' : key;
        return (this.keystrokesFormat === 'symbol'
          ? Keys.symbols[key]
        : this.keystrokesFormat === 'short'
          ? (Keys.short[key] ? Keys.short[key] + con : undefined)
          : undefined)
        || ((Keys.uppercase[key] || key) + con);
      });

    return keystrokes
      .filter(isKeydown)
      .map(transformShiftedUppercase)
      .map(transformModifiers)
      .join(' ');
  }

  _groupBindings(keystrokes = [], bindings = []) {
    const getGroup = command => (command.match(/^([^:\s]+)/i) || [])[1];
    const getCommand = command => (command.match(/([^:\s]+)$/i) || [])[1];

    const { prefixes, groups } = bindings
      .reduce(({ prefixes, groups }, b) => {
        const prefix = b.keystrokeArray[keystrokes.length];
        const group = getGroup(b.command);

        prefixes[prefix] = {
          command: (prefixes[prefix] || {}).command || b.command,
          count: ((prefixes[prefix] || {}).count + 1) || 1,
          groups: Object.assign(
            (prefixes[prefix] || {}).groups || {},
            { [group]: true }
          ),
        };
        groups[group] = true;

        return { prefixes, groups };
      }, { prefixes: {}, groups: {} });

    const isOfASingleGroup = Object.keys(groups).length <= 1;

    return Object.keys(prefixes)
      .sort((ka, kb) =>
        ka.length !== kb.length
          ? kb.length - ka.length
        : ka > kb ? 1 : -1
      )
      .map(key => ({
        key: this._formatKeystrokes([key]),
        isGroup: prefixes[key].count > 1,
        command: prefixes[key].count > 1
          ? Object.keys(prefixes[key].groups).map(g => `+${g}`).join('/')
          : (isOfASingleGroup || !this.showPackageNamesInCommands
            ? getCommand(prefixes[key].command)
            : prefixes[key].command),
      }));
  }

  get keystrokesFormat() {
    return atom.config.get('which-key.keystrokesFormat');
  }

  get showPackageNamesInCommands() {
    return atom.config.get('which-key.showPackageNamesInCommands');
  }

  get useMetaForAlt() {
    return atom.config.get('which-key.useMetaForAlt');
  }

  get _style() {
    return `font-family: ${atom.config.get('editor.fontFamily')}`;
  }
}
