import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionReportComponent } from './transaction-report';

describe('TransactionReportComponent', () => {
  let component: TransactionReportComponent;
  let fixture: ComponentFixture<TransactionReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
