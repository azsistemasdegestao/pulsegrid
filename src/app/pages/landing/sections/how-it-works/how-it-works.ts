import { Component } from '@angular/core';

interface Step {
  title: string;
  description: string;
}

@Component({
  selector: 'app-how-it-works',
  imports: [],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
})
export class HowItWorks {
  protected readonly steps: Step[] = [
    {
      title: 'Connect your data sources',
      description:
        'Link your product analytics, billing, CRM, and support tools with one-click integrations.',
    },
    {
      title: 'Pulsegrid builds your dashboards',
      description:
        'Our AI automatically organizes your metrics into dashboards tailored to your team.',
    },
    {
      title: 'Monitor, get alerted, act',
      description:
        'Track trends in real time, receive smart alerts, and share insights across your team.',
    },
  ];
}
