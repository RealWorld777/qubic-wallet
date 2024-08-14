import { Injectable } from '@angular/core';
import { AuthResponse, BalanceResponse, ContractDto, CurrentTickResponse, MarketInformation, NetworkBalance, PeerDto, ProposalCreateRequest, ProposalCreateResponse, ProposalDto, QubicAsset, SubmitTransactionRequest, SubmitTransactionResponse, Transaction } from './api.model';
import {
  HttpClient, HttpHeaders, HttpParams,
  HttpResponse, HttpEvent, HttpParameterCodec, HttpContext
} from '@angular/common/http';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { AuthInterceptor } from './auth-interceptor';
import { environment } from '../../environments/environment';
import { map, Observable, of } from 'rxjs';
import { TokenService } from './token.service';

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

  constructor(protected httpClient: HttpClient, private tokenSerice: TokenService, private authInterceptor: AuthInterceptor) {
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
  
    for (let i = 0; i < publicIds.length; i++) {
      let localVarPath = `/balances/${publicIds[i]}`;
  
      const balanceResponse = await this.httpClient.request<any>('get', `${this.basePath}${localVarPath}`, {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        
        responseType: 'json'
      }).toPromise();
  
      if (balanceResponse) {
        result.push(balanceResponse.balance);
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
    let localVarPath = `/Public/CurrentTick`;
    return this.httpClient.request<CurrentTickResponse>('get', `${this.basePath}${localVarPath}`,
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
