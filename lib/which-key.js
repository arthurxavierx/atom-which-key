/** @babel */
/* global atom */
import WhichKeyView, { Partial, Failed, Nothing } from './which-key-view';
import { CompositeDisposable } from 'atom';

const isKeydown = k => k !== '' && (k.length === 1 || k[0] !== '^');
const toKeystrokesList = keystrokes => keystrokes.split(' ').filter(isKeydown);

class WhichKey {

  activate() {
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'which-key:toggle': this.toggle.bind(this),
      }),
      atom.keymaps.onDidMatchBinding(this.match.bind(this)),
      atom.keymaps.onDidPartiallyMatchBindings(this.partial.bind(this)),
      atom.keymaps.onDidFailToMatchBinding(this.failed.bind(this))
    );

    atom.keymaps.partialMatchTimeout = this.partialMatchTimeout * 1000;
  }

  deactivate() {
    this.subscriptions.dispose();
    this.subscriptions = null;

    this.panel.destroy();
    this.panel = null;

    this.view.destroy();
    this.view = null;
  }

  toggle() {
    this.isVisible = !this.panel.isVisible();
  }

  updatePanel() {
    if (this.isVisible)
      this.panel.show();
    else
      this.panel.hide();
  }

  match({ eventType }) {
    if (eventType !== 'keydown')
      return;

    if (this.view.state.constructor !== Failed) {
      clearTimeout(this._failedTimeout);
      clearTimeout(this._partialTimeout);
      this.view.update(Nothing);
    }
  }

  partial({ eventType, keystrokes, partiallyMatchedBindings }) {
    if (eventType !== 'keydown')
      return;

    clearTimeout(this._failedTimeout);
    clearTimeout(this._partialTimeout);

    this._partialTimeout = setTimeout(() =>
      this.view.update(Partial({
        keystrokes: toKeystrokesList(keystrokes),
        bindings: partiallyMatchedBindings
      }))
    , this.view.state.constructor === Partial ? 0 : this.showBindingsDelay * 1000);
  }

  failed({ eventType, keystrokes }) {
    if (eventType !== 'keydown')
      return;

    const keystrokesList = toKeystrokesList(keystrokes);
    this.view.update(
      keystrokesList.length > 1
        ? Failed({ keystrokes: keystrokesList })
        : Nothing
    );

    clearTimeout(this._failedTimeout);
    clearTimeout(this._partialTimeout);
    this._failedTimeout = setTimeout(() => this.view.update(Nothing), this.failedTimeout * 1000);
  }

  get subscriptions() {
    if (!this._subscriptions)
      this._subscriptions = new CompositeDisposable();

    return this._subscriptions;
  }

  get panel() {
    this._ensureView();
    return this._ensurePanel();
  }

  get view() {
    this._ensurePanel();
    return this._ensureView();
  }

  set isVisible(value) {
    return atom.config.set('which-key.isVisible', value);
  }
  get isVisible() {
    return atom.config.get('which-key.isVisible');
  }

  get failedTimeout() {
    return atom.config.get('which-key.failedTimeout');
  }

  get partialMatchTimeout() {
    return atom.config.get('which-key.partialMatchTimeout');
  }

  get showBindingsDelay() {
    return atom.config.get('which-key.showBindingsDelay');
  }

  _ensurePanel() {
    if (!this._panel) {
      this._panel = atom.workspace.addFooterPanel({
        item: this._ensureView(),
        visible: this.isVisible,
        priority: 100,
      });

      this.updatePanel();
      this.subscriptions.add(
        atom.config.observe('which-key.isVisible', this.updatePanel.bind(this))
      );
    }

    return this._panel;
  }

  _ensureView() {
    if (!this._view)
      this._view = new WhichKeyView();

    return this._view;
  }
}

export default new WhichKey();
