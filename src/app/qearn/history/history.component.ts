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
import { ApiService } from 'src/app/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
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
  public isLoading = false;
  public tick = 0;
  constructor(
    private dialog: MatDialog,
    private transloco: TranslocoService,
    private apiService: ApiService,
    private qearnService: QearnService,
    private walletService: WalletService,
    private _snackBar: MatSnackBar
  ) {}

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  async ngOnIinit() {
    // await this.fetchData();
  }

  async ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    await this.fetchData();
  }

  public async fetchData() {
    this.isLoading = true;
    const seeds = this.walletService.getSeeds();
    const tickInfo = await lastValueFrom(this.apiService.getCurrentTick());
    for (const seedObj of seeds) {
      const pubKey = this.qearnService.getPublicKeyFromIdentity(seedObj.publicId);
      for (let j = 0; j < 4; j++) {
        const { bonusAmount, lockAmount: totalLockedAmount } = await this.qearnService.getLockInfoPerEpoch(tickInfo.tickInfo.epoch - j);
        const lockAmount = await this.qearnService.getUserLockInfo(pubKey, tickInfo.tickInfo.epoch - j);
        if (lockAmount) {
          const earlyUnlockPercent = REWARD_DATA.find((f) => f.weekFrom <= j && f.weekTo > j)?.earlyUnlock!;

          if (!this.allStakeData[seedObj.publicId]) {
            this.allStakeData[seedObj.publicId] = [];
          }

          this.allStakeData[seedObj.publicId].push({
            publicId: seedObj.publicId,
            lockedEpoch: 122 - j,
            lockedAmount: lockAmount,
            lockedWeeks: j,
            totalLockedAmountInEpoch: totalLockedAmount,
            currentBonusAmountInEpoch: bonusAmount,
            earlyUnlockPercent,
            fullUnlockPercent: 100,
          });
        }
      }
    }
    const allData: IStakeHistory[] = Object.values(this.allStakeData).flat();
    this.dataSource.data = allData;
    this.isLoading = false;
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
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          const tickInfo = await lastValueFrom(this.apiService.getCurrentTick());
          const seed = await this.walletService.revealSeed(element.publicId);
          const unlockResult = await this.qearnService.unLockQubic(seed, element.lockedAmount, element.lockedEpoch, tickInfo.tickInfo.tick);
          if (unlockResult) {
            this._snackBar.open('Unlock Successful!', this.transloco.translate('general.close'), {
              duration: 3000, // Duration in milliseconds
              panelClass: 'success',
            });
          }
        } catch (error) {
          console.log(error);
          this._snackBar.open('Something went wrong during unlock!', this.transloco.translate('general.close'), {
            duration: 3000,
            panelClass: 'error',
          });
        }
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
