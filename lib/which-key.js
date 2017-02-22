/** @babel */
/* global atom */
import WhichKeyView, { Partial, Failed, Nothing } from './which-key-view';
import { CompositeDisposable } from 'atom';

const isKeydown = k => k !== '' && (k.length === 1 || k[0] !== '^');

class WhichKey {

  activate() {
    this._subscriptions = new CompositeDisposable();

    this._view = new WhichKeyView();
    this._attach();
    this._update();

    this._subscriptions.add(atom.commands.add('atom-workspace', {
      'which-key:toggle': () => this.toggle(),
    }));
    this._subscriptions.add(atom.config.observe('which-key.isVisible', () => this._update()));

    this._subscriptions.add(atom.keymaps.onDidMatchBinding(({ eventType }) => {
      if (eventType !== 'keydown')
        return;

      if (this._view.state.constructor !== Failed) {
        clearTimeout(this._failedTimeout);
        this._view.update(Nothing);
      }
    }));

    this._subscriptions.add(atom.keymaps.onDidPartiallyMatchBindings(({ eventType, keystrokes, partiallyMatchedBindings }) => {
      if (eventType !== 'keydown')
        return;

      clearTimeout(this._failedTimeout);
      this._view.update(Partial({
        keystrokes: keystrokes.split(' ').filter(isKeydown),
        bindings: partiallyMatchedBindings
      }));
    }));

    this._subscriptions.add(atom.keymaps.onDidFailToMatchBinding((event) => {
      if (event.eventType !== 'keydown')
        return;

      const keystrokes = event.keystrokes.split(' ').filter(isKeydown);
      this._view.update(
        keystrokes.length > 1
          ? Failed({ keystrokes })
          : Nothing
      );

      clearTimeout(this._failedTimeout);
      this._failedTimeout = setTimeout(() => this._view.update(Nothing), this.failedTimeout * 1000);
    }));
  }

  deactivate() {
    this._subscriptions.dispose();
    this._subscriptions = null;

    this._panel.destroy();
    this._panel = null;

    this._view.destroy();
    this._view = null;
  }

  toggle() {
    this.isVisible = !this._panel.isVisible();
  }

  _attach() {
    if (this._panel)
      this._panel.destroy();

    this._panel = atom.workspace.addFooterPanel({
      item: this._view,
      visible: true,
      priority: 100,
    });
  }

  _update() {
    if (this.isVisible)
      this._panel.show();
    else
      this._panel.hide();
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
}

export default new WhichKey();
