import connection from "bitbird-core-ember-remote/services/connection";
import security from "bitbird-core-ember-remote/services/security";
import session from "bitbird-core-ember-remote/services/session";
import settings from "bitbird-core-ember-remote/services/settings";

export function initialize(application) {
  application.register('service:connection', connection, { singleton: true }); //instantiate: false
  application.register('service:security', security, { singleton: true }); //instantiate: false
  application.register('service:session', session, { singleton: true }); //instantiate: false
  application.register('service:settings', settings, { singleton: true }); //instantiate: false

  //application.inject('service:settings', 'service', 'service:settings');
  //application.inject('service:settings', 'service', 'service:settings');
}

export default {
  initialize: initialize
};
