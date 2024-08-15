export interface AuthResponse {
  success?: boolean;
  token?: string | null;
  refreshToken?: string | null;
  privileges?: Array<string> | null;
}

export interface CurrentTickResponse {
  tick: number;
  dateTime: Date;
}


export interface SubmitTransactionResponse {
  id: string;
  dateTime: Date;
}

export interface SubmitTransactionRequest {
  SignedTransaction: string
}

export interface Transaction {
  id: string;
  sourceId: string;
  destId: string;
  amount: number;
  status: string;
  created: Date;
  stored?: Date;
  staged?: Date;
  broadcasted?: Date;
  confirmed?: Date;
  statusUpdate?: Date;
  targetTick: number;
  isPending: boolean;
  price?: number; // ipo bids
  quantity?:number; // ipo bids
  moneyFlow: boolean;
}

export interface BalanceResponse {
  computorIndex?: number;
  isComputor: boolean;
  publicId: string;
  currentEstimatedAmount: number;
  epochBaseAmount: number;
  epochChanges: number;
  baseDate: Date;
  transactions: Transaction[]
}

export interface NetworkBalance {
  publicId: string;
  amount: number;
  tick: number;
}

export interface MarketInformation {
  supply: number;
  price: number;
  capitalization: number;
  currency: string
}

export interface BallotDto {
  computorIndex?: number;
  computorId?: string | null;
  shortCode?: string | null;
  vote?: number;
}

export interface ProposalDto {
  status: number;
  url?: string | null;
  computorIndex?: number;
  shortCode?: string | null;
  computorId: string;
  ballots?: Array<BallotDto> | null;
  readonly resultSummary?: { [key: string]: Array<BallotDto>; } | null;
  readonly mostVotes?: number;
  readonly sumOption1?: number;
  readonly sumOption2?: number;
  readonly sumOption3?: number;
  readonly sumOption4?: number;
  readonly sumOption5?: number;
  readonly sumOption6?: number;
  readonly sumOption7?: number;
  readonly isPublished: boolean;
  title?: string | null;
  description?: string | null;
  options?: string | null;
  readonly hasVotes?: boolean;
  published: Date | null;
  publishedTick: number | null;
  tickForPublish: number;
}

export interface ProposalCreateRequest {
  computorId: string | null;
  title: string | null;
  description: string | null;
  option1: string | null;
  option2: string | null;
  option3?: string | null;
  option4?: string | null;
  option5?: string | null;
  option6?: string | null;
  option7?: string | null;
}
export interface ProposalCreateResponse {
  url: string;
  id: string;
  computorIndex: number;
  currentProtocol: number;
}

export interface ContractDto {
  id: string;
  index: number;
  name: string;
  bidOverview: IpoBidOverview;
}

export interface IpoBid {
  publicKey: string;
  computorId: string;
  price: number;
  positionIndex: number;
}

export interface IpoBidOverview {
  index: number;
  tick: number;
  bids: IpoBid[];
}

export interface PeerDto {
  ipAddress: string;
  currentTick: number;
  lastChange: Date;
}
export interface QubicAsset {
  publicId: string;
  contractIndex: number;
  assetName: string;
  contractName: string;
  ownedAmount: number;
  possessedAmount: number;
  tick: number;
  reportingNodes: string[]; // New field to report source node
  issuerIdentity: string;
}

export interface QuerySmartContract {
  contractIndex: number, 
  inputType: number,
  inputSize: number,
  requestData: string,
}
