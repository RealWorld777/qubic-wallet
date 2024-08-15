import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { TimeService } from '../../services/time.service';
import { IStakeHistory, MOCK_LOCK_DATA } from './mock-data';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements AfterViewInit {
  public displayedColumns: string[] = ['lockedEpoch', 'lockedAmount', 'lockedWeeks', 'totalLockedAmountInEpoch', 'currentBonusAmountInEpoch', 'earlyUnlockPercent', 'fullUnlockPercent', 'actions'];
  public dataSource = new MatTableDataSource<IStakeHistory>(MOCK_LOCK_DATA);

  constructor(private dialog: MatDialog, private transloco: TranslocoService) {}

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openEarlyUnlockModal(element: IStakeHistory): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: 'Unlock',
        message: 'Do you want to unlock early?',
        confirm: 'Confirm',
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.removeElement(element);
      }
    });
  }

  removeElement(element: IStakeHistory): void {
    const index = this.dataSource.data.indexOf(element);
    if (index > -1) {
      this.dataSource.data.splice(index, 1);
      this.dataSource._updateChangeSubscription(); // Refresh the table
    }
  }
}
