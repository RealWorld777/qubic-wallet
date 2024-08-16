import { Injectable } from '@angular/core';
import { ApiService } from '../services/api.service';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class QearnService {
  constructor(private apiService: ApiService) {}

  public getPublicKeyFromIdentity(identity: string) {
    const publicKeyBuffer = new Uint8Array(32);
    for (let i = 0; i < 4; i++) {
      let value = 0n;
      for (let j = 13; j >= 0; j--) {
        const char = identity[i * 14 + j];
        if (char < 'A' || char > 'Z') {
          throw new Error('Invalid character in identity');
        }
        value = value * 26n + BigInt(char.charCodeAt(0) - 'A'.charCodeAt(0));
      }
      const view = new DataView(publicKeyBuffer.buffer);
      view.setBigUint64(i * 8, value, true);
    }
    return publicKeyBuffer;
  }

  public async lockQubic(seed: string, amount: bigint, tick: number) {
    const res = await this.apiService.contractTransaction(seed, 1, 0, amount, {}, tick);
    return res;
  }

  public async unLockQubic(seed: string, amount: bigint, epoch: number, tick: number ) {
    const res = await this.apiService.contractTransaction(seed, 2, 12, 0n, { UnlockAmount: amount, LockedEpoch: epoch }, tick);
    return res;
  }

  public async getLockInfoPerEpoch(epoch: number): Promise<{ lockAmount: bigint; bonusAmount: bigint }> {
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setUint32(0, epoch, true);

    const base64String = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const res = await lastValueFrom(
      this.apiService.queryStakingData({
        contractIndex: 6,
        inputType: 1,
        inputSize: 4,
        requestData: base64String,
      })
    );

    const bytes = Uint8Array.from(atob(res.responseData), (char) => char.charCodeAt(0));

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
