import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueryCreateComponent } from './query-create.component';

describe('QueryCreateComponent', () => {
  let component: QueryCreateComponent;
  let fixture: ComponentFixture<QueryCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryCreateComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(QueryCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
