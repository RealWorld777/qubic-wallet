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

@Component({
  selector: 'app-staking',
  templateUrl: './staking.component.html',
  styleUrls: ['./staking.component.scss'],
})
export class StakingComponent {
  public maxAmount = 0;
  public stakeAmount = 0;
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
    private updaterService: UpdaterService
  ) {}

  ngOnInit(): void {
    this.redirectIfWalletNotReady();
    this.setupSourceIdValueChange();
    this.subscribeToTimeUpdates();
    this.apiService.getCurrentTick().subscribe((s) => {
      this.tick = s.tickInfo.tick;
    });
  }

  private redirectIfWalletNotReady(): void {
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']);
    }
  }

  private setupSourceIdValueChange(): void {
    this.stakeForm.controls.sourceId.valueChanges.subscribe((s) => {
      if (s) {
        this.maxAmount = this.walletService.getSeed(s)?.balance ?? 0;
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
        // const seed = await this.walletService.revealSeed(this.stakeForm.controls.sourceId.value!);
        // const res = await this.apiService.contractTransaction(seed, 1, 0, 466000000n, {}, this.tick+9)
        // const res = await this.apiService.contractTransaction(seed, 1, 0, 0n, {UnlockAmount:466000000n, LockedEpoch:120}, this.tick+9)

        const seed = await this.walletService.revealSeed(this.stakeForm.controls.sourceId.value!);
        const pubKey = (await new QubicHelper().createIdPackage(seed)).publicKey;
        
        const lockAmount = await this.getUserLockInfo(pubKey, 119)
        console.log(lockAmount)
      } else {
        console.log('Staking cancelled');
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

  public async lockQubic(amount: bigint) {
    const seed = await this.walletService.revealSeed(this.stakeForm.controls.sourceId.value!);
    const res = await this.apiService.contractTransaction(seed, 1, 0, amount, {}, this.tick + 5);
    return res;
  }
  public async unLockQubic(amount: bigint, epoch: number) {
    const seed = await this.walletService.revealSeed(this.stakeForm.controls.sourceId.value!);
    const res = await this.apiService.contractTransaction(seed, 2, 12, 0n, { UnlockAmount: amount, LockedEpoch: epoch }, this.tick + 9);
    return res;
  }
  public async getLockInfoPerEpoch(epoch: number): Promise<{ lockAmount: bigint; bonusAmount: bigint }> {
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setUint32(0, epoch, true);
  
    const base64String = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  
    const res = await lastValueFrom(this.apiService.queryStakingData({
      contractIndex: 6,
      inputType: 1,
      inputSize: 4,
      requestData: base64String,
    }));
  
    const bytes = Uint8Array.from(atob(res.responseData), char => char.charCodeAt(0));
  
    const dataView = new DataView(bytes.buffer);
    const lockAmount = dataView.getBigUint64(0, true);
    const bonusAmount = dataView.getBigUint64(8, true);
  
    return { lockAmount, bonusAmount };
  }
  
  public async getUserLockInfo(user: Uint8Array, epoch: number): Promise<bigint> {
    const buffer = new ArrayBuffer(36);
    const dataView = new DataView(buffer);

    user.forEach((byte, index) => dataView.setUint8(index, byte));
    dataView.setUint32(32, epoch, true);

    const base64String = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const res = await lastValueFrom(
      this.apiService.queryStakingData({
        contractIndex: 6,
        inputType: 2,
        inputSize: 36,
        requestData: base64String,
      })
    );

    const bytes = Uint8Array.from(atob(res.responseData), (char) => char.charCodeAt(0));

    return new DataView(bytes.buffer).getBigUint64(0, true);
  }
}
