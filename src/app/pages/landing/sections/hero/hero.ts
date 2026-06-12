import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {
  protected readonly chartBars = [38, 52, 44, 60, 55, 70, 64, 80, 75, 92, 86, 100];

  protected readonly stats = [
    { label: 'Monthly Recurring Revenue', value: '$128,450', delta: '+12.4% vs last month' },
    { label: 'Active Users', value: '24,318', delta: '+8.2% vs last month' },
    { label: 'Churn Rate', value: '1.2%', delta: '-0.4% vs last month' },
  ];
}
