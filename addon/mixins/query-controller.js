import Mixin from '@ember/object/mixin';

export default Mixin.create({
  
  queryParams: ['page', 'size', 'sort', 'filter'],
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
        
    }
  },
  
  
});
