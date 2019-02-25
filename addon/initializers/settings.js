import connection from "bitbird-core-ember-remote/services/connection";
import security from "bitbird-core-ember-remote/services/security";
import session from "bitbird-core-ember-remote/services/session";
import settings from "bitbird-core-ember-remote/services/settings";

export function initialize(application) {
  application.register('service:settings', settings, { singleton: true }); //instantiate: false
}

export default {
  initialize: initialize,
  after: 'remote'
};
