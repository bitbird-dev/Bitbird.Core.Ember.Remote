import connection from "./../services/connection";
import security from "./../services/security";
import session from "./../services/session";
import settings from "./../services/settings";

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
