import { AutoTagSortPipe } from './auto-tag-sort.pipe';

describe('AutoTagSortPipe', () => {
    
    const pipe = new AutoTagSortPipe();
   
    it('Should create an instance', () => {
        expect(pipe).toBeTruthy();
    });

    it('Should sort data', () => {
        expect(pipe.transform([   
            {name: 'Dog', colour: '#a8bffb', removable: false},
            {name: 'Cat', colour: '#a8bffb', removable: true},
            {name: '2022', colour: '#a8bffb', removable: false},
            {name: 'Summer', colour: '#a8bffb', removable: true}
        ], true)).toEqual([
            {name: '2022', colour: '#a8bffb', removable: false},
            {name: 'Cat', colour: '#a8bffb', removable: true},
            {name: 'Dog', colour: '#a8bffb', removable: false},
            {name: 'Summer', colour: '#a8bffb', removable: true}
        ])
    });
});
