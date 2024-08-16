import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { TimeService } from '../../services/time.service';
import { ApiService } from 'src/app/services/api.service';
import { UpdaterService } from 'src/app/services/updater-service';
import { QubicHelper } from 'qubic-ts-library/dist/qubicHelper';
import { lastValueFrom } from 'rxjs';
import { QearnService } from 'src/app/services/qearn.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-staking',
  templateUrl: './staking.component.html',
  styleUrls: ['./staking.component.scss'],
})
export class StakingComponent {
  public maxAmount = 0n;
  public stakeAmount = 0n;
  public remainingTime = { days: 0, hours: 0, minutes: 0 };
  public tick = 0;
  public stakeForm = this.fb.group({
    sourceId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(10000000), Validators.pattern(/^[0-9]*$/)]],
  });

  @ViewChild('selectedDestinationId', { static: false })
  public tickOverwrite = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private walletService: WalletService,
    private timeService: TimeService,
    private dialog: MatDialog,
    private transloco: TranslocoService,
    private apiService: ApiService,
    private updaterService: UpdaterService,
    private qearnService: QearnService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.redirectIfWalletNotReady();
    this.setupSourceIdValueChange();
    this.subscribeToTimeUpdates();
  }

  async lockQubic(seed: string, amount: bigint, tick: number) {
    return this.qearnService.lockQubic(seed, amount, tick);
  }

  async unLockQubic(seed: string, amount: bigint, epoch: number, tick: number) {
    return this.qearnService.unLockQubic(seed, amount, epoch, tick);
  }

  async getLockInfoPerEpoch(epoch: number) {
    return this.qearnService.getLockInfoPerEpoch(epoch);
  }

  async getUserLockInfo(user: Uint8Array, epoch: number) {
    return this.qearnService.getUserLockInfo(user, epoch);
  }

  private redirectIfWalletNotReady(): void {
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']);
    }
    this.apiService.getCurrentTick().subscribe((s) => {
      this.tick = s.tickInfo.tick;
    });
  }

  private setupSourceIdValueChange(): void {
    this.stakeForm.controls.sourceId.valueChanges.subscribe((s) => {
      if (s) {
        this.maxAmount = BigInt(this.walletService.getSeed(s)?.balance ?? 0);
      }
    });
  }

  private updateAmountValidators(): void {
    this.stakeForm.controls.amount.setValidators([Validators.required, Validators.min(10000000), Validators.pattern(/^[0-9]*$/)]);
    this.stakeForm.controls.amount.updateValueAndValidity();
  }

  private subscribeToTimeUpdates(): void {
    this.timeService.getTimeToNewEpoch().subscribe((time) => {
      this.remainingTime = time;
    });
  }

  validateAmount(event: any): void {
    const value = event.target.value;
    this.stakeAmount = BigInt(value);
    if (!/^[0-9]*$/.test(value)) {
      this.stakeForm.controls.amount.setErrors({ pattern: true });
    }
    if (event.target.value > this.maxAmount) {
      this.stakeForm.controls.amount.setErrors({ exceedsBalance: true });
    }
  }

  getSeeds(isDestination = false) {
    return this.walletService.getSeeds().filter((seed) => !isDestination || seed.publicId !== this.stakeForm.controls.sourceId.value);
  }

  setStaking(amount: number): void {
    if (this.stakeForm.valid) {
      this.stakeForm.controls.amount.setValue(amount);
    }
  }

  confirmLock(): void {
    const amountToStake = this.stakeForm.controls.amount.value;
    const currency = this.transloco.translate('general.currency');

    const confirmDialog = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: this.transloco.translate('qearn.stakeQubic.confirmDialog.confirmLockTitle'),
        message: `${this.transloco.translate('qearn.stakeQubic.confirmDialog.confirmLockMessage', { amount: amountToStake, currency })}`,
        confirm: this.transloco.translate('qearn.stakeQubic.confirmDialog.confirm'),
      },
    });

    confirmDialog.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          const seed = await this.walletService.revealSeed(this.stakeForm.controls.sourceId.value!);
          const result = await this.qearnService.lockQubic(seed, this.stakeAmount, this.tick);
          if (result.txResult)
            this._snackBar.open('Success!', this.transloco.translate('general.close'), {
              duration: 0,
              panelClass: 'success',
            });
        } catch (error) {
          console.log(error);
          this._snackBar.open('Something went wrong!', this.transloco.translate('general.close'), {
            duration: 0,
            panelClass: 'error',
          });
        }
      } else {
      }
    });
  }

  showResult(result: any): void {
    const amountToStake = this.stakeForm.controls.amount.value;
    const currency = this.transloco.translate('general.currency');

    const resultDialog = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: this.transloco.translate('qearn.stakeQubic.confirmDialog.confirmLockTitle'),
        message: `${this.transloco.translate('qearn.stakeQubic.confirmDialog.confirmLockMessage', { amount: amountToStake, currency })}`,
      },
    });

    resultDialog.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Staking confirmed:', result);
      } else {
        console.log('Staking cancelled');
      }
    });
  }

  onSubmit(): void {}
}
