import EmberObject from '@ember/object';
import SettingsPropertiesMixin from 'bitbird-core-ember-remote/mixins/settings-properties';
import { module, test } from 'qunit';

module('Unit | Mixin | settings-properties', function() {
  // Replace this with your real tests.
  test('it works', function (assert) {
    let SettingsPropertiesObject = EmberObject.extend(SettingsPropertiesMixin);
    let subject = SettingsPropertiesObject.create();
    assert.ok(subject);
  });
});
