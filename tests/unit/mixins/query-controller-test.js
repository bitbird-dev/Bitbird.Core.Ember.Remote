import EmberObject from '@ember/object';
import QueryControllerMixin from 'bitbird-core-ember-remote/mixins/query-controller';
import { module, test } from 'qunit';

module('Unit | Mixin | query-controller', function() {
  // Replace this with your real tests.
  test('it works', function (assert) {
    let QueryControllerObject = EmberObject.extend(QueryControllerMixin);
    let subject = QueryControllerObject.create();
    assert.ok(subject);
  });
});
