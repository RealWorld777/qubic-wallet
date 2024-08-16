import { Injectable } from '@angular/core';
import { AuthResponse, BalanceResponse, ContractDto, CurrentTickResponse, MarketInformation, NetworkBalance, PeerDto, ProposalCreateRequest, ProposalCreateResponse, ProposalDto, QubicAsset, QuerySmartContract, SubmitTransactionRequest, SubmitTransactionResponse, Transaction } from './api.model';
import {
  HttpClient, HttpHeaders, HttpParams,
  HttpResponse, HttpEvent, HttpParameterCodec, HttpContext
} from '@angular/common/http';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { AuthInterceptor } from './auth-interceptor';
import { environment } from '../../environments/environment';
import { lastValueFrom, map, Observable, of } from 'rxjs';
import { TokenService } from './token.service';
import { WalletService } from './wallet.service';
import { QubicHelper } from 'qubic-ts-library/dist/qubicHelper';
import Crypto, { PUBLIC_KEY_LENGTH, DIGEST_LENGTH, SIGNATURE_LENGTH } from 'qubic-ts-library/dist/crypto';
import { UpdaterService } from './updater-service';

const TRANSACTION_SIZE = 144;
@Injectable({
  providedIn: 'root'
})
export class ApiService {

  public currentProposals: BehaviorSubject<ProposalDto[]> = new BehaviorSubject<ProposalDto[]>([]);
  public currentIpoContracts: BehaviorSubject<ContractDto[]> = new BehaviorSubject<ContractDto[]>([]);
  public currentPeerList: BehaviorSubject<PeerDto[]> = new BehaviorSubject<PeerDto[]>([]);
  public currentProtocol: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private basePath = environment.apiQliUrl;
  private authenticationActive = false;
  private qHelper = new QubicHelper()
  constructor(private walletService: WalletService, protected httpClient: HttpClient, private tokenSerice: TokenService, private authInterceptor: AuthInterceptor) {
    this.reAuthenticate();
  }

  public reAuthenticate() {
    if (this.authenticationActive)
      return;

    this.authenticationActive = true;
    // temp login for current use with public user
    // login to qubic.li
    this.login({
      username: 'guest@qubic.li',
      password: 'guest13@Qubic.li'
    }).subscribe(r => {
      if (r && r.token) {
        this.onAuthenticated(r.token);
      }
      this.authenticationActive = false;
    }, (e) => {
      this.authenticationActive = false;
    });
  }

  private onAuthenticated(token: string) {
    this.setToken(token);
    this.getProtocol().subscribe();
    this.getPeerList().subscribe();
  }

  private setToken(token: string) {
    this.tokenSerice.nextToken(token);
  }

  public login(authRequest: { username: string, password: string }) {
    let localVarPath = `/Auth/Login`;
    return this.httpClient.request<AuthResponse>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        body: authRequest,
        responseType: 'json'
      }
    );
  }

  public async getCurrentBalance(publicIds: string[]): Promise<any[]> {
    let result: any[] = [];
    console.log(publicIds)
    for (let i = 0; i < publicIds.length; i++) {
      let localVarPath = `/balances/${publicIds[i]}`;

      const balanceResponse = await this.httpClient.request<any>('get', `${this.basePath}${localVarPath}`, {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },

        responseType: 'json'
      }).toPromise();
      await this.walletService.updateBalance(balanceResponse.balance.id, Number(balanceResponse.balance.balance), 20000);

      if (balanceResponse) {
        result.push({
          publicId: balanceResponse.balance.id,
          computorIndex: 0,
          isComputor: false,
          epochBaseAmount: 0,
          currentEstimatedAmount: 0,
          epochChanges: 0,
          baseDate: Date,
          transactions: [],
        });
      }
    }
    return result;
  }


  public getNetworkBalances(publicIds: string[]) {
    let localVarPath = `/Wallet/NetworkBalances`;
    return this.httpClient.request<NetworkBalance[]>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: publicIds,
        responseType: 'json'
      }
    );
  }

  public getOwnedAssets(publicIds: string[]) {
    let localVarPath = `/Wallet/Assets`;
    return this.httpClient.request<QubicAsset[]>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: publicIds,
        responseType: 'json'
      }
    );
  }

  public getCurrentPrice() {
    let localVarPath = `/Public/MarketInformation`;
    return this.httpClient.request<MarketInformation>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        responseType: 'json'
      }
    );
  }

  public querySmartContract(jsonData: QuerySmartContract) {
    const localVarPath = "/querySmartContract";
    return this.httpClient.request<any>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: jsonData,
        responseType: 'json'
      }
    );
  }

  public broadcastTx(tx: Uint8Array){
    const localVarPath = `/broadcast-transaction`;
    const binaryString = Array.from(tx)
      .map((byte) => String.fromCharCode(byte))
      .join('');
    const txEncoded = btoa(binaryString);
    const body = { encodedTransaction: txEncoded };
    return this.httpClient.request<any>('post', `${this.basePath}${localVarPath}`, {
      context: new HttpContext(),
      responseType: 'json',
      body: body,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };
  
  
  public async contractTransaction(seed: string, inputType: number, inputSize: number, amount: bigint, payload: any, tick: number) {
    try {
      const idPackage = await this.qHelper.createIdPackage(seed);
      const qCrypto = await Crypto;
      // Get current tick with an offset
      const tickOffset = 5;
      // Build transaction
      const qearnTxSize = TRANSACTION_SIZE + inputSize;
      const sourcePrivateKey = idPackage.privateKey;
      const sourcePublicKey = idPackage.publicKey;
      const tx = new Uint8Array(qearnTxSize).fill(0);
      const txView = new DataView(tx.buffer);
      const contractIndex = 6;
      let offset = 0;
      let i = 0;
      for (i = 0; i < PUBLIC_KEY_LENGTH; i++) {
        tx[i] = sourcePublicKey[i];
      }
      offset = i;
      tx[offset] = contractIndex;
      offset++;
      for (i = 1; i < PUBLIC_KEY_LENGTH; i++) {
        tx[offset + i] = 0;
      }
      offset += i - 1;
      txView.setBigInt64(offset, amount, true);
      offset += 8;
      txView.setUint32(offset, tick + tickOffset, true);
      offset += 4;
      txView.setUint16(offset, inputType, true);
      offset += 2;
      txView.setUint16(offset, inputSize, true);
      offset += 2;
      if (payload.UnlockAmount) {
        txView.setBigUint64(offset, BigInt(payload.UnlockAmount), true);
        offset += 8;
      }
      if (payload.LockedEpoch) {
        txView.setUint32(offset, payload.LockedEpoch, true);
        offset += 4;
      }
      const digest = new Uint8Array(DIGEST_LENGTH);
      const toSign = tx.slice(0, offset);
      qCrypto.K12(toSign, digest, DIGEST_LENGTH);
      const signedTx = qCrypto.schnorrq.sign(
        sourcePrivateKey,
        sourcePublicKey,
        digest
      );
      tx.set(signedTx, offset);
      offset += SIGNATURE_LENGTH;

      const txResult = await lastValueFrom(this.broadcastTx(tx));
      return {
        txResult,
      };
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw new Error("Failed to sign and broadcast transaction.");
    }
  }

  public queryStakingData(jsonData: any){
    let localVarPath = `/querySmartContract`;
    return this.httpClient.request<any>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: jsonData,
        responseType: 'json'
      }
    );
  }

  public getCurrentIpoBids(publicIds: string[]) {
    let localVarPath = `/Wallet/CurrentIpoBids`;
    return this.httpClient.request<Transaction[]>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: publicIds,
        responseType: 'json'
      }
    );
  }

  public submitTransaction(submitTransaction: SubmitTransactionRequest) {
    let localVarPath = `/Public/SubmitTransaction`;
    return this.httpClient.request<SubmitTransactionResponse>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: submitTransaction,
        responseType: 'json'
      })
  }

  public getCurrentTick() {
    let localVarPath = `/tick-info`;
    return this.httpClient.request<any>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        responseType: 'json'
      }
    );
  }


  public getProtocol() {
    let localVarPath = `/Public/Protocol`;
    return this.httpClient.request<number>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    ).pipe(map((p) => {
      this.currentProtocol.next(p);
      return p;
    }));
  }

  public getProposals() {
    let localVarPath = `/Voting/Proposal`;
    return this.httpClient.request<ProposalDto[]>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    ).pipe(map((p) => {
      this.currentProposals.next(p);
      return p;
    }));
  }

  public getIpoContracts() {
    let localVarPath = `/Wallet/IpoContracts`;
    return this.httpClient.request<ContractDto[]>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    ).pipe(map((p) => {
      this.currentIpoContracts.next(p);
      return p;
    }));
  }

  public submitProposalCreateRequest(proposal: ProposalCreateRequest) {
    let localVarPath = `/Voting/Proposal`;
    return this.httpClient.request<ProposalCreateResponse>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: proposal,
        responseType: 'json'
      }
    );
  }

  public submitProposalPublished(proposalId: string) {
    let localVarPath = `/Voting/Proposal/` + proposalId + "/publish";
    return this.httpClient.request<ProposalCreateResponse>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    );
  }

  public getPeerList() {
    let localVarPath = `/Public/Peers`;
    return this.httpClient.request<PeerDto[]>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    ).pipe(map((p) => {
      this.currentPeerList.next(p);
      return p;
    }));
  }

}
