import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { TimeService } from '../../services/time.service';
import { IStakeHistory } from './mock-data';
import { MatTableDataSource } from '@angular/material/table';
import { QearnService } from 'src/app/services/qearn.service';
import { REWARD_DATA } from '../reward-table/table-data';
@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements AfterViewInit {
  public displayedColumns: string[] = [
    'lockedEpoch',
    'lockedAmount',
    'lockedWeeks',
    'totalLockedAmountInEpoch',
    'currentBonusAmountInEpoch',
    'earlyUnlockPercent',
    'fullUnlockPercent',
    'actions',
  ];
  // public dataSource = new MatTableDataSource<IStakeHistory>(MOCK_LOCK_DATA);
  public dataSource = new MatTableDataSource<IStakeHistory>([]);
  public allStakeData: { [key: string]: IStakeHistory[] } = {};

  constructor(
    private dialog: MatDialog,
    private transloco: TranslocoService,
    private qearnService: QearnService,
    private walletService: WalletService
  ) {}

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  async ngOnInit() {
    const seeds = this.walletService.getSeeds();
    for (let i = 0; i < seeds.length; i++) {
      const seed = this.qearnService.getPublicKeyFromIdentity(seeds[i].publicId);
      for (let j = 0; j < 52; j++) {
        const { bonusAmount, lockAmount: totalLockedAmount } = await this.qearnService.getLockInfoPerEpoch(119);
        const lockAmount = await this.qearnService.getUserLockInfo(seed, 119 - j);
        if (lockAmount)
          this.allStakeData[seeds[i].publicId].push({
            lockedEpoch: 119 - j,
            lockedAmount: lockAmount,
            lockedWeeks: j,
            totalLockedAmountInEpoch: totalLockedAmount,
            currentBonusAmountInEpoch: bonusAmount,
            earlyUnlockPercent: REWARD_DATA.find((f) => f.weekFrom <= j && f.weekTo > j)?.earlyUnlock!,
            fullUnlockPercent: 100,
          });
      }
    }
  }

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
