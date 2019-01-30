import Mixin from '@ember/object/mixin';
import { inject } from '@ember/service';
import { getOwner } from '@ember/application';

export default Mixin.create({
  connection: inject(),
  queryParams: ['page', 'size', 'sort', 'filter'],
  page: 0,
  size: 50,
  sort: '',
  filters: '',
  filterMap: new Map(),
  actions:{
    sortingChanged: function(params){
        let sortString = '';
        let state = params['state'];
        let attrName = params['attr'];
        if(state !== 'noSort'){
            sortString = (state === 'asc') ? attrName : `-${attrName}`;
        }
        this.set('sort', sortString);
    },
    filterChanged: function(params){
        let filterValue = params['filter'];
        let filterType = params['filterType'];
        let attrName = params['attr'];
        let filterString = '';
        this.filterMap.set(attrName, {value: filterValue, type: filterType});
        this.filterMap.forEach((v,k)=>{
            if(v !== null && v !== ''){
                if(v.type !== 'EXACT'){
                    filterString = filterString + `${k}=${v.type}(${v.value});`;
                }
                else {
                    filterString = filterString + `${k}=${v.value};`;
                }
            }
        });
        this.set('filters',filterString);
        
    },
    gotoPreviousPage: function() {
        let currentPage = parseInt(this.get('page'),10);
        if(currentPage > 0){
            this.set('page', currentPage - 1);
        }
    },
    gotoNextPage: function() {
        let currentPage = parseInt(this.get('page'),10);
        // TODO: check for a max page
        this.set('page', currentPage + 1);
    }
  },
  
  /**
   * Sends a POST request to the api resource and returns a promise with the requested binary data.
   * the payload will be computed from the headers array.
   * any attribute names supplied by the except paramter will be ignored.
   * @example
   * this.xlsxTable(['actionColumn', 'role'], 'users/exportToXlsx').then((data)=>{
   *    this.saveFileAs('users.xlsx', data,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   * });
   * @param  {Array} except to exclude columns
   * @param  {string} path path to the api resource
   * @returns { Promise } Returns the binary data received from the backend.
   */
  xlsxTable: function(except, path) {
    let conn = this.get('connection');
    // build url
    let env = getOwner(this).resolveRegistration('config:environment');
    let url = `${env.APP.API.HOST}/${env.APP.API.NAMESPACE}`;
    if(path.startsWith('/')) {
      url = url + path;
    } else {
      url = url + '/' + path;
    }
    // build payload
    let payload = this.headersToXlsxPayload(except);

    // build promise with post request
    let header = conn.get('headers');
    return new Promise(function(resolve, reject) {
      $.ajax({
        url:url,
        type:"POST",
        data: JSON.stringify(payload),
        headers: header,
        contentType:"application/json; charset=utf-8",
        dataType: 'blob',
        success: function(data, textStatus, jqXHR){
          resolve(data);
        },
        error: function(jqXHR,textStatus,errorThrown){
          reject(new Error(`download failed - ${textStatus}.`));
        }
      });
    });
  },

  /**
   * Converts the headers array to payload for the xlslx download request.
   * use the except paramter to exclude columns
   * @param  {Array} except to exclude columns
   * @example
   * // returns a post 
   * headersToXlsxPayload(['columnA, columnB']]);
   * @returns { object } Returns the payload.
   */
  headersToXlsxPayload: function(except){
    let x = { columns: [] };
    let h = this.get('headers');
    // todo: null/undef/whatever check 
    h.forEach((h) => {if(except.indexOf(h.attributeName) < 0) x.columns.push({property: h.attributeName, caption: h.headerTitle });});
    return x;
  },
});
