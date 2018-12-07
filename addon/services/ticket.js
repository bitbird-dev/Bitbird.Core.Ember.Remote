import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';

export default Service.extend({
  ajax: service(),
  userAgent: service('userAgent'),
  appVersion: service('appVersion'),
  session: service('session'),

  types: [
    { key: 'Bug', value: 'Bug' },
    { key: 'UserStory', value: 'User Story' },
    { key: 'Feature', value: 'Feature' }
  ],

  severities: [
    { key: 0, value: "1 - Critical"},
    { key: 1, value: "2 - High"},
    { key: 2, value: "3 - Medium"},
    { key: 3, value: "4 - Low"}
  ],

  priorities: [
    { key: 1, value: "1 - Must fix"},
    { key: 2, value: "2 - High"},
    { key: 3, value: "3 - Medium"},
    { key: 4, value: "4 - Unimportant"}
  ],

  _send(type, body) {
    let environment = getOwner(this).resolveRegistration('config:environment');

    //Append Api Key
    let session = this.get('session');
    let token = session.get('token');

    if (token === null){
      return Promise.reject("Need to be logged in to send ticket");
    }

    let internalBasePath = environment.APP.API.HOST + (environment.APP.API.NAMESPACE ? '/' + environment.APP.API.NAMESPACE : '');
    return this.get('ajax').request(`${internalBasePath}/ticket/?ticketType=${type}`,
      {
        type: 'POST',
        headers: {
          'X-ApiKey': token
        },
        data: JSON.stringify(body)
      });
  },

  _getBodyBase(title, description, priority) {
    let o = [];

    o.push({ "op": "add", "path": "/fields/System.Title", "value": title });
    o.push({ "op": "add", "path": "/fields/System.AreaPath", "value": "Cleanbird\\Cleanbird Customer Team" });

    if(priority)
    {
      o.push({ "op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": priority});
    }

    if(description)
    {
      o.push({ "op": "add", "path": "/fields/System.Description", "value": description });
    }

    return o;
  },

  _getSystemInfo() {
    let environment = getOwner(this).resolveRegistration('config:environment');

    let systemInfo = "",
      ua = this.get('userAgent'),
      uaBi = ua.get('browser.info'),
      uaOs = ua.get('os.info'),
      session = this.get('session'),
      appVersion = environment.APP.version;

    systemInfo += `<strong>Browser</strong>`;
    systemInfo += '<ul>';
    systemInfo += `<li>Url: ${document.location}</li>`;
    systemInfo += `<li>Browser: ${uaBi.name} ${uaBi.major} (${uaBi.version})</li>`;
    systemInfo += `<li>OS: ${uaOs.name} ${uaOs.version}</li>`;
    systemInfo += `<li>Viewport: ${window.innerWidth} x ${window.innerHeight}</li>`;
    systemInfo += '</ul>';

    systemInfo += `<strong>Cleanbird</strong>`;
    systemInfo += '<ul>';
    systemInfo += `<li>Version: ${appVersion}</li>`
    if(session.get('isLoggedIn')) {
      systemInfo += `<li>User: ${session.get('user.name')} (${session.get('user.id')})</li>`;
      systemInfo += `<li>Realm: ${session.get('user.realm.id')}</li>`;
    } else {
      systemInfo += '<li>User: not logged in';
    }
    systemInfo += '</ul>';

    return systemInfo || "";
  },

  createBug(title, reproText, priority, severity) {
    let severities = this.get('severities').map(function(kvp) { return kvp.value; });

    if(severities.indexOf(severity) < 0) {
      if(severities[severity] !== undefined) {
        severity = severities[severity];
      } else {
        severity = severities[2];
      }
    }

    let body = this._getBodyBase(title, null, priority);

    body.push({ "op": "add", "path": "/fields/Microsoft.VSTS.TCM.ReproSteps", "value": reproText || "" });
    body.push({ "op": "add", "path": "/fields/Microsoft.VSTS.TCM.SystemInfo", "value": this._getSystemInfo() });
    body.push({ "op": "add", "path": "/fields/Microsoft.VSTS.Common.Severity", "value": severity });

    return this._send("BUG", body);
  },

  createUserStory(title, description, priority, acceptanceCriteria) {
    description = description || '';
    description += `<hr><p>${this._getSystemInfo()}</p>`;

    let body = this._getBodyBase(title, description, priority);

    if(acceptanceCriteria)
      body.push({ "op": "add", "path": "/fields/Microsoft.VSTS.Common.AcceptanceCriteria", "value": acceptanceCriteria });

    return this._send("USERSTORY", body);
  },

  createFeature(title, description, priority, targetDate) {
    description = description || '';
    description += `<hr><p>${this._getSystemInfo()}</p>`;

    let body = this._getBodyBase(title, description, priority);

    if(targetDate)
      body.push({ "op": "add", "path": "/fields/Microsoft.VSTS.Scheduling.TargetDate", "value": targetDate });

    return this._send("FEATURE", body);
  }
});
