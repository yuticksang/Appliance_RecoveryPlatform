import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoringConfiguration } from './scoring-configuration';

describe('ScoringConfiguration', () => {
  let component: ScoringConfiguration;
  let fixture: ComponentFixture<ScoringConfiguration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoringConfiguration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScoringConfiguration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
