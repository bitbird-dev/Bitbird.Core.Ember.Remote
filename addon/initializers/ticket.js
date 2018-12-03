import Ticket from 'bitbird-core-ember-remote/services/ticket';

export function initialize(application) {
  application.register('service:ticket', Ticket, {singleton: true});
}

export default {
  name: 'ticket',
  initialize
};
