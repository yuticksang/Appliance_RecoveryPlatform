import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditScore } from './edit-score';

describe('EditScore', () => {
  let component: EditScore;
  let fixture: ComponentFixture<EditScore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditScore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditScore);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
