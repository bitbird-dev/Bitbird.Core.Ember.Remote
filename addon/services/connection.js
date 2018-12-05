import Service from '@ember/service';
import { inject } from '@ember/service';
import { computed } from '@ember/object';
import $ from 'jquery';
import { getOwner } from '@ember/application';
import RSVP from 'rsvp';
import FileSaverMixin from 'ember-cli-file-saver/mixins/file-saver';

export default Service.extend(FileSaverMixin, {
  settings: inject(),
  session: inject(),
  headers: computed({
    get() {
      let session = this.get('session'),
        token = session.get('token');
      return {
        'X-ApiKey': token
      }
    }
  }).volatile(),

  _setHeaders: function(request) {
    let headersObj = this.get('headers');
    for(let property in headersObj) {
      if(!headersObj.hasOwnProperty(property))
      {
        continue;
      }
      request.setRequestHeader(property, headersObj[property]);
    }
  },

  makeGetPromise: function(path, onSuccess, onFail){
    let self = this;
    return new RSVP.Promise(
      function(resolve, reject) {
        self.makeGet(path, function(data) {
            resolve(data);
            if(onSuccess) onSuccess(data);
          },
          function() {
            reject(new Error('makePromise failed'));
            if(onFail) onFail();
          }
        );
      });
  },

  /**
   * Loads a file and returns the file stream in a promise
   * @param url
   * @param targetFilename
   * @param saveOnDisk - if true, saves the file on disk
   * @returns {RSVP.Promise}
   */
  makeGetFilePromise: function(url, targetFilename, saveOnDisk){
    let self = this;
    return new RSVP.Promise(function(resolve, reject) {
      self.makeGet(url,
        function(data, responseFilename) {
          if(saveOnDisk) {
            //Uses FileSaver plugin
            self.saveAs(data, targetFilename || responseFilename || 'cleanbird_download.dat');
          }
          resolve(data);
        },
        function() {
          reject(new Error('makePromise failed'));
        }, null, 'binary');
    });
  },

  /**
   * Loads a file and returns the file as data url in a promise
   * @param url
   * @param targetFilename
   * @returns {RSVP.Promise}
   */
  makeGetFileDataUrl: function(url) {
    let self = this;
    let promise = new RSVP.Promise(function(resolve) {
      self.makeGetFilePromise(url, null, false).
      then((blob) => {
        let reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function() {
          let result = reader.result;
          resolve(result);
        }
      });
    });

    return promise;
  },

  makePostFilePromise: function(path, payload){
    let self = this;
    return new RSVP.Promise(function(resolve, reject) {
      self.makePost(path, payload,
        function(data/*, responseFilename*/) {
          //debugger;
          //Uses FileSaver plugin
          resolve(data);
        },
        function() {
          //debugger;
          reject(new Error('makePromise failed'));
        }, null, 'binary');
    });
  },

  makeDeletePromise:  function(path, payload){
    let self = this;
    return new RSVP.Promise(function(resolve, reject) {
      self.makeDelete(path, payload,
        function(data/*, responseFilename*/) {
          //debugger;
          //Uses FileSaver plugin
          resolve(data);
        },
        function() {
          //debugger;
          reject(new Error('makePromise failed'));
        });
    });
  },

  makeGet: function(path, success, fail, useJsonP, dataType) {
    let self = this,
      env = getOwner(this).resolveRegistration('config:environment');

    /**
     *
     * jquery.binarytransport.js
     *
     * @description. jQuery ajax transport for making binary data type requests.
     * @version 1.0
     * @author Henry Algus <henryalgus@gmail.com>
     *
     */

    // use this transport for "binary" data type
    // move this to an initializer
    $.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
      // check for conditions and support for blob / arraybuffer response type
      if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob)))))
      {
        return {
          // create new XMLHttpRequest
          send: function(headers, callback){
            // setup all variables
            let xhr = new XMLHttpRequest(),
              url = options.url,
              type = options.type,
              async = options.async || true,
              // blob or arraybuffer. Default is blob
              dataType = options.responseType || "blob",
              data = options.data || null,
              username = options.username || null,
              password = options.password || null;

            xhr.addEventListener('load', function(){
              let data = {};
              data[options.dataType] = xhr.response;
              // make callback and send data
              callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
            });

            xhr.open(type, url, async, username, password);

            // setup custom headers
            for (let i in headers ) {
              xhr.setRequestHeader(i, headers[i] );
            }

            xhr.responseType = dataType;
            xhr.send(data);
          },
          abort: function(){
            jqXHR.abort();
          }
        };
      }
    });

    dataType = dataType || 'json';

    let internalBasePath = env.APP.API.HOST + (env.APP.API.NAMESPACE ? '/' + env.APP.API.NAMESPACE : ''),
      serviceUrl = path,
      useInternalHeaders = false;

    // map relative paths to the api and use internal headers
    if(serviceUrl.indexOf('http://') !== 0 && serviceUrl.indexOf('https://') !== 0) {
      //Check if url starts with namespace
      if(env.APP.API.NAMESPACE && (serviceUrl.indexOf(env.APP.API.NAMESPACE + '/') === 0 || serviceUrl.indexOf('/' + env.APP.API.NAMESPACE + '/') === 0)) {
        serviceUrl = env.APP.API.HOST + ('/' + path).replace('//', '/');
      }
      else
      {
        serviceUrl = internalBasePath + ('/' + path).replace('//', '/');
      }
      useInternalHeaders = true;
    }
    // otherwise if the serviceUrl is internal, use internal headers
    else if(serviceUrl.indexOf(internalBasePath) === 0) {
      useInternalHeaders = true;
    }

    let ajaxConfig = {
      type: "GET",
      url: serviceUrl,
      beforeSend: function(request) {
        if(useInternalHeaders) {
          self._setHeaders(request);
        }
      },
      success: function(data, statusText, jqXHR) {
        let filename = null,
          cd = jqXHR.getResponseHeader("Content-Disposition");

        if(cd)
        {
          let cdArr = cd.split(';');
          if(cdArr)
          {
            for(let idx = 0; idx < cdArr.length; idx++) {
              let kvp = cdArr[idx].trim().split('=');
              if(kvp.length === 2 && kvp[0] === "filename") {
                filename = kvp[1];
                break;
              }
            }
          }
        }

        if(success) {
          success.call(null, data, filename);
        }
      },
      error: function() {
        if(fail) {
          fail.call(null);
        }
        return false;
      },
      complete: function() {
        //console.log(arguments);
      },
      dataType: dataType,
      processData: dataType !== 'binary'
    };


    if(useJsonP) {
      ajaxConfig.dataType = 'jsonp';
      ajaxConfig.jsonp = 'jsonp';
    }

    $.ajax(ajaxConfig);
  },

  makePost: function(path, payload, success, fail, useJsonP, dataType, resultDataType) {
    let self = this,
      env = getOwner(this).resolveRegistration('config:environment');

    /**
     *
     * jquery.binarytransport.js
     *
     * @description. jQuery ajax transport for making binary data type requests.
     * @version 1.0
     * @author Henry Algus <henryalgus@gmail.com>
     *
     */

    // use this transport for "binary" data type
    // move this to an initializer
    $.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
      // check for conditions and support for blob / arraybuffer response type
      if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob)))))
      {
        return {
          // create new XMLHttpRequest
          send: function(headers, callback){
            // setup all variables
            let xhr = new XMLHttpRequest(),
              url = options.url,
              type = options.type,
              async = options.async || true,
              // blob or arraybuffer. Default is blob
              dataType = options.responseType || "blob",
              data = options.data || null,
              username = options.username || null,
              password = options.password || null;

            xhr.addEventListener('load', function(){
              let data = {};
              data[options.dataType] = xhr.response;
              // make callback and send data
              callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
            });

            xhr.open(type, url, async, username, password);

            // setup custom headers
            for (let i in headers ) {
              xhr.setRequestHeader(i, headers[i] );
            }

            xhr.responseType = dataType;
            xhr.send(data);
          },
          abort: function(){
            jqXHR.abort();
          }
        };
      }
    });

    dataType = dataType || 'json';
    resultDataType = resultDataType || 'json';

    let internalBasePath = env.APP.API.HOST + (env.APP.API.NAMESPACE ? '/' + env.APP.API.NAMESPACE : ''),
      serviceUrl = path,
      useInternalHeaders = false;

    if(serviceUrl.indexOf(internalBasePath) === 0) {
      useInternalHeaders = true;
    }
    // map relative paths to the api and use internal headers
    else if(serviceUrl.indexOf('http://') !== 0 && serviceUrl.indexOf('https://') !== 0) {
      //Check if url starts with namespace
      if(env.APP.API.NAMESPACE && (serviceUrl.indexOf(env.APP.API.NAMESPACE + '/') === 0 || serviceUrl.indexOf('/' + env.APP.API.NAMESPACE + '/') === 0)) {
        serviceUrl = env.APP.API.HOST + ('/' + path).replace('//', '/');
      }
      else
      {
        serviceUrl = internalBasePath + ('/' + path).replace('//', '/');
      }
      useInternalHeaders = true;
    }
    // otherwise if the serviceUrl is internal, use internal headers
    else if(serviceUrl.indexOf(internalBasePath) === 0) {
      useInternalHeaders = true;
    }

    let ajaxConfig = {
      type: "POST",
      url: serviceUrl,
      beforeSend: function(request) {
        if(useInternalHeaders) {
          self._setHeaders(request);
        }
        /*request.setRequestHeader('accept', 'application/vnd.api+json');
        request.setRequestHeader('content-type', 'application/vnd.api+json');*/
      },
      success: function(data, statusText, jqXHR) {
        let filename = null,
          cd = jqXHR.getResponseHeader("Content-Disposition");

        if(cd)
        {
          let cdArr = cd.split(';');
          if(cdArr)
          {
            for(let idx = 0; idx < cdArr.length; idx++) {
              let kvp = cdArr[idx].trim().split('=');
              if(kvp.length === 2 && kvp[0] === "filename") {
                filename = kvp[1];
                break;
              }
            }
          }
        }

        if(success) {
          success.call(null, data, filename);
        }
      },
      error: function() {
        if(fail) {
          fail.call(null);
        }
        return false;
      },
      complete: function() {
        //console.log(arguments);
      },
      dataType: resultDataType, // data expected from the server
      data: payload, //data sent to the server
      processData: dataType !== 'binary'
    };


    if(useJsonP) {
      ajaxConfig.dataType = 'jsonp';
      ajaxConfig.jsonp = 'jsonp';
    }

    $.ajax(ajaxConfig);
  },

  makeDelete: function(path, payload, success, fail, useJsonP, dataType) {
    let self = this,
      env = getOwner(this).resolveRegistration('config:environment');

    /**
     *
     * jquery.binarytransport.js
     *
     * @description. jQuery ajax transport for making binary data type requests.
     * @version 1.0
     * @author Henry Algus <henryalgus@gmail.com>
     *
     */

    // use this transport for "binary" data type
    // move this to an initializer
    $.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
      // check for conditions and support for blob / arraybuffer response type
      if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob)))))
      {
        return {
          // create new XMLHttpRequest
          send: function(headers, callback){
            // setup all variables
            let xhr = new XMLHttpRequest(),
              url = options.url,
              type = options.type,
              async = options.async || true,
              // blob or arraybuffer. Default is blob
              dataType = options.responseType || "blob",
              data = options.data || null,
              username = options.username || null,
              password = options.password || null;

            xhr.addEventListener('load', function(){
              let data = {};
              data[options.dataType] = xhr.response;
              // make callback and send data
              callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
            });

            xhr.open(type, url, async, username, password);

            // setup custom headers
            for (let i in headers ) {
              xhr.setRequestHeader(i, headers[i] );
            }

            xhr.responseType = dataType;
            xhr.send(data);
          },
          abort: function(){
            jqXHR.abort();
          }
        };
      }
    });

    dataType = dataType || 'json';

    let internalBasePath = env.APP.API.HOST + (env.APP.API.NAMESPACE ? '/' + env.APP.API.NAMESPACE : ''),
      serviceUrl = path,
      useInternalHeaders = false;

    // map relative paths to the api and use internal headers
    if(serviceUrl.indexOf('http://') !== 0 && serviceUrl.indexOf('https://') !== 0) {
      serviceUrl = internalBasePath + ('/' + path).replace('//', '/');
      useInternalHeaders = true;
    }
    // otherwise if the serviceUrl is internal, use internal headers
    else if(serviceUrl.indexOf(internalBasePath) === 0) {
      useInternalHeaders = true;
    }

    let ajaxConfig = {
      type: "DELETE",
      url: serviceUrl,
      beforeSend: function(request) {
        if(useInternalHeaders) {
          self._setHeaders(request);
        }
      },
      success: function(data, statusText, jqXHR) {
        let filename = null,
          cd = jqXHR.getResponseHeader("Content-Disposition");

        if(cd)
        {
          let cdArr = cd.split(';');
          if(cdArr)
          {
            for(let idx = 0; idx < cdArr.length; idx++) {
              let kvp = cdArr[idx].trim().split('=');
              if(kvp.length === 2 && kvp[0] === "filename") {
                filename = kvp[1];
                break;
              }
            }
          }
        }

        if(success) {
          success.call(null, data, filename);
        }
      },
      error: function() {
        if(fail) {
          fail.call(null);
        }
        return false;
      },
      complete: function() {
        //console.log(arguments);
      },
      data: payload,
      dataType: dataType,
      processData: dataType !== 'binary'
    };


    if(useJsonP) {
      ajaxConfig.dataType = 'jsonp';
      ajaxConfig.jsonp = 'jsonp';
    }

    $.ajax(ajaxConfig);
  }
});
