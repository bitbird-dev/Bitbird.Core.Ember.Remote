import Mixin from '@ember/object/mixin';

export default Mixin.create({
  
    queryParams: ['page', 'size', 'sort', 'filter'],

    /**
     * The current page.
     * @type {number}
     */
    page: 0,
    
    /**
     * The maximum number of pages available.
     * @type {number}
     */
    maxPages: 1,

    /**
     * The number of entries per page.
     * @type {number}
     */
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

        /** 
         * Decrements the 'page' value.
         * Will not go lower than 0.
         */
        gotoPreviousPage: function() {
            let currentPage = parseInt(this.get('page'),10);
            if(currentPage > 0){
                this.set('page', currentPage - 1);
            }
        },

        /** 
         * Increments the 'page' value.
         * Will not go above (maxPages - 1).
         */
        gotoNextPage: function() {
            let currentPage = parseInt(this.get('page'),10);
            let newPage = currentPage + 1;
            // check for a max page
            if(newPage < maxPages){
                this.set('page', newPage);
            }
        }
    },
});
