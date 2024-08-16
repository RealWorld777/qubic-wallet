import { Component } from '@angular/core';
import { REWARD_DATA } from './table-data';

export interface WeekData {
  weekFrom: number;
  weekTo: number;
  earlyUnlock: number;
  burn: number;
  boost: number;
}

@Component({
  selector: 'app-reward-table',
  templateUrl: './reward-table.component.html',
  styleUrls: ['./reward-table.component.scss']
})
export class RewardTableComponent {
  displayedColumns: string[] = ['weekFrom', 'weekTo', 'earlyUnlock', 'burn', 'boost'];
  dataSource = REWARD_DATA;
}
