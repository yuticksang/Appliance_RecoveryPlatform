import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionReport } from './transaction-report';

describe('TransactionReport', () => {
  let component: TransactionReport;
  let fixture: ComponentFixture<TransactionReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
