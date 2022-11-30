import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MetaComponent } from './meta.component'
import { AutoTagSortPipe as autoTagSortPipe }  from '../../pipes/auto-tag-sort.pipe';
import { TagsDisplayPipe as tagDisplaytPipe }  from '../../components/tags-auto/tag-display.pipe';

describe('MetaComponent', () => {

  let app: MetaComponent;
  let fixture: ComponentFixture<MetaComponent>;

  beforeEach(async () => {
     TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        MetaComponent, autoTagSortPipe, tagDisplaytPipe
      ],
    }).compileComponents();
  });
  
  beforeEach(()=>{
     fixture = TestBed.createComponent(MetaComponent);
     app = fixture.componentInstance;
     fixture.detectChanges();
  });
 

  it('Should create the a component', () => {
    expect(app).toBeTruthy();
  });

  it(`The title should be: 'Meta'`, () => {
    expect(app.title).toEqual('Meta');
  });

});
