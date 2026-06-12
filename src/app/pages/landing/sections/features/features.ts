import { Component } from '@angular/core';
import { Icon, IconName } from '../../../../shared/icon/icon';

interface Feature {
  title: string;
  description: string;
  icon: IconName;
}

@Component({
  selector: 'app-features',
  imports: [Icon],
  templateUrl: './features.html',
  styleUrl: './features.css',
})
export class Features {
  protected readonly features: Feature[] = [
    {
      title: 'Real-time dashboards',
      description:
        'Monitor every metric that matters, updated live, no manual refreshes or stale spreadsheets.',
      icon: 'chart',
    },
    {
      title: 'AI-powered insights',
      description:
        "Pulsegrid's AI surfaces anomalies and emerging trends before they become problems.",
      icon: 'sparkles',
    },
    {
      title: 'Unified data sources',
      description: 'Connect your product, billing, and support tools in minutes, not months.',
      icon: 'link',
    },
    {
      title: 'Custom alerts',
      description: 'Get notified the moment a metric crosses a threshold you define.',
      icon: 'bell',
    },
    {
      title: 'Team collaboration',
      description:
        'Share dashboards, annotate trends, and keep your whole team aligned around the same numbers.',
      icon: 'users',
    },
    {
      title: 'Enterprise-grade security',
      description: 'SOC 2-ready infrastructure with role-based access control and full audit logs.',
      icon: 'shield',
    },
  ];
}
