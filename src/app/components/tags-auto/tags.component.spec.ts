import { async, TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MetaComponent } from '../meta/meta.component';
import { TagsComponent } from './tags.component'
import { AlphabetPrefixPipe as alphabetPrefixPipe} from '../../pipes/alphabet-prefix.pipe';
import { TagFilterPipe as tagFilterPipe} from '../../components/tags-auto/tag-filter.pipe';
import { TagFrequencyPipe as tagFrequency} from '../../components/tags-auto/tag-frequency.pipe';
import { TranslateModule, TranslateService} from '@ngx-translate/core';


/*describe('MetaComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        TagsComponent
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(TagsComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'TagsComponent'`, () => {
    const fixture = TestBed.createComponent(TagsComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('tags');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(TagsComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content span')?.textContent).toContain('Tags app is running!');
  });
});*/

describe('TagsComponent', () => {
    let component: TagsComponent;
    let fixture: ComponentFixture<TagsComponent>;
    beforeEach(async () => {
        TestBed.configureTestingModule({
            declarations: [TagsComponent, alphabetPrefixPipe, tagFilterPipe, tagFrequency ],
            imports: [TranslateModule],
            providers: [TranslateModule]
        })
        .compileComponents();
    });

    beforeEach(() =>{
        fixture = TestBed.createComponent(TagsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('Should create a component', ()=>{
        expect(component).toBeTruthy();
    });


});
