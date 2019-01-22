import Mixin from '@ember/object/mixin';

export default Mixin.create({
  queryParams: {
    page: {
      refreshModel: true
    },
    size: {
      refreshModel: true
    },
    sort: {
      refreshModel: true
    },
    filters: {
      refreshModel: true
    }
  },
  createQueryObjectFromControllerParams(params){
    // params has format of { parameter: "someValueOrJustNull" },
    // which we can forward to the server.
    let queryObject = {};
    if(params.page !== null){
      queryObject.page = {number : params.page};
    }
    if(params.size !== null){
      if(queryObject.page === undefined){
        queryObject.page = {};
      }
      queryObject.page.size = params.size;
    }
    if(params.sort !== ''){
      queryObject['sort'] = params.sort;
    }
    if(params.filters !== ''){
      queryObject.filter = {};
      let filters = params.filters.split(';');
      filters.forEach(element => {
        let f = element.split('=');
        queryObject.filter[f[0]] = f[1];
      });
    }
    return queryObject;
  }
});
